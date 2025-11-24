import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useStatsStore } from './stats'

export const useLibraryStore = defineStore('library', () => {
    const musicFolder = ref(null)
    const songs = shallowRef([])
    const isLoading = ref(false)
    const isInitialized = ref(false)

    async function initialize() {
        if (window.electronAPI) {
            const state = await window.electronAPI.getInitialState()
            musicFolder.value = state.musicFolder
            songs.value = state.library || []
            isInitialized.value = true

            // Mark all existing songs as added if not already tracked
            if (songs.value.length > 0) {
                const statsStore = useStatsStore()
                const songIds = songs.value.map(s => s.id)
                statsStore.markSongsAsAdded(songIds)
            }
        }
    }

    async function selectFolder() {
        if (window.electronAPI) {
            const folderPath = await window.electronAPI.selectFolder()
            if (folderPath) {
                musicFolder.value = folderPath
                await scanLibrary()
            }
        }
    }

    async function scanLibrary() {
        if (!musicFolder.value || !window.electronAPI) return

        isLoading.value = true
        try {
            const scannedSongs = await window.electronAPI.scanLibrary(musicFolder.value)
            songs.value = scannedSongs

            // Mark new songs as added
            const statsStore = useStatsStore()
            const songIds = scannedSongs.map(s => s.id)
            statsStore.markSongsAsAdded(songIds)
        } catch (error) {
            console.error('Scan failed:', error)
        } finally {
            isLoading.value = false
        }
    }

    return {
        musicFolder,
        songs,
        isLoading,
        isInitialized,
        initialize,
        selectFolder,
        scanLibrary
    }
})
