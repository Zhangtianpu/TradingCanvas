import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { EmotionAnchorDaily, EmotionAnchorItem, EmotionAnchorLevel, EmotionAnchorSettings } from '@/types'
import { generateId, getDefaultEmotionAnchorSettings, loadData, saveData } from '@/composables/useStorage'

export type MarketEmotionLabel = '强修复' | '弱修复' | '弱分歧' | '强分歧'

function localDateString() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export const useEmotionAnchorStore = defineStore('emotionAnchor', () => {
  const records = ref<EmotionAnchorDaily[]>(loadData().emotionAnchors || [])
  const settings = ref<EmotionAnchorSettings>({
    ...getDefaultEmotionAnchorSettings(),
    ...loadData().emotionAnchorSettings
  })

  function persist() {
    const data = loadData()
    data.emotionAnchors = records.value
    data.emotionAnchorSettings = settings.value
    saveData(data)
  }

  function updateSettings(next: EmotionAnchorSettings) {
    settings.value = { ...next }
    persist()
  }

  function resetSettings() {
    settings.value = getDefaultEmotionAnchorSettings()
    persist()
  }

  function ensureRecord(date = localDateString()) {
    let record = records.value.find(item => item.date === date)
    if (!record) {
      const now = new Date().toISOString()
      record = {
        id: generateId(),
        date,
        items: [],
        closingNote: '',
        createdAt: now,
        updatedAt: now
      }
      records.value.push(record)
      persist()
    }
    return record
  }

  function addAnchor(date: string, payload: Pick<EmotionAnchorItem, 'name' | 'code' | 'theme' | 'openingLevel' | 'note'>) {
    const record = ensureRecord(date)
    const now = new Date().toISOString()
    record.items.push({ ...payload, id: generateId(), createdAt: now, updatedAt: now })
    record.updatedAt = now
    persist()
  }

  function updateAnchor(date: string, id: string, updates: Pick<EmotionAnchorItem, 'name' | 'code' | 'theme' | 'note'>) {
    const record = records.value.find(item => item.date === date)
    const anchor = record?.items.find(item => item.id === id)
    if (!record || !anchor) return
    Object.assign(anchor, updates, { updatedAt: new Date().toISOString() })
    record.updatedAt = anchor.updatedAt
    persist()
  }

  function updateOpeningLevel(date: string, id: string, openingLevel: EmotionAnchorLevel) {
    const record = records.value.find(item => item.date === date)
    const anchor = record?.items.find(item => item.id === id)
    if (!record || !anchor) return
    anchor.openingLevel = openingLevel
    anchor.updatedAt = new Date().toISOString()
    record.updatedAt = anchor.updatedAt
    persist()
  }

  function updateClosingLevel(date: string, id: string, closingLevel?: EmotionAnchorLevel) {
    const record = records.value.find(item => item.date === date)
    const anchor = record?.items.find(item => item.id === id)
    if (!record || !anchor) return
    anchor.closingLevel = closingLevel
    anchor.updatedAt = new Date().toISOString()
    record.updatedAt = anchor.updatedAt
    persist()
  }

  function deleteAnchor(date: string, id: string) {
    const record = records.value.find(item => item.date === date)
    if (!record) return
    record.items = record.items.filter(item => item.id !== id)
    record.updatedAt = new Date().toISOString()
    persist()
  }

  function finalizeDay(date: string, closingNote: string) {
    const record = ensureRecord(date)
    record.closingNote = closingNote
    record.finalizedAt = new Date().toISOString()
    record.updatedAt = record.finalizedAt
    persist()
  }

  function reopenDay(date: string) {
    const record = records.value.find(item => item.date === date)
    if (!record) return
    record.finalizedAt = undefined
    record.updatedAt = new Date().toISOString()
    persist()
  }

  function stats(record?: EmotionAnchorDaily) {
    const items = record?.items || []
    const above = items.filter(item => item.openingLevel === 'above').length
    const match = items.filter(item => item.openingLevel === 'match').length
    const below = items.filter(item => item.openingLevel === 'below').length
    const totalScore = items.reduce((sum, item) => {
      if (item.openingLevel === 'above') return sum + settings.value.aboveScore
      if (item.openingLevel === 'match') return sum + settings.value.matchScore
      return sum + settings.value.belowScore
    }, 0)
    const score = items.length ? Math.round(totalScore / items.length) : settings.value.matchScore
    const label: MarketEmotionLabel = score >= settings.value.strongRepairMin
      ? '强修复'
      : score >= settings.value.weakRepairMin
        ? '弱修复'
        : score >= settings.value.weakDivergeMin
          ? '弱分歧'
          : '强分歧'
    const reviewed = items.filter(item => item.closingLevel !== undefined)
    const correct = reviewed.filter(item => item.closingLevel === item.openingLevel).length
    return {
      total: items.length,
      above,
      match,
      below,
      score,
      label,
      reviewed: reviewed.length,
      correct,
      accuracy: reviewed.length ? (correct / reviewed.length) * 100 : 0
    }
  }

  const sortedRecords = computed(() => [...records.value].sort((a, b) => b.date.localeCompare(a.date)))
  const overallAccuracy = computed(() => {
    const reviewed = records.value.flatMap(record => record.items).filter(item => item.closingLevel !== undefined)
    const correct = reviewed.filter(item => item.closingLevel === item.openingLevel).length
    return {
      reviewed: reviewed.length,
      correct,
      accuracy: reviewed.length ? (correct / reviewed.length) * 100 : 0
    }
  })

  return {
    records,
    settings,
    sortedRecords,
    overallAccuracy,
    ensureRecord,
    addAnchor,
    updateAnchor,
    updateOpeningLevel,
    updateClosingLevel,
    deleteAnchor,
    finalizeDay,
    reopenDay,
    updateSettings,
    resetSettings,
    stats
  }
})
