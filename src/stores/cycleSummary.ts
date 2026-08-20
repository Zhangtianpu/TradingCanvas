import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CycleSummary, CyclePhaseHistory, TradeStyleHistory } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useCycleSummaryStore = defineStore('cycleSummary', () => {
  const summaries = ref<CycleSummary[]>(loadData().cycleSummaries || [])

  function persist() {
    const data = loadData()
    data.cycleSummaries = summaries.value
    saveData(data)
  }

  // 按开始日期倒序（最新的周期在前）
  const sortedSummaries = computed(() => {
    return [...summaries.value].sort((a, b) => b.startDate.localeCompare(a.startDate))
  })

  // 下一个周期默认名称
  const nextCycleName = computed(() => {
    return `周期${summaries.value.length + 1}`
  })

  function getById(id: string) {
    return summaries.value.find(s => s.id === id) || null
  }

  /**
   * 创建并保存一个周期总结
   */
  function createCycle(payload: {
    name: string
    startDate: string
    endDate: string
    description?: string
    cyclePhaseSnapshot: CyclePhaseHistory[]
    tradeStyleSnapshot: TradeStyleHistory[]
  }): CycleSummary {
    const now = new Date().toISOString()
    const summary: CycleSummary = {
      id: generateId(),
      name: payload.name || nextCycleName.value,
      startDate: payload.startDate,
      endDate: payload.endDate,
      description: payload.description || '',
      summary: '',
      cyclePhaseSnapshot: payload.cyclePhaseSnapshot,
      tradeStyleSnapshot: payload.tradeStyleSnapshot,
      createdAt: now,
      updatedAt: now
    }
    summaries.value.push(summary)
    persist()
    return summary
  }

  function updateCycle(id: string, updates: Partial<Omit<CycleSummary, 'id' | 'createdAt'>>) {
    const idx = summaries.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      summaries.value[idx] = {
        ...summaries.value[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      persist()
    }
  }

  function deleteCycle(id: string) {
    summaries.value = summaries.value.filter(s => s.id !== id)
    persist()
  }

  function reload() {
    summaries.value = loadData().cycleSummaries || []
  }

  return {
    summaries,
    sortedSummaries,
    nextCycleName,
    getById,
    createCycle,
    updateCycle,
    deleteCycle,
    reload
  }
})
