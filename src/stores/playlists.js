import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export const usePlaylistStore = defineStore('playlists', () => {
    const playlists = ref([])

    // Load playlists on startup
    async function initialize() {
        if (window.electronAPI) {
            playlists.value = await window.electronAPI.getPlaylists()
        }
    }

    // Save playlists whenever they change
    watch(playlists, async (newPlaylists) => {
        if (window.electronAPI) {
            await window.electronAPI.savePlaylists(JSON.parse(JSON.stringify(newPlaylists)))
        }
    }, { deep: true })

    function createPlaylist(name) {
        const newPlaylist = {
            id: uuidv4(),
            name: name,
            songs: [],
            createdAt: new Date().toISOString()
        }
        playlists.value.push(newPlaylist)
        return newPlaylist
    }

    function deletePlaylist(id) {
        const index = playlists.value.findIndex(p => p.id === id)
        if (index !== -1) {
            playlists.value.splice(index, 1)
        }
    }

    function addSongToPlaylist(playlistId, song) {
        const playlist = playlists.value.find(p => p.id === playlistId)
        if (playlist) {
            // Check if song already exists
            if (!playlist.songs.some(s => s.id === song.id)) {
                playlist.songs.push(song)
            }
        }
    }

    function removeSongFromPlaylist(playlistId, songId) {
        const playlist = playlists.value.find(p => p.id === playlistId)
        if (playlist) {
            const index = playlist.songs.findIndex(s => s.id === songId)
            if (index !== -1) {
                playlist.songs.splice(index, 1)
            }
        }
    }

    return {
        playlists,
        initialize,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist
    }
})
