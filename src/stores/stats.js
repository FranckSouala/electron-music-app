import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStatsStore = defineStore('stats', () => {
  const playStats = ref({}) // { songId: { playCount: 0, lastPlayed: null, addedAt: Date.now() } }

  // Load stats on startup
  async function initialize() {
    if (window.electronAPI) {
      const stats = await window.electronAPI.getStats()
      playStats.value = stats || {}
      console.log('Stats loaded:', Object.keys(playStats.value).length, 'songs tracked')
    }
  }

  // Save stats to persistence
  async function saveStats() {
    if (window.electronAPI) {
      await window.electronAPI.saveStats(JSON.parse(JSON.stringify(playStats.value)))
      console.log('Stats saved:', Object.keys(playStats.value).length, 'songs')
    }
  }

  function trackPlay(songId) {
    if (!playStats.value[songId]) {
      playStats.value[songId] = {
        playCount: 0,
        lastPlayed: null,
        addedAt: Date.now()
      }
    }

    playStats.value[songId].playCount++
    playStats.value[songId].lastPlayed = Date.now()

    console.log('Track play:', songId, 'count:', playStats.value[songId].playCount)

    // Save immediately after tracking
    saveStats()
  }

  function getSongStats(songId) {
    return playStats.value[songId] || { playCount: 0, lastPlayed: null, addedAt: Date.now() }
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
          addedAt: now
        }
        hasChanges = true
      }
    })

    // Save if there were any changes
    if (hasChanges) {
      saveStats()
    }
  }

  return {
    playStats,
    initialize,
    trackPlay,
    getSongStats,
    markSongsAsAdded
  }
})
