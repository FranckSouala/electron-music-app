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
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
          </svg>
        Select Music Folder
      </button>
    </div>
  </div>
</template>
