<script setup>
import { useLibraryStore } from '@/stores/library'

const libraryStore = useLibraryStore()
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-gray-300">
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Welcome to Music App</h2>
      <p class="text-gray-600 mb-8">Please select a folder to scan for music files.</p>
      
      <button 
        @click="libraryStore.selectFolder()"
        class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all transform hover:scale-105 flex items-center justify-center mx-auto gap-2 shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select Music Folder
      </button>
    </div>
  </div>
</template>
