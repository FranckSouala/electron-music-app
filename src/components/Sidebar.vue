<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlists'
import { useNavigationStore } from '@/stores/navigation'

const libraryStore = useLibraryStore()
const playlistStore = usePlaylistStore()
const navigationStore = useNavigationStore()

const isCreating = ref(false)
const newPlaylistName = ref('')
const newPlaylistInput = ref(null)

function startCreating() {
  isCreating.value = true
  // Wait for DOM update to focus input
  setTimeout(() => {
    newPlaylistInput.value?.focus()
  }, 0)
}

function confirmCreate() {
  if (newPlaylistName.value.trim()) {
    playlistStore.createPlaylist(newPlaylistName.value.trim())
    newPlaylistName.value = ''
    isCreating.value = false
  } else {
    cancelCreate()
  }
}

function cancelCreate() {
  isCreating.value = false
  newPlaylistName.value = ''
}

function deletePlaylist(id) {
  if (confirm("Are you sure you want to delete this playlist?")) {
    playlistStore.deletePlaylist(id)
    if (navigationStore.currentPlaylistId === id) {
      navigationStore.navigateToLibrary()
    }
  }
}
</script>

<template>
  <aside class="w-64 bg-darker flex flex-col h-full border-r border-white/5">
    <div class="p-6">
      <h1 class="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        Music App
      </h1>
    </div>

    <nav class="px-4 space-y-2">
      <a 
        href="#" 
        @click.prevent="navigationStore.navigateToLibrary()"
        class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
        :class="navigationStore.currentView === 'library' ? 'bg-surface text-white' : 'text-gray-400 hover:text-white hover:bg-surface/50'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        Library
      </a>
    </nav>

    <div class="mt-8 px-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Playlists</h3>
        <button 
          @click="startCreating"
          class="text-gray-400 hover:text-white transition-colors"
          title="Create Playlist"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        <!-- New Playlist Input -->
        <div v-if="isCreating" class="px-2 py-1">
          <input 
            ref="newPlaylistInput"
            v-model="newPlaylistName"
            @keyup.enter="confirmCreate"
            @keyup.esc="cancelCreate"
            @blur="cancelCreate"
            type="text"
            class="w-full bg-surface border border-primary rounded px-2 py-1 text-sm text-white focus:outline-none"
            placeholder="Name..."
          />
        </div>

        <div 
          v-for="playlist in playlistStore.playlists" 
          :key="playlist.id"
          class="group flex items-center justify-between text-sm cursor-pointer py-2 px-2 rounded transition-colors"
          :class="navigationStore.currentPlaylistId === playlist.id ? 'bg-surface text-white' : 'text-gray-400 hover:text-white hover:bg-surface/50'"
          @click="navigationStore.navigateToPlaylist(playlist.id)"
        >
          <span class="truncate">{{ playlist.name }}</span>
          <button 
            @click.stop="deletePlaylist(playlist.id)"
            class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div v-if="playlistStore.playlists.length === 0" class="text-xs text-gray-600 italic">
          No playlists yet
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-white/5 space-y-2">
      <button 
        @click="libraryStore.scanLibrary()"
        class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-surface/50 rounded-lg transition-colors"
        :disabled="libraryStore.isLoading"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" :class="{'animate-spin': libraryStore.isLoading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ libraryStore.isLoading ? 'Scanning...' : 'Reload Library' }}
      </button>
      
      <button 
        @click="libraryStore.selectFolder()"
        class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-surface/50 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Change Folder
      </button>
    </div>
  </aside>
</template>
