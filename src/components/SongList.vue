<script setup>
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlists'
import { useStatsStore } from '@/stores/stats'
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const libraryStore = useLibraryStore()
const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const statsStore = useStatsStore()

const searchQuery = ref('')
const showSearch = ref(false)
const searchInput = ref(null)
const covers = ref({}) // Cache for covers

const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedSongForMenu = ref(null)

const selectedCategory = ref(null) // null = all songs
const recentlyAddedPeriod = ref(7 * 24 * 60 * 60 * 1000) // 1 week in ms

// Sorting
const sortBy = ref(localStorage.getItem('librarySortBy') || null) // 'title', 'playCount', 'addedAt', 'duration'
const sortOrder = ref(localStorage.getItem('librarySortOrder') || 'desc') // 'asc', 'desc'
const showSortMenu = ref(false)

function setSort(field) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
  // Persist
  localStorage.setItem('librarySortBy', sortBy.value)
  localStorage.setItem('librarySortOrder', sortOrder.value)
}

const sortedAllSongs = computed(() => {
  let baseSongs = [...libraryStore.songs]
  
  // Attach stats if needed for sorting (though we access statsStore directly usually)
  // But for sorting logic consistency with 'songs' computed:
  
  if (sortBy.value) {
    baseSongs.sort((a, b) => {
      let valA, valB
      const statsA = statsStore.getSongStats(a.id)
      const statsB = statsStore.getSongStats(b.id)
      
      switch (sortBy.value) {
        case 'title':
          valA = a.title.toLowerCase()
          valB = b.title.toLowerCase()
          break
        case 'playCount':
          valA = statsA.playCount || 0
          valB = statsB.playCount || 0
          break
        case 'addedAt':
          valA = statsA.addedAt || 0
          valB = statsB.addedAt || 0
          break
        case 'duration':
          valA = a.duration || 0
          valB = b.duration || 0
          break
        default:
          return 0
      }

      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }
  
  return baseSongs
})

const songs = computed(() => {
  let baseSongs = libraryStore.songs
  
  // Attach stats to all songs for easier sorting/filtering
  baseSongs = baseSongs.map(s => ({ ...s, stats: statsStore.getSongStats(s.id) }))

  // Apply category filter
  if (selectedCategory.value) {
    const now = Date.now()
    
    if (selectedCategory.value === 'recently-played') {
      baseSongs = baseSongs
        .filter(s => s.stats.lastPlayed)
        .sort((a, b) => b.stats.lastPlayed - a.stats.lastPlayed)
        .slice(0, 20)
    } else if (selectedCategory.value === 'recently-added') {
      baseSongs = baseSongs
        .filter(s => (now - s.stats.addedAt) < recentlyAddedPeriod.value)
        .sort((a, b) => b.stats.addedAt - a.stats.addedAt)
    } else if (selectedCategory.value === 'most-played') {
      baseSongs = baseSongs
        .filter(s => s.stats.playCount > 0)
        .sort((a, b) => b.stats.playCount - a.stats.playCount)
        .slice(0, 20)
    } else if (selectedCategory.value === 'favorites') {
      baseSongs = baseSongs
        .filter(s => s.stats.liked)
    }
  }
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    baseSongs = baseSongs.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.artist.toLowerCase().includes(query) ||
      s.album.toLowerCase().includes(query)
    )
  }

  // Apply User Sort (overrides category sort if active)
  if (sortBy.value) {
    baseSongs.sort((a, b) => {
      let valA, valB
      
      switch (sortBy.value) {
        case 'title':
          valA = a.title.toLowerCase()
          valB = b.title.toLowerCase()
          break
        case 'playCount':
          valA = a.stats.playCount
          valB = b.stats.playCount
          break
        case 'addedAt':
          valA = a.stats.addedAt
          valB = b.stats.addedAt
          break
        case 'duration':
          valA = a.duration || 0
          valB = b.duration || 0
          break
        default:
          return 0
      }

      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return baseSongs
})

// ===== VIRTUAL SCROLLING =====
const ROW_HEIGHT = 42 // Fixed height per row in pixels
const BUFFER_SIZE = 10 // Extra rows to render above/below viewport
const scrollContainer = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(600) // Default, will be updated

// Calculate visible range based on scroll position
const visibleRange = computed(() => {
  const startIndex = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER_SIZE)
  const visibleCount = Math.ceil(containerHeight.value / ROW_HEIGHT) + (BUFFER_SIZE * 2)
  const endIndex = Math.min(songs.value.length, startIndex + visibleCount)
  
  return { startIndex, endIndex }
})

// Only render songs in the visible range
const visibleSongs = computed(() => {
  const { startIndex, endIndex } = visibleRange.value
  return songs.value.slice(startIndex, endIndex).map((song, index) => ({
    ...song,
    absoluteIndex: startIndex + index
  }))
})

// Total height of all songs for virtual scrolling
const totalHeight = computed(() => songs.value.length * ROW_HEIGHT)

// Offset for the visible songs container
const offsetY = computed(() => visibleRange.value.startIndex * ROW_HEIGHT)

// Throttled scroll handler
let scrollTimeout = null
function handleScroll(event) {
  if (scrollTimeout) return
  
  scrollTimeout = setTimeout(() => {
    scrollTop.value = event.target.scrollTop
    scrollTimeout = null
  }, 16) // ~60fps
}

// Update container height on mount and resize
function updateContainerHeight() {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
}
// ===== END VIRTUAL SCROLLING =====

const categories = ref([
  { id: null, label: 'All songs', count: computed(() => libraryStore.songs.length), cover: null },
  { id: 'recently-played', label: 'Recently played', count: computed(() => {
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => stats.lastPlayed).length
  }), cover: null },
  { id: 'recently-added', label: 'Recently added', count: computed(() => {
    const now = Date.now()
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => (now - stats.addedAt) < recentlyAddedPeriod.value).length
  }), cover: null },
  { id: 'most-played', label: 'Most played', count: computed(() => {
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => stats.playCount > 0).length
  }), cover: null },
  { id: 'favorites', label: 'Favorites', count: computed(() => {
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => stats.liked).length
  }), cover: null },
])

async function loadCategoryCover(songs, categoryIndex) {
  if (!songs.length || !window.electronAPI) {
    categories.value[categoryIndex].cover = null
    return
  }
  try {
    const pic = await window.electronAPI.getCoverArt(songs[0].path)
    if (pic) {
      const bufferData = pic.data.data || pic.data
      const base64String = btoa(
        new Uint8Array(bufferData).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )
      categories.value[categoryIndex].cover = `data:${pic.format};base64,${base64String}`
    } else {
      categories.value[categoryIndex].cover = null
    }
  } catch (e) {
    console.error("Failed to load category cover", e)
    categories.value[categoryIndex].cover = null
  }
}

// Computed lists for cover fetching
const recentlyPlayedList = computed(() => {
  return [...libraryStore.songs]
    .filter(s => statsStore.getSongStats(s.id).lastPlayed)
    .sort((a, b) => (statsStore.getSongStats(b.id).lastPlayed || 0) - (statsStore.getSongStats(a.id).lastPlayed || 0))
})

const recentlyAddedList = computed(() => {
  return [...libraryStore.songs]
    .sort((a, b) => (statsStore.getSongStats(b.id).addedAt || 0) - (statsStore.getSongStats(a.id).addedAt || 0))
})

const mostPlayedList = computed(() => {
  return [...libraryStore.songs]
    .filter(s => statsStore.getSongStats(s.id).playCount > 0)
    .sort((a, b) => (statsStore.getSongStats(b.id).playCount || 0) - (statsStore.getSongStats(a.id).playCount || 0))
})

const favoritesList = computed(() => {
  return [...libraryStore.songs]
    .filter(s => statsStore.getSongStats(s.id).liked)
    .sort((a, b) => (statsStore.getSongStats(b.id).addedAt || 0) - (statsStore.getSongStats(a.id).addedAt || 0))
})

// Watchers to update covers (debounced to prevent excessive loading)
const coverUpdateTimeouts = [null, null, null, null, null]

function scheduleCoverUpdate(songs, categoryIndex) {
  clearTimeout(coverUpdateTimeouts[categoryIndex])
  coverUpdateTimeouts[categoryIndex] = setTimeout(() => {
    loadCategoryCover(songs, categoryIndex)
  }, 300)
}

watch(sortedAllSongs, (songs) => {
  scheduleCoverUpdate(songs, 0) // All songs
}, { immediate: true })

watch(recentlyPlayedList, (songs) => scheduleCoverUpdate(songs, 1), { immediate: true })
watch(recentlyAddedList, (songs) => scheduleCoverUpdate(songs, 2), { immediate: true })
watch(mostPlayedList, (songs) => scheduleCoverUpdate(songs, 3), { immediate: true })
watch(favoritesList, (songs) => scheduleCoverUpdate(songs, 4), { immediate: true })

function selectCategory(categoryId) {
  selectedCategory.value = selectedCategory.value === categoryId ? null : categoryId
  sortBy.value = null 
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  } else {
    searchQuery.value = ''
  }
}

function toggleSortMenu() {
  showSortMenu.value = !showSortMenu.value
}

function shufflePlay() {
  if (songs.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * songs.value.length)
    playerStore.isShuffle = true
    playerStore.playContext(songs.value, randomIndex)
  }
}

async function loadCover(song) {
  if (covers.value[song.id]) return;
  
  if (window.electronAPI) {
    try {
      const pic = await window.electronAPI.getCoverArt(song.path)
      if (pic) {
        const bufferData = pic.data.data || pic.data
        const base64String = btoa(
          new Uint8Array(bufferData).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )
        covers.value[song.id] = `data:${pic.format};base64,${base64String}`
      } else {
        covers.value[song.id] = null 
      }
    } catch (e) {
      console.error("Failed to load cover", e)
    }
  }
}

const isProcessingCovers = ref(false)

async function processCoverQueue() {
  if (isProcessingCovers.value) return
  isProcessingCovers.value = true
  
  try {
    // Loop until all songs in the current view have covers
    while(true) {
      // Get songs that don't have a cover yet
      const songsNeedingCover = songs.value.filter(s => covers.value[s.id] === undefined)
      
      if (songsNeedingCover.length === 0) break
      
      // Take a batch of 5 (reduced from 10 for smoother processing)
      const batch = songsNeedingCover.slice(0, 5)
      
      // Load them in parallel
      await Promise.all(batch.map(s => loadCover(s)))
      
      // Longer pause to avoid freezing UI (increased from 100ms)
      await new Promise(r => setTimeout(r, 150))
    }
  } finally {
    isProcessingCovers.value = false
  }
}

// Watch for changes in the visible songs (not all songs) for cover loading
watch(visibleSongs, (newVisibleSongs) => {
  // Only load covers for songs that are currently visible
  newVisibleSongs.forEach(song => {
    if (covers.value[song.id] === undefined) {
      loadCover(song)
    }
  })
}, { immediate: true })

function openContextMenu(e, song) {
  e.preventDefault()
  selectedSongForMenu.value = song
  
  // Calculate position to prevent clipping
  const menuHeight = 200 // Approximate height
  const windowHeight = window.innerHeight
  
  if (e.clientY + menuHeight > windowHeight) {
    // Position above the cursor
    contextMenuY.value = e.clientY - menuHeight
  } else {
    contextMenuY.value = e.clientY
  }
  
  contextMenuX.value = e.clientX
  showContextMenu.value = true
}

function closeContextMenu() {
  showContextMenu.value = false
}

function closeSortMenu() {
  showSortMenu.value = false
}

function addToPlaylist(playlistId) {
  if (selectedSongForMenu.value) {
    playlistStore.addSongToPlaylist(playlistId, selectedSongForMenu.value)
    closeContextMenu()
  }
}

function playSong(song) {
  playerStore.playContext(songs.value, songs.value.findIndex(s => s.id === song.id))
}

function formatDuration(seconds) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString()
}

// Close menus on click outside
function handleClickOutside(e) {
  closeContextMenu()
  // Close sort menu if clicking outside the sort button and menu
  if (!e.target.closest('.sort-container')) {
    closeSortMenu()
  }
}

function scrollToCurrent() {
  if (!playerStore.currentSong || !scrollContainer.value) return
  
  const currentIndex = songs.value.findIndex(s => s.id === playerStore.currentSong.id)
  if (currentIndex === -1) return
  
  // Calculate the scroll position to center the current song
  const targetScrollTop = (currentIndex * ROW_HEIGHT) - (containerHeight.value / 2) + (ROW_HEIGHT / 2)
  scrollContainer.value.scrollTop = Math.max(0, targetScrollTop)
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updateContainerHeight)
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-gray-50">
    <!-- Fixed Header Section -->
    <div class="flex-shrink-0 p-6 pb-0">
      <div class="flex items-center justify-between mb-6 gap-4">
        <div class="min-w-0 flex items-center gap-3">
          <div>
            <h2 class="text-2xl font-bold text-gray-800 truncate">Local Library</h2>
            <p class="text-gray-600 text-sm mt-1">{{ songs.length }} songs</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3 flex-shrink-0">
          <button 
            @click="scrollToCurrent"
            class="p-2 text-gray-600 hover:text-blue-500 hover:bg-white rounded-full transition-colors"
            title="Go to current song"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM4.5 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H5.25A.75.75 0 014.5 12zm12 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5h-2.25a.75.75 0 01-.75-.75zM12 19.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM12 6a6 6 0 100 12 6 6 0 000-12zm-7.5 6a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zm7.5-3a3 3 0 100 6 3 3 0 000-6zm-1.5 3a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clip-rule="evenodd" />
            </svg>
          </button>
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform opacity-0 translate-x-4"
            enter-to-class="transform opacity-100 translate-x-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform opacity-100 translate-x-0"
            leave-to-class="transform opacity-0 translate-x-4"
          >
            <input 
              v-if="showSearch"
              ref="searchInput"
              v-model="searchQuery"
              type="text" 
              placeholder="Search..." 
              class="bg-white border border-gray-300 rounded-full px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-primary w-32 md:w-48"
            />
          </Transition>

          <button 
            @click="toggleSearch"
            class="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-full transition-colors"
            :class="{'text-blue-500 bg-white': showSearch}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <!-- Sort Menu -->
          <div class="relative sort-container">
            <button 
              @click="toggleSortMenu"
              class="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-full transition-colors"
              :class="{'text-blue-500 bg-white': showSortMenu}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M2.25 4.5A.75.75 0 013 3.75h14.25a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 4.5A.75.75 0 013 8.25h9.75a.75.75 0 010 1.5H3A.75.75 0 012.25 9zm15-.75A.75.75 0 0118 9v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V9a.75.75 0 01.75-.75zm-15 5.25a.75.75 0 01.75-.75h9.75a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
              </svg>
            </button>
            
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="transform opacity-0 scale-95 -translate-y-2"
              enter-to-class="transform opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="transform opacity-100 scale-100 translate-y-0"
              leave-to-class="transform opacity-0 scale-95 -translate-y-2"
            >
              <div 
                v-if="showSortMenu"
                class="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-50 origin-top-right"
              >
                <div class="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 mb-1">
                  Sort By
                </div>
                <button @click.stop="setSort('title')" class="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-primary/20 hover:text-blue-500 flex justify-between items-center group">
                  Title 
                  <span v-if="sortBy === 'title'" class="text-blue-500">
                    <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                <button @click.stop="setSort('playCount')" class="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-primary/20 hover:text-blue-500 flex justify-between items-center group">
                  Most Played 
                  <span v-if="sortBy === 'playCount'" class="text-blue-500">
                    <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                <button @click.stop="setSort('addedAt')" class="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-primary/20 hover:text-blue-500 flex justify-between items-center group">
                  Recently Added 
                  <span v-if="sortBy === 'addedAt'" class="text-blue-500">
                    <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                <button @click.stop="setSort('duration')" class="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-primary/20 hover:text-blue-500 flex justify-between items-center group">
                  Duration 
                  <span v-if="sortBy === 'duration'" class="text-blue-500">
                    <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
              </div>
            </Transition>
          </div>

          <button 
            @click="shufflePlay"
            class="bg-primary hover:bg-blue-600 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 whitespace-nowrap shadow-neumorphic hover:shadow-neumorphic-pressed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" clip-rule="evenodd" />
            </svg>
            Shuffle
          </button>
        </div>
      </div>
      
      <!-- Categories Slider -->
      <div class="mb-6">      
        <div class="overflow-x-auto hide-scrollbar">
          <div class="flex gap-4 pb-2">
            <div 
              v-for="category in categories" 
              :key="category.id || 'all'"
              @click="selectCategory(category.id)"
              class="flex-shrink-0 cursor-pointer group"
            >
              <div 
                class="w-[200px] h-[200px] rounded-2xl overflow-hidden mb-2 transition-all shadow-lg hover:shadow-xl relative ring-1 ring-white/40"
                :class="selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''"
              >
                <img 
                  v-if="category.cover" 
                  :src="category.cover" 
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div 
                  v-else
                  class="w-full h-full bg-gradient-to-br flex items-center justify-center"
                  :class="{
                    'from-blue-500 to-cyan-500': category.id === null,
                    'from-purple-500 to-pink-500': category.id === 'recently-played',
                    'from-green-500 to-teal-500': category.id === 'recently-added',
                    'from-blue-500 to-red-500': category.id === 'most-played',
                    'from-pink-500 to-rose-500': category.id === 'favorites',
                  }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                    <path v-if="category.id === null" d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955-1.477a.75.75 0 011.045.671v13.37a.75.75 0 001.5 0V3.83a2.25 2.25 0 00-3.256-2.013l-3.25 1.625A2.25 2.25 0 009.25 5.463v7.787zM6.375 5.463v13.37a2.25 2.25 0 003.256 2.013l3.25-1.625a2.25 2.25 0 001.244-2.013v-7.787a.75.75 0 00-1.5 0v7.787a.75.75 0 01-1.045.671l-2.955-1.477V4.636a.75.75 0 00-1.5 0v.827z" />
                    <path v-else-if="category.id === 'recently-played'" fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clip-rule="evenodd" />
                    <path v-else-if="category.id === 'recently-added'" fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clip-rule="evenodd" />
                    <path v-else-if="category.id === 'most-played'" fill-rule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0zm1.5 0a6.75 6.75 0 006.75 6.75v-6.75H3.75z" clip-rule="evenodd" />
                    <path v-else d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
              </div>
              <div class="text-sm font-semibold text-gray-800" :class="{ 'text-blue-500': selectedCategory === category.id }">
                {{ category.label }}
              </div>
              <div class="text-xs text-gray-600">{{ category.count }} songs</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 min-h-0 flex flex-col">
      <div v-if="songs.length === 0" class="text-center text-gray-500 mt-20">
        <p class="text-xl">No songs found.</p>
        <p v-if="searchQuery">Try a different search term.</p>
        <p v-else>Try reloading or selecting a different folder.</p>
      </div>

      <!-- Song List Table -->
      <div v-else class="flex-1 flex flex-col min-h-0">
        <!-- Header -->
        <div class="flex-shrink-0 flex items-center text-gray-600 text-xs uppercase tracking-wider font-bold border-b border-gray-300 pb-2 mb-2 pl-8 pr-10">
          <div class="w-10 text-center flex-shrink-0">#</div>
          <div class="w-1/3 min-w-0 pr-4">Title</div>
          <div class="flex-1 min-w-0 pr-4 hidden md:block">Album</div>
          <div class="flex-1 min-w-0 pr-4 hidden lg:block">Artist</div>
          <div class="w-16 flex justify-center flex-shrink-0">Like</div>
          <div class="w-32 text-center flex-shrink-0">Times Played</div>
          <div class="w-20 text-center flex-shrink-0">Duration</div>
        </div>

        <!-- Virtual Scroll Container with GPU Acceleration -->
        <div 
          ref="scrollContainer"
          @scroll="handleScroll"
          class="flex-1 overflow-y-scroll will-change-transform px-6 pb-8"
          style="transform: translateZ(0);"
        >
          <!-- Virtual spacer for total height -->
          <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
            <!-- Visible rows container -->
            <div :style="{ transform: `translateY(${offsetY}px)` }">
              <div 
                v-for="song in visibleSongs" 
                :key="song.id"
                :id="`main-song-${song.id}`"
                class="flex items-center text-sm text-gray-700 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors"
                :style="{ height: `${ROW_HEIGHT}px`, padding: '0.375rem 0.5rem' }"
                @click="playSong(song)"
                @contextmenu="openContextMenu($event, song)"
              >
                <!-- Index / Play Icon -->
                <div class="w-10 text-center text-gray-500 group-hover:text-gray-800 relative flex-shrink-0">
                  <span class="group-hover:hidden">{{ song.absoluteIndex + 1 }}</span>
                  <span class="hidden group-hover:block text-blue-500">▶</span>
                </div>

                <!-- Title & Cover -->
                <div class="w-1/3 min-w-0 flex items-center gap-3 pr-4">
                  <div class="w-9 h-9 rounded overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    <img 
                      v-if="covers[song.id]" 
                      :src="covers[song.id]" 
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 00-3-3h-3.879a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H6a3 3 0 00-3 3v3.162A3.756 3.756 0 014.094 9h15.812zM4.094 10.5a2.25 2.25 0 00-2.227 2.568l.857 6A2.25 2.25 0 004.951 21H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-2.227-2.568H4.094z" />
                      </svg>
                    </div>

                    <!-- Wave Animation Overlay -->
                    <div v-if="playerStore.currentSong?.id == song.id" class="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 z-10">
                      <div class="wave-bar h-2" :class="{'paused': !playerStore.isPlaying}"></div>
                      <div class="wave-bar h-3" :class="{'paused': !playerStore.isPlaying}"></div>
                      <div class="wave-bar h-1.5" :class="{'paused': !playerStore.isPlaying}"></div>
                    </div>
                  </div>
                  <div class="flex flex-col overflow-hidden">
                    <span class="font-medium text-gray-800 truncate">{{ song.title }}</span>
                    <span class="text-xs text-gray-600 truncate md:hidden">{{ song.artist }}</span>
                  </div>
                </div>

                <!-- Album -->
                <div class="flex-1 min-w-0 truncate text-gray-600 pr-4 hidden md:block">{{ song.album }}</div>

                <!-- Artist -->
                <div class="flex-1 min-w-0 truncate text-gray-600 pr-4 hidden lg:block">{{ song.artist }}</div>

                <!-- Like Button -->
                <div class="w-16 text-center flex-shrink-0 flex justify-center">
                  <button 
                    @click.stop="statsStore.toggleLike(song.id)"
                    class="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                    :class="song.stats.liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'"
                  >
                    <svg v-if="song.stats.liked" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 animate-heart-pop text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                </div>

                <!-- Play Count -->
                <div class="w-32 text-center text-gray-600 font-mono flex-shrink-0">{{ song.stats.playCount.toLocaleString() }}</div>

                <!-- Duration -->
                <div class="w-20 text-center text-gray-600 font-mono text-xs flex-shrink-0">{{ formatDuration(song.duration) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div 
        v-if="showContextMenu" 
        class="fixed bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-50 min-w-[160px] max-h-64 overflow-y-auto origin-top-left"
        :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
        @click.stop
      >
        <div class="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 mb-1">
          Add to Playlist
        </div>
        <div v-if="playlistStore.playlists.length === 0" class="px-4 py-2 text-sm text-gray-500 italic">
          No playlists
        </div>
        <button 
          v-for="playlist in playlistStore.playlists" 
          :key="playlist.id"
          class="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-primary/20 hover:text-blue-500 transition-colors"
          @click="addToPlaylist(playlist.id)"
        >
          {{ playlist.name }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Wave Animation */
.wave-bar {
  width: 3px;
  background-color: #3b82f6; /* blue-500 */
  border-radius: 9999px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(1) { animation-delay: 0.0s; height: 60%; }
.wave-bar:nth-child(2) { animation-delay: 0.1s; height: 100%; }
.wave-bar:nth-child(3) { animation-delay: 0.2s; height: 80%; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

/* Custom Scrollbar */
:deep(.overflow-y-auto)::-webkit-scrollbar {
  width: 12px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: #f1f1f1;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
  background: #3b82f6; /* primary color */
  border-radius: 6px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: #2563eb; /* blue-600 */
}

@keyframes heart-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.6); }
  100% { transform: scale(1); }
}

.animate-heart-pop {
  animation: heart-pop 0.3s ease-in-out;
}
</style>
