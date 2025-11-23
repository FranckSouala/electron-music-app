<script setup>
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlists'
import { useStatsStore } from '@/stores/stats'
import { computed, ref, onMounted } from 'vue'

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

const songs = computed(() => {
  let baseSongs = libraryStore.songs
  
  // Apply category filter
  if (selectedCategory.value) {
    const now = Date.now()
    
    if (selectedCategory.value === 'recently-played') {
      // Songs with last played, sorted by most recent
      baseSongs = baseSongs
        .map(s => ({ ...s, stats: statsStore.getSongStats(s.id) }))
        .filter(s => s.stats.lastPlayed)
        .sort((a, b) => b.stats.lastPlayed - a.stats.lastPlayed)
        .slice(0, 20) // Limit to 20
    } else if (selectedCategory.value === 'recently-added') {
      // Songs added within the period
      baseSongs = baseSongs
        .map(s => ({ ...s, stats: statsStore.getSongStats(s.id) }))
        .filter(s => (now - s.stats.addedAt) < recentlyAddedPeriod.value)
        .sort((a, b) => b.stats.addedAt - a.stats.addedAt)
    } else if (selectedCategory.value === 'most-played') {
      // Songs sorted by play count
      baseSongs = baseSongs
        .map(s => ({ ...s, stats: statsStore.getSongStats(s.id) }))
        .filter(s => s.stats.playCount > 0)
        .sort((a, b) => b.stats.playCount - a.stats.playCount)
        .slice(0, 20) // Limit to 20
    }
  }
  
  // Apply search filter
  if (!searchQuery.value) return baseSongs
  const query = searchQuery.value.toLowerCase()
  return baseSongs.filter(s => 
    s.title.toLowerCase().includes(query) || 
    s.artist.toLowerCase().includes(query) ||
    s.album.toLowerCase().includes(query)
  )
})

const categories = [
  { id: null, label: 'All songs', count: computed(() => libraryStore.songs.length) },
  { id: 'recently-played', label: 'Recently played', count: computed(() => {
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => stats.lastPlayed).length
  })},
  { id: 'recently-added', label: 'Recently added', count: computed(() => {
    const now = Date.now()
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => (now - stats.addedAt) < recentlyAddedPeriod.value).length
  })},
  { id: 'most-played', label: 'Most played', count: computed(() => {
    return libraryStore.songs
      .map(s => statsStore.getSongStats(s.id))
      .filter(stats => stats.playCount > 0).length
  })},
]

function selectCategory(categoryId) {
  selectedCategory.value = selectedCategory.value === categoryId ? null : categoryId
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    // Focus logic could go here
  } else {
    searchQuery.value = ''
  }
}

function shufflePlay() {
  if (songs.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * songs.value.length)
    playerStore.isShuffle = true
    // Use playContext for shuffle play too? 
    // If we just play(song), the queue might not be set correctly if we want to shuffle the whole library.
    // Let's set the queue to the whole library (filtered).
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

function addToPlaylist(playlistId) {
  if (selectedSongForMenu.value) {
    playlistStore.addSongToPlaylist(playlistId, selectedSongForMenu.value)
    closeContextMenu()
  }
}

function playSong(song) {
  // When playing from library, set queue to all library songs
  playerStore.playContext(songs.value, songs.value.findIndex(s => s.id === song.id))
}

// Close context menu on click outside
onMounted(() => {
  window.addEventListener('click', closeContextMenu)
})
</script>

<template>
  <div class="p-8 overflow-y-auto h-full pb-32">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-3xl font-bold">Local Library</h2>
        <p class="text-gray-400 text-sm mt-1">{{ songs.length }} songs</p>
      </div>
      
      <div class="flex items-center gap-4">
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
            placeholder="Search songs..." 
            class="bg-surface border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary w-64"
            autofocus
          />
        </Transition>

        <button 
          @click="toggleSearch"
          class="p-2 text-gray-400 hover:text-white hover:bg-surface rounded-full transition-colors"
          :class="{'text-primary bg-surface': showSearch}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <button 
          @click="shufflePlay"
          class="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-transform hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
          Shuffle Play
        </button>
      </div>
    </div>
    
    <!-- Categories Slider -->
    <div class="mb-8">      
      <div class="overflow-x-auto hide-scrollbar">
        <div class="flex gap-4 pb-2">
          <div 
            v-for="category in categories" 
            :key="category.id || 'all'"
            @click="selectCategory(category.id)"
            class="flex-shrink-0 cursor-pointer group"
          >
            <div 
              class="w-[220px] h-[220px] rounded-2xl overflow-hidden mb-3 transition-all shadow-lg hover:shadow-xl"
              :class="selectedCategory === category.id ? 'ring-2 ring-white/20' : ''"
            >
              <div class="w-full h-full bg-gradient-to-br flex items-center justify-center"
                :class="{
                  'from-blue-500 to-cyan-500': category.id === null,
                  'from-purple-500 to-pink-500': category.id === 'recently-played',
                  'from-green-500 to-teal-500': category.id === 'recently-added',
                  'from-orange-500 to-red-500': category.id === 'most-played',
                }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path v-if="category.id === null" stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  <path v-else-if="category.id === 'recently-played'" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path v-else-if="category.id === 'recently-added'" stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div class="text-base font-semibold text-white" :class="{ 'text-primary': selectedCategory === category.id }">
              {{ category.label }}
            </div>
            <div class="text-sm text-gray-400">{{ category.count.value }} songs</div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="songs.length === 0" class="text-center text-gray-500 mt-20">
      <p class="text-xl">No songs found.</p>
      <p v-if="searchQuery">Try a different search term.</p>
      <p v-else>Try reloading or selecting a different folder.</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <div 
        v-for="song in songs" 
        :key="song.id"
        class="group relative bg-surface hover:bg-surface-hover rounded-xl p-4 transition-all cursor-pointer"
        @click="playSong(song)"
        @contextmenu="openContextMenu($event, song)"
        @mouseenter="loadCover(song)" 
      >
        <div class="aspect-square bg-darker rounded-lg mb-4 overflow-hidden relative shadow-lg">
          <img 
            v-if="covers[song.id]" 
            :src="covers[song.id]" 
            class="w-full h-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          
          <!-- Play overlay -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div class="bg-primary rounded-full p-3 shadow-xl transform scale-0 group-hover:scale-100 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <h3 class="font-bold text-white truncate mb-1">{{ song.title }}</h3>
        <p class="text-sm text-gray-400 truncate">{{ song.artist }}</p>
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
