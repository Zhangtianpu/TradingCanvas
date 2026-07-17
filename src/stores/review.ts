import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DailyReview } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<DailyReview[]>(loadData().reviews)

  function persist() {
    const data = loadData()
    data.reviews = reviews.value
    saveData(data)
  }

  function addOrUpdateReview(review: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>) {
    const existing = reviews.value.find(r => r.date === review.date)
    const now = new Date().toISOString()
    if (existing) {
      Object.assign(existing, { ...review, updatedAt: now })
    } else {
      reviews.value.push({ ...review, id: generateId(), createdAt: now, updatedAt: now })
    }
    persist()
  }

  function deleteReview(id: string) {
    reviews.value = reviews.value.filter(r => r.id !== id)
    persist()
  }

  function getReviewByDate(date: string) {
    return reviews.value.find(r => r.date === date)
  }

  function reload() {
    reviews.value = loadData().reviews
  }

  return { reviews, addOrUpdateReview, deleteReview, getReviewByDate, reload }
})
