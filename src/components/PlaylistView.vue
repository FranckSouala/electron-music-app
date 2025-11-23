<script setup>
import { usePlaylistStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'
import { useNavigationStore } from '@/stores/navigation'
import { computed, ref } from 'vue'

const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()
const navigationStore = useNavigationStore()

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

function removeSong(songId) {
    playlistStore.removeSongFromPlaylist(playlist.value.id, songId)
}

function playPlaylist(startIndex = 0) {
    // For now, just play the song. 
    // Ideally we should replace the player queue with this playlist.
    // Since our player logic is simple (based on libraryStore), we might need to update player to support queues or different contexts.
    // For this MVP, let's just play the song. The "Next" logic in player.js relies on libraryStore.songs.
    // We need to update player.js to support a "context" (library or playlist).
    
    // Hack for now: We can't easily switch context without refactoring player.js.
    // Let's just play the song and warn user or (better) refactor player.js quickly.
    // Actually, let's refactor player.js to accept a list of songs context.
    
    playerStore.playContext(songs.value, startIndex)
}
</script>

<template>
  <div class="p-8 overflow-y-auto h-full pb-32" v-if="playlist">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-3xl font-bold">{{ playlist.name }}</h2>
        <p class="text-gray-400 text-sm mt-1">{{ songs.length }} songs</p>
      </div>
      
      <button 
        @click="playPlaylist(0)"
        class="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-transform hover:scale-105"
        v-if="songs.length > 0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Play All
      </button>
    </div>

    <div v-if="songs.length === 0" class="text-center text-gray-500 mt-20">
      <p class="text-xl">This playlist is empty.</p>
      <p>Go to the Library to add songs.</p>
    </div>

    <div class="space-y-2">
        <div 
            v-for="(song, index) in songs" 
            :key="song.id"
            class="group flex items-center gap-4 p-2 rounded-lg hover:bg-surface/50 transition-colors cursor-pointer"
            @click="playPlaylist(index)"
            @mouseenter="loadCover(song)"
        >
            <div class="w-10 h-10 bg-darker rounded overflow-hidden flex-shrink-0">
                <img v-if="covers[song.id]" :src="covers[song.id]" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                </div>
            </div>
            
            <div class="flex-1 min-w-0">
                <h4 class="font-medium text-white truncate">{{ song.title }}</h4>
                <p class="text-xs text-gray-400 truncate">{{ song.artist }}</p>
            </div>
            
            <div class="text-sm text-gray-500 font-mono">{{ formatDuration(song.duration) }}</div>
            
            <button 
                @click.stop="removeSong(song.id)"
                class="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from playlist"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    </div>
  </div>
</template>
