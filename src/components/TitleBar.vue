<script setup>
import { ref, onMounted } from 'vue'

const appIcon = ref('')
const systemTheme = ref('default') // 'gnome', 'kde', 'windows', 'mac', 'default'

// Load app icon and system theme
onMounted(async () => {
  appIcon.value = '/icon.png'
  if (window.electronAPI) {
    try {
      systemTheme.value = await window.electronAPI.getSystemTheme()
      console.log('Detected system theme:', systemTheme.value)
    } catch (e) {
      console.error('Failed to get system theme:', e)
    }
  }
})

function minimizeWindow() {
  if (window.electronAPI) {
    window.electronAPI.windowMinimize()
  }
}

function maximizeWindow() {
  if (window.electronAPI) {
    window.electronAPI.windowMaximize()
  }
}

function closeWindow() {
  if (window.electronAPI) {
    window.electronAPI.windowClose()
  }
}
</script>

<template>
  <div class="title-bar w-full bg-gray-50 border-b border-gray-200 h-10 flex items-center justify-between px-3 select-none flex-shrink-0" style="-webkit-app-region: drag">
    <!-- App Icon & Name -->
    <div class="flex items-center gap-2">
      <img :src="appIcon" alt="App Icon" class="w-5 h-5" />
      <span class="text-sm font-medium text-gray-700">Low Music</span>
    </div>
    
    <!-- Window Controls -->
    <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
      
      <!-- macOS Style (Traffic Lights) -->
      <template v-if="systemTheme === 'mac'">
        <button @click="closeWindow" class="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 border border-red-600 flex items-center justify-center group ml-2">
           <svg class="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button @click="minimizeWindow" class="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 border border-yellow-600 flex items-center justify-center group">
           <svg class="w-2 h-2 text-yellow-900 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 12h14" /></svg>
        </button>
        <button @click="maximizeWindow" class="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 border border-green-600 flex items-center justify-center group">
           <svg class="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </template>

      <!-- Linux / Chevron Style (User Preference) -->
      <template v-else-if="systemTheme === 'gnome' || systemTheme === 'kde' || systemTheme === 'default'">
        <button @click="minimizeWindow" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors mx-1" title="Minimize">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /> <!-- Chevron Down -->
          </svg>
        </button>
        <button @click="maximizeWindow" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors mx-1" title="Maximize">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /> <!-- Chevron Up -->
          </svg>
        </button>
        <button @click="closeWindow" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group mx-1" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /> <!-- X -->
          </svg>
        </button>
      </template>

      <!-- Windows Style (Fallback) -->
      <template v-else>
        <button 
          @click="minimizeWindow"
          class="w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-colors"
          title="Minimize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        
        <button 
          @click="maximizeWindow"
          class="w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-colors"
          title="Maximize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v16H4V4z" />
          </svg>
        </button>
        
        <button 
          @click="closeWindow"
          class="w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-900 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </template>
      
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  -webkit-user-select: none;
  user-select: none;
}
</style>
