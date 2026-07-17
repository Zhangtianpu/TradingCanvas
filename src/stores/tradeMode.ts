import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CustomTradeMode } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useTradeModeStore = defineStore('tradeMode', () => {
  const tradeModes = ref<CustomTradeMode[]>(loadData().tradeModes || [])

  function persist() {
    const data = loadData()
    data.tradeModes = tradeModes.value
    saveData(data)
  }

  function addMode(name: string, color: string, description: string = '') {
    const mode: CustomTradeMode = {
      id: generateId(),
      name,
      color,
      description,
      createdAt: new Date().toISOString()
    }
    tradeModes.value.push(mode)
    persist()
    return mode
  }

  function updateMode(id: string, updates: Partial<CustomTradeMode>) {
    const idx = tradeModes.value.findIndex(m => m.id === id)
    if (idx !== -1) {
      tradeModes.value[idx] = { ...tradeModes.value[idx], ...updates }
      persist()
    }
  }

  function deleteMode(id: string) {
    tradeModes.value = tradeModes.value.filter(m => m.id !== id)
    persist()
  }

  function getMode(id: string) {
    return tradeModes.value.find(m => m.id === id)
  }

  function reload() {
    tradeModes.value = loadData().tradeModes || []
  }

  return {
    tradeModes,
    addMode,
    updateMode,
    deleteMode,
    getMode,
    reload
  }
})