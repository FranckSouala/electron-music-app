<script setup>
import { inject } from 'vue'

const { ipcRenderer } = window.electronAPI || {}
const systemTheme = window.electronAPI ? window.electronAPI.getSystemTheme() : 'default'
const toggleSidebar = inject('toggleSidebar')

function minimizeWindow() {
  if (window.electronAPI) window.electronAPI.windowMinimize()
}

function maximizeWindow() {
  if (window.electronAPI) window.electronAPI.windowMaximize()
}

function closeWindow() {
  if (window.electronAPI) window.electronAPI.windowClose()
}
</script>

<template>
  <div class="h-10 bg-gray-200 flex items-center justify-between px-4 select-none draggable border-b border-gray-300">
    <!-- Left: App Icon & Title -->
    <div class="flex items-center gap-2">
      <!-- Hamburger Menu (Mobile Only) -->
      <button 
        @click="toggleSidebar"
        class="lg:hidden p-1 rounded hover:bg-gray-300 transition-colors no-drag"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
        </svg>
      </button>

      <img src="/icon.png" class="w-5 h-5" alt="App Icon" />
      <span class="text-xs font-semibold text-gray-600">Low Music</span>
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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clip-rule="evenodd" />
          </svg>
        </button>
        <button @click="maximizeWindow" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors mx-1" title="Maximize">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clip-rule="evenodd" />
          </svg>
        </button>
        <button @click="closeWindow" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group mx-1" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-700 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <button 
          @click="maximizeWindow"
          class="w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-colors"
          title="Maximize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M4.5 4.5a.75.75 0 00-.75.75v13.5a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H4.5zm1.5 1.5h10.5v10.5H6V6z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <button 
          @click="closeWindow"
          class="w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-900 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
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
