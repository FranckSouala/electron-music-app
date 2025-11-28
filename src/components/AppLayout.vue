<script setup>
import TitleBar from './TitleBar.vue'
import Sidebar from './Sidebar.vue'
import PlayerBar from './PlayerBar.vue'
import SongList from './SongList.vue'
import PlaylistView from './PlaylistView.vue'
import StartupModal from './StartupModal.vue'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlists'
import { useStatsStore } from '@/stores/stats'
import { useNavigationStore } from '@/stores/navigation'
import { onMounted, ref, provide } from 'vue'

const isMobileSidebarOpen = ref(false)

function toggleSidebar() {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

provide('toggleSidebar', toggleSidebar)

const libraryStore = useLibraryStore()
const playlistStore = usePlaylistStore()
const statsStore = useStatsStore()
const navigationStore = useNavigationStore()

onMounted(async () => {
  // Delay initialization slightly to prioritize UI rendering
  await new Promise(resolve => setTimeout(resolve, 500))

  // IMPORTANT: Stats must be initialized FIRST before library
  // Otherwise markSongsAsAdded will overwrite existing stats with zeros
  await statsStore.initialize()
  await libraryStore.initialize()
  await playlistStore.initialize()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-200 text-white font-sans overflow-hidden">
    <!-- Title Bar: 40px fixed height -->
    <div class="flex-shrink-0">
      <TitleBar />
    </div>
    
    <!-- Main content area: fills remaining space -->
    <div class="flex flex-1 overflow-hidden min-h-0 relative">
      <!-- Mobile Sidebar Overlay -->
      <div 
        v-if="isMobileSidebarOpen" 
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="isMobileSidebarOpen = false"
      ></div>

      <!-- Sidebar: Fixed on mobile, relative on desktop -->
      <div 
        class="fixed top-0 bottom-0 left-0 z-50 lg:relative lg:z-0 lg:top-0 lg:bottom-0 transform transition-transform duration-300 ease-in-out lg:transform-none lg:h-full"
        :class="isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      >
        <Sidebar @close="isMobileSidebarOpen = false" class="pb-24 lg:pb-0" />
      </div>

      <main class="flex-1 relative bg-gray-50 min-w-0 w-full">
        <SongList v-if="navigationStore.currentView === 'library'" />
        <PlaylistView v-else-if="navigationStore.currentView === 'playlist'" />
      </main>
    </div>
    
    <!-- Player Bar: 96px fixed height -->
    <div class="h-24 flex-shrink-0">
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
