import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CustomTradeStyle } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

// 预设颜色池（用于随机配色）
export const TRADE_STYLE_COLOR_POOL = [
  '#58a6ff', '#f0c040', '#f85149', '#3fb950', '#a371f7',
  '#f0883e', '#7ee787', '#ff7b72', '#79c0ff', '#d2a8ff',
  '#ffc658', '#56d364', '#ffa657', '#a5d6ff'
]

export const useCustomTradeStyleStore = defineStore('customTradeStyle', () => {
  const styles = ref<CustomTradeStyle[]>(loadData().customTradeStyles || [])

  function persist() {
    const data = loadData()
    data.customTradeStyles = styles.value
    saveData(data)
  }

  // 按创建时间排序
  const sortedStyles = computed(() => {
    return [...styles.value].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  })

  function getById(id: string) {
    return styles.value.find(s => s.id === id) || null
  }

  function getByKey(key: string) {
    return styles.value.find(s => s.key === key) || null
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
    return sortedStyles.value.map(s => ({ value: s.key, label: s.name, color: s.color }))
  })

  function randomColor(): string {
    return TRADE_STYLE_COLOR_POOL[Math.floor(Math.random() * TRADE_STYLE_COLOR_POOL.length)]
  }

  function addStyle(payload: { name: string; color?: string; description?: string }): CustomTradeStyle {
    const now = new Date().toISOString()
    const key = `ts_${Date.now()}`
    const style: CustomTradeStyle = {
      id: generateId(),
      key,
      name: payload.name,
      color: payload.color || randomColor(),
      description: payload.description || '',
      isDefault: false,
      createdAt: now
    }
    styles.value.push(style)
    persist()
    return style
  }

  function updateStyle(id: string, updates: Partial<Omit<CustomTradeStyle, 'id' | 'createdAt' | 'isDefault'>>) {
    const idx = styles.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      styles.value[idx] = { ...styles.value[idx], ...updates }
      persist()
    }
  }

  function deleteStyle(id: string) {
    const style = styles.value.find(s => s.id === id)
    if (style?.isDefault) return // 默认项不可删除
    styles.value = styles.value.filter(s => s.id !== id)
    persist()
  }

  function reload() {
    styles.value = loadData().customTradeStyles || []
  }

  return {
    styles,
    sortedStyles,
    options,
    getById,
    getByKey,
    getLabelByKey,
    getColorByKey,
    randomColor,
    addStyle,
    updateStyle,
    deleteStyle,
    reload
  }
})
