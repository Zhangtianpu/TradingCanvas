import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MarketCycleRecord } from '@/types'
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

  function reload() {
    cycles.value = loadData().marketCycles || []
  }

  return { cycles, sortedCycles, activeCycle, saveCycle, deleteCycle, reload }
})
