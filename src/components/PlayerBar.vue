<script setup>
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { useStatsStore } from '@/stores/stats'
import { computed, ref, watch } from 'vue'

const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()
const statsStore = useStatsStore()

const currentSong = computed(() => playerStore.currentSong)
const currentCover = ref(null)
const isExpanded = ref(false)
const showSearch = ref(false)
const searchQuery = ref('')

// Smart Playlists Data
const allSongsCover = ref(null)
const recentlyPlayedCover = ref(null)
const recentlyAddedCover = ref(null)
const mostPlayedCover = ref(null)

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

// Search Results
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase()
  return libraryStore.songs.filter(song => 
    song.title.toLowerCase().includes(query) || 
    song.artist.toLowerCase().includes(query)
  ).slice(0, 50)
})

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
    background: `linear-gradient(to right, #f97316 0%, #f97316 ${percent}%, #374151 ${percent}%, #374151 100%)`
  }
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchQuery.value = ''
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
    class="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/5 px-6 flex items-center justify-between z-50 overflow-hidden"
    style="will-change: height; transform: translateZ(0);"
    :style="{ 
      height: isExpanded ? '100vh' : '6rem',
      transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }"
    :class="[
      isExpanded ? 'flex-col justify-end pb-0' : 'min-w-[800px]'
    ]"
  >
    <!-- Expanded Background -->
    <div v-if="isExpanded" class="absolute inset-0 z-0 overflow-hidden">
      <img v-if="currentCover" :src="currentCover" class="w-full h-full object-cover blur-2xl opacity-50 scale-110" />
      <div class="absolute inset-0 bg-black/60"></div>
    </div>

    <!-- Close Button (Top Right) -->
    <button 
      v-if="isExpanded"
      @click="toggleExpanded" 
      class="absolute top-8 right-8 z-50 text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Expanded Content -->
    <div v-if="isExpanded" class="absolute inset-0 z-10 flex p-12 pb-32 gap-12">
      <!-- Left: Cover & Info -->
      <div class="w-1/2 flex flex-col justify-center items-start gap-6">
        <div class="w-full aspect-square max-w-[600px] rounded-2xl overflow-hidden shadow-2xl mx-auto">
          <img v-if="currentCover" :src="currentCover" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-32 w-32 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        </div>
        <div class="w-full max-w-[600px] mx-auto">
          <h1 class="text-4xl font-bold text-white mb-2">{{ currentSong?.title }}</h1>
          <p class="text-xl text-gray-300">{{ currentSong?.artist }}</p>
        </div>
      </div>

      <!-- Right: Queue & Playlists -->
      <div class="w-1/2 h-full overflow-y-auto hide-scrollbar pt-20">
        <!-- Smart Playlists Tiles -->
        <div v-if="!showSearch" class="mb-8">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Access</h3>
          <div class="grid grid-cols-2 gap-4">
            <!-- Most Played -->
            <div 
              @click="playSmartPlaylist(mostPlayedSongs)"
              class="relative aspect-video rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform"
            >
              <img v-if="mostPlayedCover" :src="mostPlayedCover" class="absolute inset-0 w-full h-full object-cover" />
              <div v-else class="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600"></div>
              <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex flex-col justify-end p-4">
                <h4 class="text-white font-bold text-lg shadow-lg">Most Played</h4>
                <p class="text-xs text-gray-300">{{ mostPlayedSongs.length }} songs</p>
              </div>
            </div>

            <!-- Recently Played -->
            <div 
              @click="playSmartPlaylist(recentlyPlayedSongs)"
              class="relative aspect-video rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform"
            >
              <img v-if="recentlyPlayedCover" :src="recentlyPlayedCover" class="absolute inset-0 w-full h-full object-cover" />
              <div v-else class="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600"></div>
              <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex flex-col justify-end p-4">
                <h4 class="text-white font-bold text-lg shadow-lg">Recently Played</h4>
                <p class="text-xs text-gray-300">{{ recentlyPlayedSongs.length }} songs</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Header with Search -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {{ showSearch && searchQuery.trim() ? 'Search Results' : 'Up Next' }}
          </h3>
          <div class="flex items-center gap-2">
            <div v-if="showSearch" class="relative">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search library..." 
                class="bg-white/10 border border-white/20 rounded-full px-4 py-1 text-sm text-white focus:outline-none focus:border-primary w-48"
                autoFocus
              />
            </div>
            <button @click="toggleSearch" class="text-gray-400 hover:text-white transition-colors">
              <svg v-if="!showSearch" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- List (Queue or Search Results) -->
        <div class="flex flex-col gap-2">
          <div 
            v-for="(song, index) in (showSearch && searchQuery.trim() ? searchResults : playerStore.queue)" 
            :key="song.id"
            class="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
            :class="{'bg-white/10': currentSong?.id === song.id}"
            @click="() => {
              playerStore.play(song);
              if (showSearch) {
                searchQuery = '';
                showSearch = false;
              }
            }"
          >
            <div class="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
               <div class="w-full h-full flex items-center justify-center text-gray-500 text-xs">♫</div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-white truncate" :class="{'text-primary': currentSong?.id === song.id}">{{ song.title }}</div>
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

    <!-- EXPANDED CONTROLS BAR -->
    <div v-if="isExpanded" class="absolute bottom-0 left-0 right-0 h-24 px-12 flex items-center gap-8 z-50 bg-gradient-to-t from-black/80 to-transparent">
      <!-- Play Button (Left) -->
      <button 
        class="text-white hover:text-primary transition-colors hover:scale-110 transform"
        @click="playerStore.togglePlay"
      >
        <svg v-if="playerStore.isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>

      <!-- Seek Slider (Middle) -->
      <div class="flex-1 flex items-center gap-3 text-xs text-gray-300 font-mono">
        <span>{{ formatTime(playerStore.currentTime) }}</span>
        <input 
          type="range" 
          min="0" 
          :max="playerStore.duration || 100" 
          :value="playerStore.currentTime"
          @input="handleSeek"
          class="flex-1 h-1 rounded-lg appearance-none cursor-pointer range-slider"
          :style="getProgressStyle(playerStore.currentTime, playerStore.duration || 100)"
        >
        <span>{{ formatTime(playerStore.duration) }}</span>
      </div>

      <!-- Right Group (Prev, Next, Shuffle, Loop, Volume) -->
      <div class="flex items-center gap-6">
        <button class="text-gray-300 hover:text-white transition-colors" @click="playerStore.prev">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button class="text-gray-300 hover:text-white transition-colors" @click="playerStore.next">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <button 
          class="text-gray-300 hover:text-white transition-colors" 
          :class="{'text-primary': playerStore.isShuffle}"
          @click="playerStore.toggleShuffle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </button>

        <button 
          class="text-gray-300 hover:text-white transition-colors relative"
          :class="{'text-primary': playerStore.loopMode > 0}"
          @click="playerStore.toggleLoop"
          :title="playerStore.loopMode === 2 ? 'Loop One' : playerStore.loopMode === 1 ? 'Loop All' : 'Loop Off'"
        >
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
           </svg>
           <span v-if="playerStore.loopMode === 2" class="absolute -top-1 -right-1 text-[10px] font-bold bg-surface rounded-full px-1">1</span>
        </button>

        <!-- Volume (Moved left by adding margin-right) -->
        <div class="flex items-center gap-2 w-24 ml-4 mr-8">
          <svg v-if="playerStore.volume === 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            :value="playerStore.volume"
            @input="e => playerStore.setVolume(parseFloat(e.target.value))"
            class="flex-1 h-1 rounded-lg appearance-none cursor-pointer range-slider"
            :style="getProgressStyle(playerStore.volume, 1)"
          >
        </div>
      </div>
    </div>

    <!-- NORMAL PLAYER BAR CONTENT (Hidden when expanded) -->
    <template v-if="!isExpanded">
      <!-- Song Info -->
      <div class="flex items-center gap-4 w-1/3 cursor-pointer hover:opacity-80 transition-opacity" @click="toggleExpanded">
        <div v-if="currentSong" class="w-14 h-14 bg-darker rounded-lg overflow-hidden flex-shrink-0">
           <img v-if="currentCover" :src="currentCover" class="w-full h-full object-cover" />
           <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
           </div>
        </div>
        <div v-if="currentSong" class="overflow-hidden">
          <h4 class="font-bold text-white truncate">{{ currentSong.title }}</h4>
          <p class="text-xs text-gray-400 truncate">{{ currentSong.artist }}</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex flex-col items-center w-1/3 gap-2 relative left-[60px]">
        <div class="flex items-center gap-6">
          <button 
            class="text-gray-400 hover:text-white transition-colors" 
            :class="{'text-primary': playerStore.isShuffle}"
            @click="playerStore.toggleShuffle"
            title="Shuffle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </button>

          <button class="text-gray-400 hover:text-white transition-colors" @click="playerStore.prev">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          
          <button 
            class="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            @click="playerStore.togglePlay"
          >
            <svg v-if="playerStore.isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <button class="text-gray-400 hover:text-white transition-colors" @click="playerStore.next">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <button 
            class="text-gray-400 hover:text-white transition-colors relative"
            :class="{'text-primary': playerStore.loopMode > 0}"
            @click="playerStore.toggleLoop"
            :title="playerStore.loopMode === 2 ? 'Loop One' : playerStore.loopMode === 1 ? 'Loop All' : 'Loop Off'"
          >
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
             </svg>
             <span v-if="playerStore.loopMode === 2" class="absolute -top-1 -right-1 text-[10px] font-bold bg-surface rounded-full px-1">1</span>
          </button>
        </div>

        <div class="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
          <span>{{ formatTime(playerStore.currentTime) }}</span>
          <input 
            type="range" 
            min="0" 
            :max="playerStore.duration || 100" 
            :value="playerStore.currentTime"
            @input="handleSeek"
            class="flex-1 h-1 rounded-lg appearance-none cursor-pointer range-slider"
            :style="getProgressStyle(playerStore.currentTime, playerStore.duration || 100)"
          >
          <span>{{ formatTime(playerStore.duration) }}</span>
        </div>
      </div>

      <!-- Volume / Extra -->
      <div class="w-1/3 flex justify-center relative left-[60px]">
        <div class="flex items-center gap-2 w-32">
          <button @click="playerStore.setVolume(playerStore.volume === 0 ? 1 : 0)" class="text-gray-400 hover:text-white">
            <svg v-if="playerStore.volume === 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            <svg v-else-if="playerStore.volume < 0.5" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            :value="playerStore.volume"
            @input="e => playerStore.setVolume(parseFloat(e.target.value))"
            class="flex-1 h-1 rounded-lg appearance-none cursor-pointer range-slider"
            :style="getProgressStyle(playerStore.volume, 1)"
          >
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
</style>
