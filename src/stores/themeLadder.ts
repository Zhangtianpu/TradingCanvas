import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ThemeLadderEntry, ThemeLadderStock, ThemeLadderTopic } from '@/types'
import { generateId, loadData, saveData } from '@/composables/useStorage'

export const useThemeLadderStore = defineStore('themeLadder', () => {
  const topics = ref<ThemeLadderTopic[]>(loadData().themeLadders || [])

  function persist() {
    const data = loadData()
    data.themeLadders = topics.value
    saveData(data)
  }

  function addTopic(name: string) {
    const normalized = name.trim()
    if (!normalized) return null
    const existing = topics.value.find(topic => topic.name === normalized)
    if (existing) return existing
    const now = new Date().toISOString()
    const topic: ThemeLadderTopic = {
      id: generateId(),
      name: normalized,
      note: '',
      entries: {},
      createdAt: now,
      updatedAt: now
    }
    topics.value.push(topic)
    persist()
    return topic
  }

  function deleteTopic(id: string) {
    topics.value = topics.value.filter(topic => topic.id !== id)
    persist()
  }

  function moveTopic(id: string, direction: 'up' | 'down') {
    const index = topics.value.findIndex(topic => topic.id === id)
    if (index < 0) return false
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= topics.value.length) return false
    const reordered = [...topics.value]
    const [topic] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, topic)
    topics.value = reordered
    persist()
    return true
  }

  function saveEntry(topicId: string, date: string, payload: Omit<ThemeLadderEntry, 'date' | 'updatedAt'>) {
    const topic = topics.value.find(item => item.id === topicId)
    if (!topic) return
    const now = new Date().toISOString()
    topic.entries[date] = {
      date,
      content: payload.content?.trim(),
      stocks: payload.stocks.map(stock => ({ ...stock })),
      heightCounts: { ...(payload.heightCounts || {}) },
      limitUpCount: payload.limitUpCount,
      marketRank: payload.marketRank,
      note: payload.note.trim(),
      updatedAt: now
    }
    topic.updatedAt = now
    persist()
  }

  function clearEntry(topicId: string, date: string) {
    const topic = topics.value.find(item => item.id === topicId)
    if (!topic) return
    delete topic.entries[date]
    topic.updatedAt = new Date().toISOString()
    persist()
  }

  function sortedStocks(entry?: ThemeLadderEntry): ThemeLadderStock[] {
    if (!entry) return []
    const roleWeight = { leader: 0, branchLeader: 1, normal: 2 }
    return [...entry.stocks].sort((a, b) =>
      b.height - a.height || Number(b.isUnique) - Number(a.isUnique) || roleWeight[a.role] - roleWeight[b.role]
    )
  }

  const recordDates = computed(() => [...new Set(topics.value.flatMap(topic => Object.keys(topic.entries)))].sort())

  return { topics, recordDates, addTopic, deleteTopic, moveTopic, saveEntry, clearEntry, sortedStocks }
})
