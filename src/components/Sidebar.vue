<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlists'
import { useNavigationStore } from '@/stores/navigation'
import AboutModal from './AboutModal.vue'

const libraryStore = useLibraryStore()
const playlistStore = usePlaylistStore()
const navigationStore = useNavigationStore()
const emit = defineEmits(['close'])

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
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
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
            @click.prevent="navigationStore.navigateToPlaylist(playlist.id); emit('close')"
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
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-red-600" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clip-rule="evenodd" />
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
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
        </svg>
        About
      </button>
    </div>
    
    <AboutModal :show="showAbout" @close="showAbout = false" />
  </aside>
</template>

<style scoped>
</style>
