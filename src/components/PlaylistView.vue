<script setup>
import { usePlaylistStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'
import { useNavigationStore } from '@/stores/navigation'
import { useStatsStore } from '@/stores/stats'
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()
const navigationStore = useNavigationStore()
const statsStore = useStatsStore()

const playlist = computed(() => 
  playlistStore.playlists.find(p => p.id === navigationStore.currentPlaylistId)
)

const songs = computed(() => playlist.value?.songs || [])
const covers = ref({}) 

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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

// Intersection Observer for lazy loading
let observer = null

function setupObserver() {
  if (observer) observer.disconnect()
  
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const songId = entry.target.dataset.songId
        const song = songs.value.find(s => s.id === songId)
        if (song) {
          loadCover(song)
          observer.unobserve(entry.target)
        }
      }
    })
  }, {
    rootMargin: '50px' // Load a bit before they come into view
  })

  // Observe all song items
  document.querySelectorAll('.song-item').forEach(el => {
    observer.observe(el)
  })
}

onMounted(() => {
  // Wait for DOM update
  nextTick(() => {
    setupObserver()
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// Re-setup observer when songs change
watch(songs, () => {
  nextTick(() => {
    setupObserver()
  })
})

function removeSong(songId) {
    playlistStore.removeSongFromPlaylist(playlist.value.id, songId)
}

function playPlaylist(startIndex = 0) {
    // For now, just play the song. 
    // Ideally we should replace the player queue with this playlist.
    // Since our player logic is simple (based on libraryStore), we might need to update player to support queues or different contexts.
    // For this MVP, let's just play the song. The "Next" logic in player.js relies on libraryStore.songs.
    // We need to update player.js to support a "context" (library or playlist).
    
    // Let's just play the song and warn user or (better) refactor player.js quickly.
    // Actually, let's refactor player.js to accept a list of songs context.
    
    playerStore.playContext(songs.value, startIndex)
}

function shufflePlaylist() {
    if (songs.value.length > 0) {
        const randomIndex = Math.floor(Math.random() * songs.value.length)
        playerStore.isShuffle = true
        playerStore.playContext(songs.value, randomIndex)
    }
}
</script>

<template>
  <div class="p-8 overflow-y-auto h-full pb-8" v-if="playlist">
    <button 
      @click="navigationStore.navigateToLibrary()"
      class="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clip-rule="evenodd" />
      </svg>
      Back to Library
    </button>

    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-3xl font-bold text-gray-800">{{ playlist.name }}</h2>
        <p class="text-gray-600 text-sm mt-1">{{ songs.length }} songs</p>
      </div>
      
      <div class="flex gap-3" v-if="songs.length > 0">
        <button 
          @click="shufflePlaylist"
          class="bg-primary hover:bg-blue-600 text-gray-800 px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-neumorphic hover:shadow-neumorphic-pressed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" clip-rule="evenodd" />
          </svg>
          Shuffle
        </button>
        
        <button 
          @click="playPlaylist(0)"
          class="bg-primary hover:bg-blue-600 text-gray-800 px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-neumorphic hover:shadow-neumorphic-pressed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.553a.75.75 0 010 1.106l-7.905 5.396a.75.75 0 01-1.169-.617V6.669a.75.75 0 011.169-.617l7.905 5.396z" clip-rule="evenodd" />
          </svg>
          Play All
        </button>
      </div>
    </div>

    <div v-if="songs.length === 0" class="text-center text-gray-500 mt-20">
      <p class="text-xl">This playlist is empty.</p>
      <p>Go to the Library to add songs.</p>
    </div>

    <div class="space-y-2">
        <div 
            v-for="(song, index) in songs" 
            :key="song.id"
            class="group flex items-center gap-4 p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer song-item"
            :data-song-id="song.id"
            @click="playPlaylist(index)"
        >
            <div class="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                <img v-if="covers[song.id]" :src="covers[song.id]" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 00-3-3h-3.879a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H6a3 3 0 00-3 3v3.162A3.756 3.756 0 014.094 9h15.812zM4.094 10.5a2.25 2.25 0 00-2.227 2.568l.857 6A2.25 2.25 0 004.951 21H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-2.227-2.568H4.094z" />
                    </svg>
                </div>
            </div>
            
            <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-800 truncate">{{ song.title }}</h4>
                <p class="text-xs text-gray-600 truncate">{{ song.artist }}</p>
            </div>
            
            <div class="text-sm text-gray-500 font-mono">{{ formatDuration(song.duration) }}</div>
            
            <!-- Like Button -->
            <button 
                @click.stop="statsStore.toggleLike(song.id)"
                class="p-1.5 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                :class="statsStore.getSongStats(song.id).liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'"
            >
                <svg v-if="statsStore.getSongStats(song.id).liked" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
            </button>
            
            <button 
                @click.stop="removeSong(song.id)"
                class="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from playlist"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    </div>
  </div>
</template>
