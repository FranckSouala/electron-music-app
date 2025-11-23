import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNavigationStore = defineStore('navigation', () => {
    const currentView = ref('library') // 'library' or 'playlist'
    const currentPlaylistId = ref(null)

    function navigateToLibrary() {
        currentView.value = 'library'
        currentPlaylistId.value = null
    }

    function navigateToPlaylist(id) {
        currentView.value = 'playlist'
        currentPlaylistId.value = id
    }

    return {
        currentView,
        currentPlaylistId,
        navigateToLibrary,
        navigateToPlaylist
    }
})
