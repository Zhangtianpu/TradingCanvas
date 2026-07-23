import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TradeStyle, TradeStyleHistory, CyclePhase, CyclePhaseHistory } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useCycleStore = defineStore('cycle', () => {
  const tradeStyleHistory = ref<TradeStyleHistory[]>(loadData().tradeStyleHistory || [])
  const cyclePhaseHistory = ref<CyclePhaseHistory[]>(loadData().cyclePhaseHistory || [])

  function persist() {
    const data = loadData()
    data.tradeStyleHistory = tradeStyleHistory.value
    data.cyclePhaseHistory = cyclePhaseHistory.value
    saveData(data)
  }

  // 按日期排序的历史记录
  const sortedTradeStyleHistory = computed(() => {
    return [...tradeStyleHistory.value].sort((a, b) => a.date.localeCompare(b.date))
  })

  const sortedCyclePhaseHistory = computed(() => {
    return [...cyclePhaseHistory.value].sort((a, b) => a.date.localeCompare(b.date))
  })

  // 当前交易风格（最后一条记录）
  const currentTradeStyle = computed(() => {
    if (sortedTradeStyleHistory.value.length === 0) return null
    return sortedTradeStyleHistory.value[sortedTradeStyleHistory.value.length - 1]
  })

  // 当前情绪周期（最后一条记录）
  const currentCyclePhase = computed(() => {
    if (sortedCyclePhaseHistory.value.length === 0) return null
    return sortedCyclePhaseHistory.value[sortedCyclePhaseHistory.value.length - 1]
  })

  function addTradeStyle(style: TradeStyle, date: string) {
    tradeStyleHistory.value.push({
      id: generateId(),
      style,
      date
    })
    persist()
  }

  function updateTradeStyle(id: string, updates: Partial<TradeStyleHistory>) {
    const idx = tradeStyleHistory.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      tradeStyleHistory.value[idx] = { ...tradeStyleHistory.value[idx], ...updates }
      persist()
    }
  }

  function deleteTradeStyle(id: string) {
    tradeStyleHistory.value = tradeStyleHistory.value.filter(t => t.id !== id)
    persist()
  }

  function addCyclePhase(phase: CyclePhase, date: string) {
    cyclePhaseHistory.value.push({
      id: generateId(),
      phase,
      date
    })
    persist()
  }

  function updateCyclePhase(id: string, updates: Partial<CyclePhaseHistory>) {
    const idx = cyclePhaseHistory.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      cyclePhaseHistory.value[idx] = { ...cyclePhaseHistory.value[idx], ...updates }
      persist()
    }
  }

  function deleteCyclePhase(id: string) {
    cyclePhaseHistory.value = cyclePhaseHistory.value.filter(t => t.id !== id)
    persist()
  }

  function reload() {
    const data = loadData()
    tradeStyleHistory.value = data.tradeStyleHistory || []
    cyclePhaseHistory.value = data.cyclePhaseHistory || []
  }

  return {
    tradeStyleHistory,
    cyclePhaseHistory,
    sortedTradeStyleHistory,
    sortedCyclePhaseHistory,
    currentTradeStyle,
    currentCyclePhase,
    addTradeStyle,
    updateTradeStyle,
    deleteTradeStyle,
    addCyclePhase,
    updateCyclePhase,
    deleteCyclePhase,
    reload
  }
})
