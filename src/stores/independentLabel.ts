import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IndependentLabel, IndependentLabelCategory } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const INDEPENDENT_LABEL_COLOR_POOL = [
  '#f85149', '#3fb950', '#58a6ff', '#f0c040', '#a371f7',
  '#f0883e', '#8b949e', '#ff7b72', '#79c0ff', '#d2a8ff',
  '#ffc658', '#56d364', '#ffa657', '#a5d6ff'
]

export const LABEL_CATEGORY_OPTIONS: Array<{ key: IndependentLabelCategory; label: string }> = [
  { key: 'position', label: '身位' },
  { key: 'status', label: '状态' },
  { key: 'fund', label: '资金性质' }
]

function categoryLabel(category: IndependentLabelCategory): string {
  return LABEL_CATEGORY_OPTIONS.find(c => c.key === category)?.label || category
}

export const useIndependentLabelStore = defineStore('independentLabel', () => {
  const labels = ref<IndependentLabel[]>(loadData().independentLabels || [])

  function persist() {
    const data = loadData()
    data.independentLabels = labels.value
    saveData(data)
  }

  const sortedLabels = computed(() => {
    const order: IndependentLabelCategory[] = ['position', 'status', 'fund']
    return [...labels.value].sort((a, b) => {
      const diff = order.indexOf(a.category) - order.indexOf(b.category)
      if (diff !== 0) return diff
      return a.createdAt.localeCompare(b.createdAt)
    })
  })

  function labelsByCategory(category: IndependentLabelCategory) {
    return computed(() => sortedLabels.value.filter(l => l.category === category))
  }

  function getByKey(category: IndependentLabelCategory, key: string) {
    return labels.value.find(l => l.category === category && l.key === key) || null
  }

  function getName(category: IndependentLabelCategory, key: string) {
    return getByKey(category, key)?.name || key
  }

  function getColor(category: IndependentLabelCategory, key: string) {
    return getByKey(category, key)?.color || '#8b949e'
  }

  function options(category: IndependentLabelCategory) {
    return computed(() => sortedLabels.value
      .filter(l => l.category === category)
      .map(l => ({ value: l.key, name: l.name, color: l.color })))
  }

  function randomColor() {
    return INDEPENDENT_LABEL_COLOR_POOL[Math.floor(Math.random() * INDEPENDENT_LABEL_COLOR_POOL.length)]
  }

  function addLabel(payload: { category: IndependentLabelCategory; name: string; color?: string; description?: string }) {
    const now = new Date().toISOString()
    const label: IndependentLabel = {
      id: generateId(),
      category: payload.category,
      key: payload.category + '_' + Date.now(),
      name: payload.name,
      color: payload.color || randomColor(),
      description: payload.description || '',
      isDefault: false,
      createdAt: now
    }
    labels.value.push(label)
    persist()
    return label
  }

  function updateLabel(id: string, updates: Partial<Omit<IndependentLabel, 'id' | 'createdAt' | 'isDefault' | 'category'>>) {
    const idx = labels.value.findIndex(l => l.id === id)
    if (idx !== -1) {
      labels.value[idx] = { ...labels.value[idx], ...updates }
      persist()
    }
  }

  function deleteLabel(id: string) {
    const label = labels.value.find(l => l.id === id)
    if (!label || label.isDefault) return
    labels.value = labels.value.filter(l => l.id !== id)
    persist()
  }

  function reload() {
    labels.value = loadData().independentLabels || []
  }

  return {
    labels,
    sortedLabels,
    labelsByCategory,
    getByKey,
    getName,
    getColor,
    options,
    randomColor,
    addLabel,
    updateLabel,
    deleteLabel,
    reload,
    categoryLabel
  }
})
