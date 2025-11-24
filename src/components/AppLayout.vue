<script setup>
import Sidebar from './Sidebar.vue'
import PlayerBar from './PlayerBar.vue'
import SongList from './SongList.vue'
import PlaylistView from './PlaylistView.vue'
import StartupModal from './StartupModal.vue'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlists'
import { useStatsStore } from '@/stores/stats'
import { useNavigationStore } from '@/stores/navigation'
import { onMounted } from 'vue'

const libraryStore = useLibraryStore()
const playlistStore = usePlaylistStore()
const statsStore = useStatsStore()
const navigationStore = useNavigationStore()

onMounted(async () => {
  // IMPORTANT: Stats must be initialized FIRST before library
  // Otherwise markSongsAsAdded will overwrite existing stats with zeros
  await statsStore.initialize()
  await libraryStore.initialize()
  await playlistStore.initialize()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-dark text-white font-sans overflow-hidden">
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 relative bg-darker min-w-0">
        <SongList v-if="navigationStore.currentView === 'library'" />
        <PlaylistView v-else-if="navigationStore.currentView === 'playlist'" />
      </main>
    </div>
    <div class="h-24 flex-shrink-0 z-40 relative">
      <PlayerBar />
    </div>
    
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <StartupModal v-if="libraryStore.isInitialized && !libraryStore.musicFolder" />
    </Transition>
  </div>
</template>
