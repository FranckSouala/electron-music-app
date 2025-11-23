import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'
import { useStatsStore } from './stats'

export const usePlayerStore = defineStore('player', () => {
    const libraryStore = useLibraryStore()
    const statsStore = useStatsStore()
    const currentSong = ref(null)
    const isPlaying = ref(false)
    const audio = new Audio()
    const duration = ref(0)
    const currentTime = ref(0)
    const isShuffle = ref(false)
    const loopMode = ref(0) // 0: Off, 1: All, 2: One
    const queue = ref([]) // Current playback queue

    // Sync volume/etc if needed

    audio.addEventListener('timeupdate', () => {
        currentTime.value = audio.currentTime
    })

    audio.addEventListener('loadedmetadata', () => {
        duration.value = audio.duration
    })

    audio.addEventListener('ended', () => {
        if (loopMode.value === 2) { // Loop One
            audio.currentTime = 0
            audio.play()
        } else {
            next(true) // Pass true to indicate auto-advance
        }
    })

    audio.addEventListener('error', (e) => {
        console.error("Audio playback error:", audio.error, audio.src)
    })

    function play(song) {
        // If playing a song not in the current queue, we should probably update the queue 
        // or assume the queue was already updated by playContext.
        // For simple click in library, we assume library context if queue is empty or different?
        // Let's make play just play the song, and playContext handle the queue.

        if (currentSong.value?.id === song.id) {
            togglePlay()
            return
        }

        currentSong.value = song
        // Track play
        statsStore.trackPlay(song.id)
        audio.src = `file://${song.path}`
        audio.play().catch(e => console.error("Play failed:", e))
        isPlaying.value = true
    }

    function playContext(songs, startIndex = 0) {
        queue.value = songs
        play(songs[startIndex])
    }

    function togglePlay() {
        if (isPlaying.value) {
            audio.pause()
        } else {
            audio.play()
        }
        isPlaying.value = !isPlaying.value
    }

    function getNextSongIndex() {
        if (!currentSong.value || queue.value.length === 0) return -1
        const currentIndex = queue.value.findIndex(s => s.id === currentSong.value.id)
        if (currentIndex === -1) return -1

        if (isShuffle.value) {
            let nextIndex = Math.floor(Math.random() * queue.value.length)
            while (nextIndex === currentIndex && queue.value.length > 1) {
                nextIndex = Math.floor(Math.random() * queue.value.length)
            }
            return nextIndex
        } else {
            const nextIndex = currentIndex + 1
            if (nextIndex >= queue.value.length) {
                return loopMode.value === 1 ? 0 : -1 // Loop All wraps around
            }
            return nextIndex
        }
    }

    function next(autoAdvance = false) {
        const nextIndex = getNextSongIndex()

        if (autoAdvance && nextIndex === -1) {
            isPlaying.value = false
            return
        }

        if (nextIndex !== -1) {
            play(queue.value[nextIndex])
        } else if (loopMode.value === 1 && queue.value.length > 0) {
            play(queue.value[0])
        } else {
            isPlaying.value = false
        }
    }

    function prev() {
        if (audio.currentTime > 3) {
            audio.currentTime = 0
            return
        }

        if (!currentSong.value || queue.value.length === 0) return
        const currentIndex = queue.value.findIndex(s => s.id === currentSong.value.id)
        if (currentIndex === -1) return

        let prevIndex = currentIndex - 1
        if (prevIndex < 0) prevIndex = queue.value.length - 1

        play(queue.value[prevIndex])
    }

    function seek(time) {
        audio.currentTime = time
    }

    function toggleShuffle() {
        isShuffle.value = !isShuffle.value
    }

    function toggleLoop() {
        loopMode.value = (loopMode.value + 1) % 3
    }

    return {
        currentSong,
        isPlaying,
        duration,
        currentTime,
        isShuffle,
        loopMode,
        queue,
        play,
        playContext,
        togglePlay,
        next,
        prev,
        seek,
        toggleShuffle,
        toggleLoop
    }
})
