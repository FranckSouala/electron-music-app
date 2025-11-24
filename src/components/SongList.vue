<script setup>
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlists'
import { useStatsStore } from '@/stores/stats'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

const libraryStore = useLibraryStore()
const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const statsStore = useStatsStore()

const searchQuery = ref('')
const showSearch = ref(false)
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

// Watchers to update covers (debounced to prevent excessive loading)
const coverUpdateTimeouts = [null, null, null, null]

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

function selectCategory(categoryId) {
  selectedCategory.value = selectedCategory.value === categoryId ? null : categoryId
  sortBy.value = null 
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
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

// Watch for changes in the song list (filtering, sorting, etc.)
watch(songs, () => {
  processCoverQueue()
}, { immediate: true })

function openContextMenu(e, song) {
  e.preventDefault()
  selectedSongForMenu.value = song
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
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

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="p-6 overflow-y-auto h-full pb-32">
    <div class="flex items-center justify-between mb-6 gap-4">
      <div class="min-w-0">
        <h2 class="text-2xl font-bold truncate">Local Library</h2>
        <p class="text-gray-400 text-sm mt-1">{{ songs.length }} songs</p>
      </div>
      
      <div class="flex items-center gap-3 flex-shrink-0">
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
            v-model="searchQuery"
            type="text" 
            placeholder="Search..." 
            class="bg-surface border border-white/10 rounded-full px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary w-32 md:w-48"
            autofocus
          />
        </Transition>

        <button 
          @click="toggleSearch"
          class="p-2 text-gray-400 hover:text-white hover:bg-surface rounded-full transition-colors"
          :class="{'text-primary bg-surface': showSearch}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        
        <!-- Sort Menu -->
        <div class="relative sort-container">
          <button 
            @click="toggleSortMenu"
            class="p-2 text-gray-400 hover:text-white hover:bg-surface rounded-full transition-colors"
            :class="{'text-primary bg-surface': showSortMenu}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          
          <div 
            v-if="showSortMenu"
            class="absolute right-0 mt-2 w-48 bg-surface border border-white/10 rounded-lg shadow-xl py-1 z-50"
          >
            <div class="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
              Sort By
            </div>
            <button @click.stop="setSort('title')" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex justify-between items-center group">
              Title 
              <span v-if="sortBy === 'title'" class="text-primary">
                <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
            <button @click.stop="setSort('playCount')" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex justify-between items-center group">
              Most Played 
              <span v-if="sortBy === 'playCount'" class="text-primary">
                <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
            <button @click.stop="setSort('addedAt')" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex justify-between items-center group">
              Recently Added 
              <span v-if="sortBy === 'addedAt'" class="text-primary">
                <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
            <button @click.stop="setSort('duration')" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary flex justify-between items-center group">
              Duration 
              <span v-if="sortBy === 'duration'" class="text-primary">
                <svg v-if="sortOrder === 'asc'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
          </div>
        </div>

        <button 
          @click="shufflePlay"
          class="bg-primary hover:bg-orange-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-transform hover:scale-105 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
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
              class="w-[200px] h-[200px] rounded-2xl overflow-hidden mb-2 transition-all shadow-lg hover:shadow-xl relative"
              :class="selectedCategory === category.id ? 'ring-2 ring-white/20' : ''"
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
                  'from-orange-500 to-red-500': category.id === 'most-played',
                }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path v-if="category.id === null" stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  <path v-else-if="category.id === 'recently-played'" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path v-else-if="category.id === 'recently-added'" stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              
              <!-- Overlay for text readability if image exists -->
              <div v-if="category.cover" class="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors"></div>
            </div>
            <div class="text-sm font-semibold text-white" :class="{ 'text-primary': selectedCategory === category.id }">
              {{ category.label }}
            </div>
            <div class="text-xs text-gray-400">{{ category.count }} songs</div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="songs.length === 0" class="text-center text-gray-500 mt-20">
      <p class="text-xl">No songs found.</p>
      <p v-if="searchQuery">Try a different search term.</p>
      <p v-else>Try reloading or selecting a different folder.</p>
    </div>

    <!-- Song List Table -->
    <div v-else class="w-full">
      <!-- Header -->
      <div class="flex items-center text-gray-400 text-xs uppercase tracking-wider font-bold border-b border-white/10 pb-2 mb-2 px-2">
        <div class="w-10 text-center flex-shrink-0">#</div>
        <div class="w-1/3 min-w-0 pr-4">Title</div>
        <div class="flex-1 min-w-0 pr-4 hidden md:block">Album</div>
        <div class="flex-1 min-w-0 pr-4 hidden lg:block">Artist</div>
        <div class="w-32 text-center flex-shrink-0">Times Played</div>
        <div class="w-20 text-center flex-shrink-0">Duration</div>
      </div>

      <!-- Rows -->
      <div class="flex flex-col">
        <div 
          v-for="(song, index) in songs" 
          :key="song.id"
          class="flex items-center text-sm text-gray-300 hover:bg-white/5 rounded-lg py-1.5 px-2 cursor-pointer group transition-colors"
          @click="playSong(song)"
          @contextmenu="openContextMenu($event, song)"
        >
          <!-- Index / Play Icon -->
          <div class="w-10 text-center text-gray-500 group-hover:text-white relative flex-shrink-0">
            <span class="group-hover:hidden">{{ index + 1 }}</span>
            <span class="hidden group-hover:block text-primary">▶</span>
          </div>

          <!-- Title & Cover -->
          <div class="w-1/3 min-w-0 flex items-center gap-3 pr-4">
            <div class="w-9 h-9 rounded overflow-hidden bg-darker flex-shrink-0">
              <img 
                v-if="covers[song.id]" 
                :src="covers[song.id]" 
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
            <div class="flex flex-col overflow-hidden">
              <span class="font-medium text-white truncate">{{ song.title }}</span>
              <span class="text-xs text-gray-400 truncate md:hidden">{{ song.artist }}</span>
            </div>
          </div>

          <!-- Album -->
          <div class="flex-1 min-w-0 truncate text-gray-400 pr-4 hidden md:block">{{ song.album }}</div>

          <!-- Artist -->
          <div class="flex-1 min-w-0 truncate text-gray-400 pr-4 hidden lg:block">{{ song.artist }}</div>

          <!-- Play Count -->
          <div class="w-32 text-center text-gray-400 font-mono flex-shrink-0">{{ song.stats.playCount.toLocaleString() }}</div>

          <!-- Duration -->
          <div class="w-20 text-center text-gray-400 font-mono text-xs flex-shrink-0">{{ formatDuration(song.duration) }}</div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div 
      v-if="showContextMenu" 
      class="fixed bg-surface border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
      :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
      @click.stop
    >
      <div class="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
        Add to Playlist
      </div>
      <div v-if="playlistStore.playlists.length === 0" class="px-4 py-2 text-sm text-gray-500 italic">
        No playlists
      </div>
      <button 
        v-for="playlist in playlistStore.playlists" 
        :key="playlist.id"
        class="w-full text-left px-4 py-2 text-sm text-white hover:bg-primary/20 hover:text-primary transition-colors"
        @click="addToPlaylist(playlist.id)"
      >
        {{ playlist.name }}
      </button>
    </div>
  </div>
</template>
