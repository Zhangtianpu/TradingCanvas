import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { EmotionClusterEntry, EmotionClusterTarget } from '@/types'
import { generateId, loadData, saveData } from '@/composables/useStorage'

interface LegacyClusterEntry {
  trend?: string
  changePercent?: number | null
}

interface LegacyClusterTarget {
  id?: string
  name?: string
  entries?: Record<string, LegacyClusterEntry>
}

const LEGACY_MIGRATION_KEY = 'emotionClusterLegacyMigrated'

export const useEmotionClusterStore = defineStore('emotionCluster', () => {
  const targets = ref<EmotionClusterTarget[]>(loadData().emotionClusters || [])

  function persist() {
    const data = loadData()
    data.emotionClusters = targets.value
    saveData(data)
  }

  function migrateLegacyStairData() {
    if (localStorage.getItem(LEGACY_MIGRATION_KEY)) return
    const now = new Date().toISOString()
    const legacyTargets: LegacyClusterTarget[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (!key?.startsWith('stairChartCluster_')) continue
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]')
        if (Array.isArray(parsed)) legacyTargets.push(...parsed)
      } catch {
        // 单个旧键损坏不影响其他数据迁移。
      }
    }

    for (const legacy of legacyTargets) {
      const name = legacy.name?.trim()
      if (!name) continue
      let target = targets.value.find(item => item.name === name)
      if (!target) {
        target = {
          id: legacy.id || generateId(),
          name,
          note: '',
          entries: {},
          createdAt: now,
          updatedAt: now
        }
        targets.value.push(target)
      }
      for (const [date, entry] of Object.entries(legacy.entries || {})) {
        if (target.entries[date]) continue
        target.entries[date] = {
          date,
          trend: entry.trend || '',
          changePercent: typeof entry.changePercent === 'number' ? entry.changePercent : null,
          note: '',
          updatedAt: now
        }
      }
    }
    if (legacyTargets.length) persist()
    localStorage.setItem(LEGACY_MIGRATION_KEY, '1')
  }

  function addTarget(payload: Pick<EmotionClusterTarget, 'name' | 'code' | 'theme' | 'note'>) {
    const name = payload.name.trim()
    if (!name) return null
    const existing = targets.value.find(item => item.name === name)
    if (existing) return existing
    const now = new Date().toISOString()
    const target: EmotionClusterTarget = {
      id: generateId(),
      name,
      code: payload.code?.trim() || undefined,
      theme: payload.theme?.trim() || undefined,
      note: payload.note.trim(),
      entries: {},
      createdAt: now,
      updatedAt: now
    }
    targets.value.push(target)
    persist()
    return target
  }

  function updateTarget(id: string, updates: Pick<EmotionClusterTarget, 'name' | 'code' | 'theme' | 'note'>) {
    const target = targets.value.find(item => item.id === id)
    if (!target) return
    target.name = updates.name.trim()
    target.code = updates.code?.trim() || undefined
    target.theme = updates.theme?.trim() || undefined
    target.note = updates.note.trim()
    target.updatedAt = new Date().toISOString()
    persist()
  }

  function deleteTarget(id: string) {
    targets.value = targets.value.filter(item => item.id !== id)
    persist()
  }

  function archiveTarget(id: string) {
    const target = targets.value.find(item => item.id === id)
    if (!target || target.archivedAt) return false
    const now = new Date().toISOString()
    target.archivedAt = now
    target.updatedAt = now
    const remaining = targets.value.filter(item => item.id !== id)
    targets.value = [
      ...remaining.filter(item => !item.archivedAt),
      ...remaining.filter(item => item.archivedAt),
      target
    ]
    persist()
    return true
  }

  function restoreTarget(id: string) {
    const target = targets.value.find(item => item.id === id)
    if (!target || !target.archivedAt) return false
    target.archivedAt = undefined
    target.updatedAt = new Date().toISOString()
    const remaining = targets.value.filter(item => item.id !== id)
    targets.value = [
      ...remaining.filter(item => !item.archivedAt),
      target,
      ...remaining.filter(item => item.archivedAt)
    ]
    persist()
    return true
  }

  function moveTarget(id: string, direction: 'up' | 'down') {
    const active = targets.value.filter(item => !item.archivedAt)
    const archived = targets.value.filter(item => item.archivedAt)
    const index = active.findIndex(item => item.id === id)
    if (index < 0) return false
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= active.length) return false
    const reordered = [...active]
    const [target] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, target)
    targets.value = [...reordered, ...archived]
    persist()
    return true
  }

  function saveEntry(targetId: string, date: string, payload: Pick<EmotionClusterEntry, 'trend' | 'changePercent' | 'note'>) {
    const target = targets.value.find(item => item.id === targetId)
    if (!target) return
    const now = new Date().toISOString()
    target.entries[date] = {
      date,
      trend: payload.trend.trim(),
      changePercent: payload.changePercent,
      note: payload.note.trim(),
      updatedAt: now
    }
    target.updatedAt = now
    persist()
  }

  function clearEntry(targetId: string, date: string) {
    const target = targets.value.find(item => item.id === targetId)
    if (!target) return
    delete target.entries[date]
    target.updatedAt = new Date().toISOString()
    persist()
  }

  const totalEntries = computed(() => targets.value.reduce((sum, target) => sum + Object.keys(target.entries).length, 0))
  const recordDates = computed(() => [...new Set(targets.value.flatMap(target => Object.keys(target.entries)))].sort((a, b) => b.localeCompare(a)))
  const activeTargets = computed(() => targets.value.filter(target => !target.archivedAt))
  const archivedTargets = computed(() => targets.value
    .filter(target => target.archivedAt)
    .sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || '')))

  migrateLegacyStairData()

  return {
    targets,
    activeTargets,
    archivedTargets,
    totalEntries,
    recordDates,
    addTarget,
    updateTarget,
    deleteTarget,
    archiveTarget,
    restoreTarget,
    moveTarget,
    saveEntry,
    clearEntry
  }
})
