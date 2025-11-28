import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStatsStore = defineStore('stats', () => {
  const playStats = ref({}) // { songId: { playCount: 0, lastPlayed: null, addedAt: Date.now() } }

  // Load stats on startup
  async function initialize() {
    if (window.electronAPI) {
      const stats = await window.electronAPI.getStats()
      playStats.value = stats || {}
    }
  }

  // Save stats to persistence
  async function saveStats() {
    if (window.electronAPI) {
      await window.electronAPI.saveStats(JSON.parse(JSON.stringify(playStats.value)))
    }
  }

  function trackPlay(songId) {
    if (!playStats.value[songId]) {
      playStats.value[songId] = {
        playCount: 0,
        lastPlayed: null,
        addedAt: Date.now(),
        liked: false
      }
    }

    playStats.value[songId].playCount++
    playStats.value[songId].lastPlayed = Date.now()

    // Save immediately after tracking
    saveStats()
  }

  function getSongStats(songId) {
    return playStats.value[songId] || { playCount: 0, lastPlayed: null, addedAt: Date.now(), liked: false }
  }

  // Mark songs as added (on first scan)
  function markSongsAsAdded(songIds) {
    const now = Date.now()
    let hasChanges = false

    songIds.forEach(songId => {
      if (!playStats.value[songId]) {
        playStats.value[songId] = {
          playCount: 0,
          lastPlayed: null,
          addedAt: now,
          liked: false
        }
        hasChanges = true
      }
    })

    // Save if there were any changes
    if (hasChanges) {
      saveStats()
    }
  }

  function toggleLike(songId) {
    if (!playStats.value[songId]) {
      playStats.value[songId] = {
        playCount: 0,
        lastPlayed: null,
        addedAt: Date.now(),
        liked: false
      }
    }

    playStats.value[songId].liked = !playStats.value[songId].liked
    saveStats()
  }

  return {
    playStats,
    initialize,
    trackPlay,
    getSongStats,
    markSongsAsAdded,
    toggleLike
  }
})
