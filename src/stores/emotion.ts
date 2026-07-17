import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EmotionDaily } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useEmotionStore = defineStore('emotion', () => {
  const emotions = ref<EmotionDaily[]>(loadData().emotions)

  function persist() {
    const data = loadData()
    data.emotions = emotions.value
    saveData(data)
  }

  const sortedEmotions = computed(() => {
    return [...emotions.value].sort((a, b) => b.date.localeCompare(a.date))
  })

  const latestEmotion = computed(() => {
    return sortedEmotions.value[0] || null
  })

  function addOrUpdateEmotion(emotion: Omit<EmotionDaily, 'id'>) {
    const existing = emotions.value.find(e => e.date === emotion.date)
    if (existing) {
      Object.assign(existing, emotion)
    } else {
      emotions.value.push({ ...emotion, id: generateId() })
    }
    persist()
  }

  function deleteEmotion(id: string) {
    emotions.value = emotions.value.filter(e => e.id !== id)
    persist()
  }

  function getEmotionByDate(date: string) {
    return emotions.value.find(e => e.date === date)
  }

  function reload() {
    emotions.value = loadData().emotions
  }

  return { emotions, sortedEmotions, latestEmotion, addOrUpdateEmotion, deleteEmotion, getEmotionByDate, reload }
})
