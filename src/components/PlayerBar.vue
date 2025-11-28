<script setup>
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { useStatsStore } from '@/stores/stats'
import { usePlaylistStore } from '@/stores/playlists'
import { computed, ref, watch } from 'vue'

const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()
const statsStore = useStatsStore()
const playlistStore = usePlaylistStore()

const currentSong = computed(() => playerStore.currentSong)
const currentCover = ref(null)
const isExpanded = ref(false)
const showSearch = ref(false)
const searchQuery = ref('')
const showPlaylistMenu = ref(false)
const selectedPlaylistId = ref(localStorage.getItem('selectedPlaylistId') || 'most-played')

// Progressive loading
const visibleSongCount = ref(10) // Start with 10 songs
const loadInterval = ref(null)

// Smart Playlists Data
const allSongsCover = ref(null)
const recentlyPlayedCover = ref(null)
const recentlyAddedCover = ref(null)
const mostPlayedCover = ref(null)
const favoritesCover = ref(null)

// Queue covers
const queueCovers = ref({})

// Load queue covers progressively
async function loadQueueCovers() {
  const queue = playerStore.queue || []
  
  // Load covers in batches of 10 to avoid blocking UI
  const batchSize = 10
  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize)
    
    for (const song of batch) {
      if (!queueCovers.value[song.id]) {
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
            queueCovers.value[song.id] = `data:${pic.format};base64,${base64String}`
          }
        } catch (e) {
          // Silently fail for queue covers
        }
      }
    }
    
    // Small delay between batches to keep UI responsive
    if (i + batchSize < queue.length) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

// Watch queue for changes
watch(() => playerStore.queue, () => {
  if (isExpanded.value) {
    loadQueueCovers()
  }
}, { deep: true })

// Load covers when expanded
watch(isExpanded, (expanded) => {
  if (expanded) {
    loadQueueCovers()
  }
})

const allSongs = computed(() => libraryStore.songs)

const recentlyPlayedSongs = computed(() => {
  if (!libraryStore.songs.length) return []
  return [...libraryStore.songs]
    .filter(song => statsStore.getSongStats(song.id).lastPlayed)
    .sort((a, b) => (statsStore.getSongStats(b.id).lastPlayed || 0) - (statsStore.getSongStats(a.id).lastPlayed || 0))
    .slice(0, 50)
})

const recentlyAddedSongs = computed(() => {
  if (!libraryStore.songs.length) return []
  return [...libraryStore.songs]
    .sort((a, b) => (statsStore.getSongStats(b.id).addedAt || 0) - (statsStore.getSongStats(a.id).addedAt || 0))
    .slice(0, 50)
})

const mostPlayedSongs = computed(() => {
  if (!libraryStore.songs.length) return []
  return [...libraryStore.songs]
    .filter(song => statsStore.getSongStats(song.id).playCount > 0)
    .sort((a, b) => (statsStore.getSongStats(b.id).playCount || 0) - (statsStore.getSongStats(a.id).playCount || 0))
    .slice(0, 50)
})

const favoritesList = computed(() => {
  if (!libraryStore.songs.length) return []
  return [...libraryStore.songs]
    .filter(song => statsStore.getSongStats(song.id).liked)
    .sort((a, b) => (statsStore.getSongStats(b.id).addedAt || 0) - (statsStore.getSongStats(a.id).addedAt || 0))
})

// Selected Playlist Data (dynamic based on user choice)
const selectedPlaylist = computed(() => {
  if (selectedPlaylistId.value === 'most-played') {
    return {
      id: 'most-played',
      name: 'Most Played',
      songs: mostPlayedSongs.value
    }
  }
  return playlistStore.playlists.find(p => p.id === selectedPlaylistId.value) || {
    id: 'most-played',
    name: 'Most Played',
    songs: mostPlayedSongs.value
  }
})

const selectedPlaylistCover = ref(null)

// Functions for menu
function selectPlaylist(playlistId) {
  selectedPlaylistId.value = playlistId
  localStorage.setItem('selectedPlaylistId', playlistId)
  showPlaylistMenu.value = false
  
  // Auto-play the selected playlist
  const playlist = selectedPlaylist.value
  if (playlist && playlist.songs.length > 0) {
    playSmartPlaylist(playlist.songs)
  }
}

const playlistTile = ref(null)
const popupStyle = ref({})
const loopAnimationKey = ref(0)

function togglePlaylistMenu() {
  if (!showPlaylistMenu.value && playlistTile.value) {
    const rect = playlistTile.value.getBoundingClientRect()
    popupStyle.value = {
      top: `${rect.top}px`,
      right: `${window.innerWidth - rect.left + 10}px` // 10px gap to the left of the tile
    }
  }
  showPlaylistMenu.value = !showPlaylistMenu.value
}

// Search Results
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase()
  return libraryStore.songs.filter(song => 
    song.title.toLowerCase().includes(query) || 
    song.artist.toLowerCase().includes(query)
  ).slice(0, 50)
})

// Load covers for search results
watch(searchResults, async (results) => {
  if (results.length > 0 && showSearch.value) {
    // Load search result covers in batches
    const batchSize = 10
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize)
      
      for (const song of batch) {
        if (!queueCovers.value[song.id]) {
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
              queueCovers.value[song.id] = `data:${pic.format};base64,${base64String}`
            }
          } catch (e) {
            // Silently fail
          }
        }
      }
      
      if (i + batchSize < results.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
  }
})

// Display queue (limited for progressive loading)
const displayQueue = computed(() => {
  const queue = playerStore.queue || []
  return queue.slice(0, Math.min(visibleSongCount.value, 100))
})

// Progressive loading function
function startProgressiveLoad() {
  visibleSongCount.value = 5 // Reset to 5
  
  if (loadInterval.value) {
    clearInterval(loadInterval.value)
  }
  
  loadInterval.value = setInterval(() => {
    if (visibleSongCount.value < 100) {
      visibleSongCount.value += 1 // Add 1 song at a time for visible effect
    } else {
      clearInterval(loadInterval.value)
      loadInterval.value = null
    }
  }, 150) // Add songs every 150ms (15s total for 100 songs)
}

// Stop loading when closing
function stopProgressiveLoad() {
  if (loadInterval.value) {
    clearInterval(loadInterval.value)
    loadInterval.value = null
  }
  visibleSongCount.value = 5
}

function formatTime(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleSeek(e) {
  playerStore.seek(e.target.value)
}

function getProgressStyle(current, max) {
  const percent = max > 0 ? (current / max) * 100 : 0
  return {
    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #374151 ${percent}%, #374151 100%)`
  }
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  
  if (isExpanded.value) {
    startProgressiveLoad()
  } else {
    stopProgressiveLoad()
  }
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    setTimeout(() => {
      document.querySelector('input[type="text"]')?.focus()
    }, 100)
  } else {
    searchQuery.value = ''
  }
}

function scrollToCurrent() {
  if (!currentSong.value) return
  
  const element = document.getElementById(`song-${currentSong.value.id}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function playSmartPlaylist(songs) {
  if (songs.length) {
    playerStore.play(songs[0])
    playerStore.queue = [...songs]
  }
}

async function loadPlaylistCover(songs, targetRef) {
  if (!songs.length || !window.electronAPI) {
    targetRef.value = null
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
      targetRef.value = `data:${pic.format};base64,${base64String}`
    } else {
      targetRef.value = null
    }
  } catch (e) {
    console.error("Failed to load playlist cover", e)
    targetRef.value = null
  }
}

// Watchers for covers (debounced to prevent excessive loading)
const playlistCoverTimeouts = new Map()

function schedulePlaylistCoverUpdate(songs, targetRef) {
  const timeoutId = playlistCoverTimeouts.get(targetRef)
  if (timeoutId) clearTimeout(timeoutId)
  
  const newTimeoutId = setTimeout(() => {
    loadPlaylistCover(songs, targetRef)
  }, 300)
  
  playlistCoverTimeouts.set(targetRef, newTimeoutId)
}

watch(allSongs, (songs) => schedulePlaylistCoverUpdate(songs, allSongsCover), { immediate: true })
watch(recentlyPlayedSongs, (songs) => schedulePlaylistCoverUpdate(songs, recentlyPlayedCover), { immediate: true })
watch(recentlyAddedSongs, (songs) => schedulePlaylistCoverUpdate(songs, recentlyAddedCover), { immediate: true })
watch(mostPlayedSongs, (songs) => schedulePlaylistCoverUpdate(songs, mostPlayedCover), { immediate: true })
watch(favoritesList, (songs) => schedulePlaylistCoverUpdate(songs, favoritesCover), { immediate: true })
watch(() => selectedPlaylist.value.songs, (songs) => schedulePlaylistCoverUpdate(songs, selectedPlaylistCover), { immediate: true })

// Load cover when song changes
watch(currentSong, async (song) => {
  if (!song) {
    currentCover.value = null
    return
  }
  
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
        currentCover.value = `data:${pic.format};base64,${base64String}`
      } else {
        currentCover.value = null
      }
    } catch (e) {
      console.error("Failed to load cover", e)
      currentCover.value = null
    }
  }
}, { immediate: true })
</script>

<template>
  <div 
    class="fixed bottom-0 left-0 right-0 px-6 flex items-center justify-between z-50 overflow-hidden"
    style="will-change: height; transform: translateZ(0);"
    :style="{ 
      height: isExpanded ? '100vh' : '6rem',
      transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      background: isExpanded ? '#1a1a1a' : '#e8ecf0',
      boxShadow: isExpanded ? 'none' : '0 -8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
    }"
    :class="[
      isExpanded ? 'flex-col justify-end pb-0' : 'min-w-[800px] rounded-t-3xl'
    ]"
  >
    <!-- Expanded Background -->
    <div v-if="isExpanded" class="absolute inset-0 z-0 overflow-hidden">
      <img v-if="currentCover" :src="currentCover" class="w-full h-full object-cover blur-lg opacity-50 scale-110" style="will-change: transform" />
      <div class="absolute inset-0 bg-black/60"></div>
    </div>

    <!-- Close Button (Top Right) -->
    <button 
      v-if="isExpanded"
      @click="toggleExpanded" 
      class="absolute top-8 right-8 z-50 text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Expanded Content -->
    <div v-if="isExpanded" class="absolute inset-0 z-10 flex p-12 pb-32 gap-12">
      <!-- Left: Cover & Info -->
      <div class="w-1/2 flex flex-col justify-center items-start gap-6">
        <div class="w-full aspect-square max-w-[600px] rounded-2xl overflow-hidden shadow-2xl mx-auto">
          <img v-if="currentCover" :src="currentCover" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-32 w-32 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 00-3-3h-3.879a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H6a3 3 0 00-3 3v3.162A3.756 3.756 0 014.094 9h15.812zM4.094 10.5a2.25 2.25 0 00-2.227 2.568l.857 6A2.25 2.25 0 004.951 21H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-2.227-2.568H4.094z" />
            </svg>
          </div>
        </div>
        <div class="w-full max-w-[600px] mx-auto">
          <h1 class="text-4xl font-bold text-white mb-2">{{ currentSong?.title }}</h1>
          <p class="text-xl text-gray-300">{{ currentSong?.artist }}</p>
        </div>
      </div>

      <!-- Right: Queue & Playlists -->
      <div 
        class="w-1/2 h-full overflow-y-auto hide-scrollbar pt-20 transition-transform duration-[900ms] ease-out"
        :style="{ transform: showSearch ? 'translateY(-40px)' : 'translateY(0)' }"
      >
        <!-- Smart Playlists Tiles -->
        <div 
          v-show="!showSearch" 
          class="transition-all duration-[900ms] ease-out mb-8"
          :class="[!showSearch ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 mb-0', showPlaylistMenu ? 'overflow-visible' : 'overflow-hidden']"
          style="will-change: max-height, opacity, margin"
        >
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Access</h3>
          <div class="grid grid-cols-2 gap-4">
            <!-- Selected Playlist (with menu) -->
            <div class="relative" ref="playlistTile">
              <div 
                @click="playSmartPlaylist(selectedPlaylist.songs)"
                class="relative aspect-square rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform"
              >
                <img v-if="selectedPlaylistCover" :src="selectedPlaylistCover" class="absolute inset-0 w-full h-full object-cover" />
                <div v-else class="absolute inset-0 bg-gradient-to-br from-blue-600 to-red-600"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 from-0% via-black/60 via-50% to-transparent to-100% flex flex-col justify-end p-4">
                  <h4 class="text-white font-bold text-lg">{{ selectedPlaylist.name }}</h4>
                  <p class="text-xs text-gray-300">{{ selectedPlaylist.songs.length }} songs</p>
                </div>
              </div>
              
              <!-- Menu Icon -->
              <button 
                @click.stop="togglePlaylistMenu"
                class="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-10"
                title="Choose playlist"
              >
                <Transition
                  mode="out-in"
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 rotate-90 scale-50"
                  enter-to-class="opacity-100 rotate-0 scale-100"
                  leave-active-class="transition duration-200 ease-in"
                  leave-from-class="opacity-100 rotate-0 scale-100"
                  leave-to-class="opacity-0 -rotate-90 scale-50"
                >
                  <svg v-if="!showPlaylistMenu" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
                  </svg>
                </Transition>
              </button>
              
              <!-- Dropdown Menu (Teleported) -->
              <Teleport to="body">
                <!-- Backdrop -->
                <div 
                  v-if="showPlaylistMenu" 
                  class="fixed inset-0 z-[9998]" 
                  @click="showPlaylistMenu = false"
                ></div>

                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 translate-x-2 scale-95"
                  enter-to-class="opacity-100 translate-x-0 scale-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="opacity-100 translate-x-0 scale-100"
                  leave-to-class="opacity-0 translate-x-2 scale-95"
                >
                  <div 
                    v-if="showPlaylistMenu"
                    class="fixed bg-gray-800 rounded-lg shadow-xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto z-[9999]"
                    :style="popupStyle"
                    @click.stop
                  >
                    <button 
                      @click="selectPlaylist('most-played')"
                      class="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                      :class="selectedPlaylistId === 'most-played' ? 'bg-blue-600 text-white' : 'text-gray-200'"
                    >
                      Most Played
                    </button>
                    <div v-for="playlist in playlistStore.playlists" :key="playlist.id">
                      <button 
                        @click="selectPlaylist(playlist.id)"
                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                        :class="selectedPlaylistId === playlist.id ? 'bg-blue-600 text-white' : 'text-gray-200'"
                      >
                        {{ playlist.name }}
                      </button>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>

            <!-- Favorites -->
            <div 
              @click="playSmartPlaylist(favoritesList)"
              class="relative aspect-square rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform"
            >
              <img v-if="favoritesCover" :src="favoritesCover" class="absolute inset-0 w-full h-full object-cover" />
              <div v-else class="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 from-0% via-black/60 via-50% to-transparent to-100% flex flex-col justify-end p-4">
                <h4 class="text-white font-bold text-lg">Favorites</h4>
                <p class="text-xs text-gray-300">{{ favoritesList.length }} songs</p>
              </div>
            </div>
          </div>
        </div>


        <!-- Header with Search and List Section -->
        <div>
          <!-- Header with Search -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {{ showSearch && searchQuery.trim() ? 'Search Results' : 'Up Next' }}
            </h3>
            <div class="flex items-center gap-2">
              <!-- Scroll to Current Button -->
              <button 
                v-if="!showSearch"
                @click="scrollToCurrent"
                class="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/5"
                title="Go to current song"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM4.5 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H5.25A.75.75 0 014.5 12zm12 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5h-2.25a.75.75 0 01-.75-.75zM12 19.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM12 6a6 6 0 100 12 6 6 0 000-12zm-7.5 6a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zm7.5-3a3 3 0 100 6 3 3 0 000-6zm-1.5 3a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clip-rule="evenodd" />
                </svg>
              </button>

              <Transition
                enter-active-class="transition-all duration-[800ms] ease-out"
                enter-from-class="opacity-0 w-0"
                enter-to-class="opacity-100 w-48"
                leave-active-class="transition-all duration-[800ms] ease-in"
                leave-from-class="opacity-100 w-48"
                leave-to-class="opacity-0 w-0"
              >
                <input 
                  v-if="showSearch"
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Search library..." 
                  class="bg-white/10 border border-white/20 rounded-full px-4 py-1 text-sm text-white focus:outline-none focus:border-primary"
                  autofocus
                />
              </Transition>
              <button @click="toggleSearch" class="text-gray-400 hover:text-white transition-colors">
                <svg v-if="!showSearch" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clip-rule="evenodd" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <!-- List (Queue or Search Results) -->
          <div class="flex flex-col gap-2" style="will-change: transform">
            <div 
              v-for="(song, index) in (showSearch && searchQuery.trim() ? searchResults : displayQueue)" 
              :key="song.id"
              :id="`song-${song.id}`"
              class="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group animate-fade-in"
              :class="{'bg-white/10': currentSong?.id === song.id}"
              :style="{ animationDelay: `${index * 30}ms` }"
              @click="() => {
                playerStore.play(song);
                if (showSearch) {
                  searchQuery = '';
                  showSearch = false;
                }
              }"
            >
              <div class="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800 relative">
                <img v-if="queueCovers[song.id]" :src="queueCovers[song.id]" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-500 text-xs">♫</div>
                
                <!-- Wave Animation Overlay -->
                <div v-if="currentSong?.id == song.id" class="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
                  <div class="wave-bar h-3" :class="{'paused': !playerStore.isPlaying}"></div>
                  <div class="wave-bar h-4" :class="{'paused': !playerStore.isPlaying}"></div>
                  <div class="wave-bar h-2" :class="{'paused': !playerStore.isPlaying}"></div>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-white truncate" :class="{'text-blue-500': currentSong?.id === song.id}">{{ song.title }}</div>
                <div class="text-sm text-gray-400 truncate">{{ song.artist }}</div>
              </div>
              <div class="text-sm text-gray-500 font-mono">{{ formatTime(song.duration) }}</div>
            </div>
            
            <div v-if="showSearch && searchQuery.trim() && searchResults.length === 0" class="text-center text-gray-500 py-8">
              No results found
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- EXPANDED CONTROLS BAR -->
    <div v-if="isExpanded" class="absolute bottom-0 left-0 right-0 h-24 px-12 flex items-center gap-8 z-50 bg-gradient-to-t from-black/80 to-transparent">
      <!-- Play Button (Left) -->
      <button 
        class="text-white hover:text-blue-500 transition-colors hover:scale-110 transform"
        @click="playerStore.togglePlay"
      >
        <svg v-if="playerStore.isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Seek Slider (Middle) -->
      <div class="flex-1 flex items-center gap-3 text-xs text-gray-300 font-mono">
        <span>{{ formatTime(playerStore.currentTime) }}</span>
        <div class="flex-1 h-[0.30rem] bg-white/20 rounded-full relative overflow-hidden group cursor-pointer">
          <!-- Hover Effect Track -->
          <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <!-- Progress Bar -->
          <div 
            class="absolute h-full bg-blue-500 rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            :style="{ width: `${(playerStore.currentTime / (playerStore.duration || 1)) * 100}%` }"
          ></div>
          
          <!-- Input -->
          <input 
            type="range" 
            min="0" 
            :max="playerStore.duration || 100" 
            :value="playerStore.currentTime"
            @input="handleSeek"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
        </div>
        <span>{{ formatTime(playerStore.duration) }}</span>
      </div>

      <!-- Right Group (Prev, Next, Shuffle, Loop, Volume) -->
      <div class="flex items-center gap-6">
        <button class="text-gray-300 hover:text-white transition-colors" @click="playerStore.prev">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
          </svg>
        </button>

        <button class="text-gray-300 hover:text-white transition-colors" @click="playerStore.next">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.342 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.342 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.688v2.34L5.055 7.06z" />
          </svg>
        </button>

        <button 
          class="text-gray-300 hover:text-white transition-colors" 
          :class="{'text-blue-500': playerStore.isShuffle}"
          @click="playerStore.toggleShuffle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
             <path fill-rule="evenodd" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" clip-rule="evenodd" />
          </svg>
        </button>

        <button 
          class="text-gray-300 hover:text-white transition-colors relative"
          :class="{'text-blue-500': playerStore.loopMode > 0}"
          @click="() => { 
            // Only animate if we are NOT going back to normal mode (0)
            // Current modes: 0 (Off) -> 1 (All) -> 2 (One) -> 0 (Off)
            // So if current is 2, next is 0, we don't animate
            if (playerStore.loopMode !== 2) {
              loopAnimationKey++; 
            }
            playerStore.toggleLoop();
          }"
          :title="playerStore.loopMode === 2 ? 'Loop One' : playerStore.loopMode === 1 ? 'Loop All' : 'Loop Off'"
        >
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-[800ms]" :style="{ transform: `rotate(${loopAnimationKey * 360}deg)` }" viewBox="0 0 24 24" fill="currentColor">
             <!-- Normal playback icon (Double arrows) -->
             <path v-if="playerStore.loopMode === 0" d="M4 6h10V4l5 3.5-5 3.5V9H4V6zm0 9h10v-2l5 3.5-5 3.5v-2H4v-3z" />
             <!-- Loop icon (loop all or loop one) -->
             <path v-else fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.634 9.26a.75.75 0 101.06 1.06 7.5 7.5 0 01.06-.062zm14.49 3.882a.75.75 0 00-1.06-1.06 7.5 7.5 0 01-12.548 3.364l-1.903-1.903h3.183a.75.75 0 000-1.5H2.925a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.391-4.624.75.75 0 00-1.06-1.06 7.5 7.5 0 01-.06.062z" clip-rule="evenodd" />
           </svg>
           <span v-if="playerStore.loopMode === 1" class="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-500 text-white rounded-full px-1.5 py-0.5 flex items-center justify-center">ALL</span>
           <span v-else-if="playerStore.loopMode === 2" class="absolute -top-1 -right-1 text-[10px] font-bold bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">1</span>
        </button>

        <!-- Volume (Moved left by adding margin-right) -->
        <div class="flex items-center gap-3 w-32 ml-4 mr-8">
          <button @click="playerStore.toggleMute" class="text-gray-300 hover:text-white transition-colors flex-shrink-0">
            <svg v-if="playerStore.volume === 0 || playerStore.isMuted" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
              <path d="M17 9.28a.75.75 0 011.06 0l1.19 1.19 1.19-1.19a.75.75 0 111.06 1.06l-1.19 1.19 1.19 1.19a.75.75 0 11-1.06 1.06l-1.19-1.19-1.19 1.19a.75.75 0 11-1.06-1.06l1.19-1.19-1.19-1.19a.75.75 0 010-1.06z" />
            </svg>
            <svg v-else-if="playerStore.volume > 0.5" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
              <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
            </svg>
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            :value="playerStore.isMuted ? 0 : playerStore.volume"
            @input="e => playerStore.setVolume(parseFloat(e.target.value))"
            class="flex-1 h-[0.30rem] rounded-lg appearance-none cursor-pointer range-slider"
            :style="getProgressStyle(playerStore.isMuted ? 0 : playerStore.volume, 1)"
          >
        </div>
      </div>
    </div>

    <!-- NORMAL PLAYER BAR CONTENT (Hidden when expanded) -->
    <template v-if="!isExpanded">
      <!-- Collapsed Song Info (Hidden when expanded) -->
      <div 
        v-if="!isExpanded" 
        class="flex items-center gap-4 w-1/3 cursor-pointer hover:opacity-80 transition-opacity"
        @click="toggleExpanded"
      >
        <div class="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-neumorphic">
          <img v-if="currentCover" :src="currentCover" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 00-3-3h-3.879a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H6a3 3 0 00-3 3v3.162A3.756 3.756 0 014.094 9h15.812zM4.094 10.5a2.25 2.25 0 00-2.227 2.568l.857 6A2.25 2.25 0 004.951 21H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-2.227-2.568H4.094z" />
            </svg>
          </div>
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="font-semibold text-gray-800 truncate text-sm">{{ currentSong?.title || 'No song playing' }}</span>
          <span class="text-xs text-gray-500 truncate">{{ currentSong?.artist || 'Select a song' }}</span>
        </div>
      </div>

      <!-- Controls (Neumorphic) -->
      <div class="flex flex-col items-center w-1/3 gap-3">
        <div class="flex items-center gap-3">
          <!-- Shuffle -->
          <button 
            class="w-8 h-8 rounded-lg bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all flex items-center justify-center"
            :class="{'shadow-neumorphic-inset': playerStore.isShuffle}"
            @click="playerStore.toggleShuffle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" :class="playerStore.isShuffle ? 'text-blue-500' : 'text-gray-600'" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <!-- Previous -->
          <button 
            class="w-8 h-8 rounded-lg bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all flex items-center justify-center"
            @click="playerStore.prev"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
            </svg>
          </button>
          
          <!-- Play/Pause -->
          <button 
            class="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-neumorphic hover:shadow-neumorphic-pressed active:shadow-neumorphic-inset transition-all flex items-center justify-center"
            @click="playerStore.togglePlay"
          >
            <svg v-if="playerStore.isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-0.5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <!-- Next -->
          <button 
            class="w-8 h-8 rounded-lg bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all flex items-center justify-center"
            @click="playerStore.next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.342 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.342 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.688v2.34L5.055 7.06z" />
            </svg>
          </button>
          
          <!-- Loop -->
          <button 
            class="w-8 h-8 rounded-lg bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all flex items-center justify-center relative"
            :class="{'shadow-neumorphic-inset': playerStore.loopMode > 0}"
            @click="playerStore.toggleLoop"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" :class="playerStore.loopMode > 0 ? 'text-blue-500' : 'text-gray-600'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span v-if="playerStore.loopMode === 2" class="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>
          </button>
        </div>

        <!-- Seeker -->
        <div class="flex items-center gap-2 w-full max-w-[400px]">
          <span class="text-xs text-gray-500 font-mono w-9 text-right">{{ formatTime(playerStore.currentTime) }}</span>
          <div class="flex-1 h-[0.30rem] bg-gray-200 rounded-full shadow-inner-soft relative overflow-hidden">
            <div 
              class="absolute h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-100"
              :style="{ width: `${(playerStore.currentTime / (playerStore.duration || 1)) * 100}%` }"
            ></div>
            <input 
              type="range" 
              min="0" 
              :max="playerStore.duration || 100" 
              :value="playerStore.currentTime"
              @input="handleSeek"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
          </div>
          <span class="text-xs text-gray-500 font-mono w-9">{{ formatTime(playerStore.duration) }}</span>
        </div>
      </div>

      <!-- Volume (Neumorphic) -->
      <div class="w-1/3 flex justify-end items-center gap-3">
        <button @click="playerStore.toggleMute" class="text-gray-500 hover:text-gray-700 transition-colors">
          <svg v-if="playerStore.volume === 0 || playerStore.isMuted" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
            <path d="M17 9.28a.75.75 0 011.06 0l1.19 1.19 1.19-1.19a.75.75 0 111.06 1.06l-1.19 1.19 1.19 1.19a.75.75 0 11-1.06 1.06l-1.19-1.19-1.19 1.19a.75.75 0 11-1.06-1.06l1.19-1.19-1.19-1.19a.75.75 0 010-1.06z" />
          </svg>
          <svg v-else-if="playerStore.volume > 0.5" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
          </svg>
        </button>
        <div class="flex-1 max-w-[150px] h-[0.30rem] bg-gray-200 rounded-full shadow-inner-soft relative overflow-hidden">
          <div 
            class="absolute h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-100"
            :style="{ width: `${(playerStore.isMuted ? 0 : playerStore.volume) * 100}%` }"
          ></div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            :value="playerStore.isMuted ? 0 : playerStore.volume"
            @input="e => playerStore.setVolume(parseFloat(e.target.value))"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Range slider */
.range-slider {
  appearance: none;
  -webkit-appearance: none;
  /* background is handled by inline style */
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 0px;
  width: 0px;
}

.range-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: transparent; /* Background handled by input */
  border-radius: 2px;
}

/* Hide scrollbar */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Fade-in animation for progressive loading */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
  opacity: 0;
}

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
</style>
