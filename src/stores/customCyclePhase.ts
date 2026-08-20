import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CustomCyclePhase } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

// 预设颜色池（用于随机配色）
export const CYCLE_PHASE_COLOR_POOL = [
  '#3fb950', '#f85149', '#a371f7', '#8b949e', '#58a6ff',
  '#f0c040', '#f0883e', '#7ee787', '#ff7b72', '#79c0ff',
  '#d2a8ff', '#ffc658', '#56d364', '#ffa657'
]

export const useCustomCyclePhaseStore = defineStore('customCyclePhase', () => {
  const phases = ref<CustomCyclePhase[]>(loadData().customCyclePhases || [])

  function persist() {
    const data = loadData()
    data.customCyclePhases = phases.value
    saveData(data)
  }

  // 按创建时间排序
  const sortedPhases = computed(() => {
    return [...phases.value].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  })

  function getById(id: string) {
    return phases.value.find(p => p.id === id) || null
  }

  function getByKey(key: string) {
    return phases.value.find(p => p.key === key) || null
  }

  // 根据 key 获取显示名称（用于历史记录显示）
  function getLabelByKey(key: string): string {
    return getByKey(key)?.name || key
  }

  // 根据 key 获取颜色
  function getColorByKey(key: string): string {
    return getByKey(key)?.color || '#8b949e'
  }

  // 获取所有可选项（用于下拉选择）
  const options = computed(() => {
    return sortedPhases.value.map(p => ({ value: p.key, label: p.name, color: p.color }))
  })

  function randomColor(): string {
    return CYCLE_PHASE_COLOR_POOL[Math.floor(Math.random() * CYCLE_PHASE_COLOR_POOL.length)]
  }

  function addPhase(payload: { name: string; color?: string; description?: string }): CustomCyclePhase {
    const now = new Date().toISOString()
    const key = `cp_${Date.now()}`
    const phase: CustomCyclePhase = {
      id: generateId(),
      key,
      name: payload.name,
      color: payload.color || randomColor(),
      description: payload.description || '',
      isDefault: false,
      createdAt: now
    }
    phases.value.push(phase)
    persist()
    return phase
  }

  function updatePhase(id: string, updates: Partial<Omit<CustomCyclePhase, 'id' | 'createdAt' | 'isDefault'>>) {
    const idx = phases.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      phases.value[idx] = { ...phases.value[idx], ...updates }
      persist()
    }
  }

  function deletePhase(id: string) {
    const phase = phases.value.find(p => p.id === id)
    if (phase?.isDefault) return // 默认项不可删除
    phases.value = phases.value.filter(p => p.id !== id)
    persist()
  }

  function reload() {
    phases.value = loadData().customCyclePhases || []
  }

  return {
    phases,
    sortedPhases,
    options,
    getById,
    getByKey,
    getLabelByKey,
    getColorByKey,
    randomColor,
    addPhase,
    updatePhase,
    deletePhase,
    reload
  }
})
