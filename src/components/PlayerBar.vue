<script setup>
import { usePlayerStore } from '@/stores/player'
import { computed, ref, watch } from 'vue'

const playerStore = usePlayerStore()
const currentSong = computed(() => playerStore.currentSong)
const currentCover = ref(null)

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
  <div class="h-24 bg-surface border-t border-white/5 px-6 flex items-center justify-between z-40 flex-shrink-0 min-w-[800px]">
    <!-- Song Info -->
    <div class="flex items-center gap-4 w-1/3">
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
  </div>
</template>

<style scoped>
.range-slider {
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
