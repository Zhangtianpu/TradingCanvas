import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MarketCycleDailyTrend, MarketCycleRecord, MarketSubCycle } from '@/types'
import { generateId, loadData, saveData } from '@/composables/useStorage'

export const useMarketCycleStore = defineStore('marketCycle', () => {
  const cycles = ref<MarketCycleRecord[]>(loadData().marketCycles || [])

  const sortedCycles = computed(() => [...cycles.value].sort((a, b) => b.startDate.localeCompare(a.startDate)))
  const activeCycle = computed(() => sortedCycles.value.find(cycle => !cycle.endDate) || sortedCycles.value[0] || null)

  function persist() {
    const data = loadData()
    data.marketCycles = cycles.value
    saveData(data)
  }

  function saveCycle(payload: Omit<MarketCycleRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString()
    const existing = payload.id ? cycles.value.find(cycle => cycle.id === payload.id) : undefined
    if (existing) {
      Object.assign(existing, payload, { updatedAt: now })
      persist()
      return existing
    }

    const cycle: MarketCycleRecord = {
      ...payload,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    cycles.value.push(cycle)
    persist()
    return cycle
  }

  function deleteCycle(id: string) {
    cycles.value = cycles.value.filter(cycle => cycle.id !== id)
    persist()
  }

  function saveSubCycle(cycleId: string, payload: Omit<MarketSubCycle, 'id'> & { id?: string }) {
    const cycle = cycles.value.find(item => item.id === cycleId)
    if (!cycle) return null
    const existing = payload.id ? cycle.smallCycles.find(item => item.id === payload.id) : undefined
    if (existing) {
      Object.assign(existing, payload)
    } else {
      cycle.smallCycles.push({ ...payload, id: generateId() })
    }
    cycle.updatedAt = new Date().toISOString()
    persist()
    return cycle
  }

  function deleteSubCycle(cycleId: string, subCycleId: string) {
    const cycle = cycles.value.find(item => item.id === cycleId)
    if (!cycle) return
    cycle.smallCycles = cycle.smallCycles.filter(item => item.id !== subCycleId)
    cycle.updatedAt = new Date().toISOString()
    persist()
  }

  function saveDailyTrend(cycleId: string, subCycleId: string | undefined, date: string, payload: Omit<MarketCycleDailyTrend, 'updatedAt'>) {
    const cycle = cycles.value.find(item => item.id === cycleId)
    if (!cycle) return
    const target = subCycleId ? cycle.smallCycles.find(item => item.id === subCycleId) : cycle
    if (!target) return
    target.dailyTrends ||= {}
    if (!payload.status.trim() && !payload.note.trim()) {
      delete target.dailyTrends[date]
    } else {
      target.dailyTrends[date] = {
        status: payload.status.trim(),
        note: payload.note.trim(),
        updatedAt: new Date().toISOString()
      }
    }
    cycle.updatedAt = new Date().toISOString()
    persist()
  }

  function reload() {
    cycles.value = loadData().marketCycles || []
  }

  return { cycles, sortedCycles, activeCycle, saveCycle, deleteCycle, saveSubCycle, deleteSubCycle, saveDailyTrend, reload }
})
