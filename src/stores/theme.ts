import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Theme, ThemeEvent } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useThemeStore = defineStore('theme', () => {
  const themes = ref<Theme[]>(loadData().themes)

  function persist() {
    const data = loadData()
    data.themes = themes.value
    saveData(data)
  }

  const sortedThemes = computed(() => {
    return [...themes.value].sort((a, b) => b.burstDate.localeCompare(a.burstDate))
  })

  function addTheme(theme: Omit<Theme, 'id' | 'events' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    // 记录初始状态
    const statusHistory = theme.statusHistory || [{ status: theme.status, date: theme.burstDate }]
    themes.value.push({
      ...theme,
      id: generateId(),
      events: [],
      statusHistory,
      createdAt: now,
      updatedAt: now
    })
    persist()
  }

  function updateTheme(id: string, updates: Partial<Theme>) {
    const idx = themes.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      themes.value[idx] = { ...themes.value[idx], ...updates, updatedAt: new Date().toISOString() }
      persist()
    }
  }

  function deleteTheme(id: string) {
    themes.value = themes.value.filter(t => t.id !== id)
    persist()
  }

  function getTheme(id: string) {
    return themes.value.find(t => t.id === id)
  }

  function addEvent(themeId: string, event: Omit<ThemeEvent, 'id'>) {
    const theme = themes.value.find(t => t.id === themeId)
    if (theme) {
      theme.events.push({ ...event, id: generateId() })
      theme.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function deleteEvent(themeId: string, eventId: string) {
    const theme = themes.value.find(t => t.id === themeId)
    if (theme) {
      theme.events = theme.events.filter(e => e.id !== eventId)
      theme.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function reload() {
    themes.value = loadData().themes
  }

  return { themes, sortedThemes, addTheme, updateTheme, deleteTheme, getTheme, addEvent, deleteEvent, reload }
})
