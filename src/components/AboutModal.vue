<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])
</script>

<template>
  <transition name="fade">
    <div 
      v-if="show" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="emit('close')"
    >
      <div 
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">About Music Player</h2>
            <button 
              @click="emit('close')"
              class="text-white hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-blue-100 mt-2">Version 1.0.0</p>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4 max-h-96 overflow-y-auto">
          <!-- Icon Credits -->
          <div>
            <h3 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Application Icon
            </h3>
            <p class="text-sm text-gray-600">
              Icon made by 
              <a href="https://www.freepik.com" target="_blank" class="text-blue-500 hover:underline font-medium">Freepik</a>
              from 
              <a href="https://www.flaticon.com" target="_blank" class="text-blue-500 hover:underline font-medium">www.flaticon.com</a>
            </p>
          </div>

          <!-- Libraries -->
          <div>
            <h3 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Built With
            </h3>
            <ul class="text-sm text-gray-600 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <a href="https://www.electronjs.org/" target="_blank" class="hover:text-blue-500">Electron</a>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <a href="https://vuejs.org/" target="_blank" class="hover:text-blue-500">Vue.js</a>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <a href="https://pinia.vuejs.org/" target="_blank" class="hover:text-blue-500">Pinia</a>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <a href="https://tailwindcss.com/" target="_blank" class="hover:text-blue-500">Tailwind CSS</a>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <a href="https://github.com/Borewit/music-metadata" target="_blank" class="hover:text-blue-500">music-metadata</a>
              </li>
            </ul>
          </div>

          <!-- License -->
          <div class="pt-4 border-t border-gray-200">
            <p class="text-xs text-gray-500 text-center">
              Made with ❤️ for music lovers
            </p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
