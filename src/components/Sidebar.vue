<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlists'
import { useNavigationStore } from '@/stores/navigation'
import AboutModal from './AboutModal.vue'

const libraryStore = useLibraryStore()
const playlistStore = usePlaylistStore()
const navigationStore = useNavigationStore()

const isCreating = ref(false)
const newPlaylistName = ref('')
const newPlaylistInput = ref(null)
const showAbout = ref(false)

function toggleCreating() {
  if (isCreating.value) {
    cancelCreate()
  } else {
    isCreating.value = true
    setTimeout(() => {
      newPlaylistInput.value?.focus()
    }, 0)
  }
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
  <aside class="w-64 flex-shrink-0 bg-gray-100 flex flex-col h-full border-r border-gray-300">
    <div class="mt-6 px-6 flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Playlists</h3>
        <button 
          @click="toggleCreating"
          class="w-8 h-8 rounded-lg bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all flex items-center justify-center"
          :title="isCreating ? 'Cancel' : 'Create Playlist'"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            class="h-4 w-4 text-gray-700 transition-transform duration-300 ease-in-out" 
            :class="{ 'rotate-45': isCreating }"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-2 overflow-y-auto flex-1 pr-2">
        <div v-if="isCreating" class="mb-2 p-3 rounded-xl bg-white shadow-neumorphic">
          <input 
            ref="newPlaylistInput"
            v-model="newPlaylistName" 
            type="text" 
            placeholder="Playlist name"
            @keyup.enter="confirmCreate"
            @keyup.esc="cancelCreate"
            class="w-full bg-gray-100 text-gray-800 border-none outline-none text-sm rounded-lg px-2 py-1"
          />
          <div class="flex gap-2 mt-2">
            <button @click="confirmCreate" class="flex-1 text-xs bg-blue-500 text-white py-1 rounded-lg hover:bg-blue-600 transition-colors">Create</button>
            <button @click="cancelCreate" class="flex-1 text-xs bg-gray-300 text-gray-700 py-1 rounded-lg hover:bg-gray-400 transition-colors">Cancel</button>
          </div>
        </div>

        <div v-for="playlist in playlistStore.playlists" :key="playlist.id" class="group relative mb-2">
          <a 
            href="#" 
            @click.prevent="navigationStore.navigateToPlaylist(playlist.id)"
            class="flex items-center justify-between px-4 py-2 rounded-xl transition-all"
            :class="navigationStore.currentPlaylistId === playlist.id ? 'bg-white shadow-neumorphic text-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'"
          >
            <span class="truncate text-sm">{{ playlist.name }}</span>
            <span class="text-xs text-gray-500">{{ playlist.songs.length }}</span>
          </a>
          <button 
            @click="deletePlaylist(playlist.id)"
            class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center"
            title="Delete Playlist"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142C18.046 20.181 17.211 21 16.21 21H7.79c-1.001 0-1.836-.819-1.923-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="mt-auto p-4 border-t border-gray-300">
      <button 
        @click="libraryStore.selectFolder" 
        class="w-full px-4 py-2 rounded-xl bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all text-sm font-medium text-gray-700 mb-2"
      >
        Change Folder
      </button>
      <button 
        @click="libraryStore.scanLibrary" 
        :disabled="libraryStore.isLoading"
        class="w-full px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-neumorphic hover:shadow-neumorphic-pressed mb-2"
      >
        {{ libraryStore.isLoading ? 'Loading...' : 'Reload Library' }}
      </button>
      <button 
        @click="showAbout = true"
        class="w-full px-4 py-2 rounded-xl bg-white shadow-neumorphic hover:shadow-neumorphic-pressed transition-all text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        About
      </button>
    </div>
    
    <AboutModal :show="showAbout" @close="showAbout = false" />
  </aside>
</template>

<style scoped>
</style>
