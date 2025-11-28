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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clip-rule="evenodd" />
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 11-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z" clip-rule="evenodd" />
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
