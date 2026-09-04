import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IndependentTarget, IndependentFlowEvent, IndependentStage, IndependentPosition, IndependentStatus } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

function normalizePosition(value: string): IndependentPosition {
  if (value === 'catchup' || value === 'low') return 'catchup'
  if (value === 'leader' || value === 'mid' || value === 'high') return 'leader'
  return value
}

function normalizeStatus(value: string): IndependentStatus {
  const map: Record<string, IndependentStatus> = {
    start: 'board',
    run: 'board',
    flat: 'divergence',
    weak: 'divergence',
    end: 'end',
    board: 'board',
    breakRebound: 'breakRebound',
    divergence: 'divergence',
    limitRepair: 'limitRepair',
    avoidAlert: 'avoidAlert'
  }
  return map[value] ?? value
}

type TargetInput = Omit<IndependentTarget, 'id' | 'createdAt' | 'updatedAt'>

function migrateTarget(target: TargetInput): TargetInput {
  const rawStages = target.stages && target.stages.length > 0 ? target.stages : []
  const stages: IndependentStage[] = rawStages.length > 0
    ? rawStages.map(s => ({
        id: s.id,
        date: s.date,
        status: normalizeStatus((s as any).status)
      }))
    : [{ id: generateId(), date: target.startDate, status: normalizeStatus(target.status) }]
  return {
    ...target,
    position: normalizePosition(target.position),
    status: normalizeStatus(target.status),
    stages
  }
}

export const useIndependentTargetStore = defineStore('independentTarget', () => {
  const rawTargets = loadData().independentTargets || []
  const targets = ref<IndependentTarget[]>(rawTargets.map(t => migrateTarget(t) as IndependentTarget))

  function persist() {
    const data = loadData()
    data.independentTargets = targets.value
    saveData(data)
  }

  const sortedTargets = computed(() => {
    return [...targets.value].sort((a, b) => {
      const aEnded = !!a.endDate
      const bEnded = !!b.endDate
      if (aEnded !== bEnded) return aEnded ? 1 : -1
      return a.startDate.localeCompare(b.startDate)
    })
  })

  

  function syncStageFields(target: TargetInput): TargetInput {
    const stages = [...(target.stages || [])].sort((a, b) => a.date.localeCompare(b.date))
    if (stages.length === 0) return target
    const first = stages[0]
    const last = stages[stages.length - 1]
    return {
      ...target,
      stages,
      startDate: first.date,
      position: target.position,
      status: last.status,
      endDate: target.endDate || undefined
    }
  }

  function createTarget(target: Omit<IndependentTarget, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const migrated = migrateTarget({
      ...target,
      stages: target.stages && target.stages.length > 0
        ? target.stages
        : [{ id: generateId(), date: target.startDate, status: target.status }]
    })
    const normalized = syncStageFields(migrated)
    const item: IndependentTarget = {
      ...normalized,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    targets.value.push(item)
    persist()
    return item
  }

  function updateTarget(id: string, updates: Partial<Omit<IndependentTarget, 'id' | 'createdAt' | 'updatedAt'>>) {
    const idx = targets.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      const existing = targets.value[idx]
      const migrated = migrateTarget({
        ...existing,
        ...updates,
        stages: updates.stages || existing.stages || []
      })
      const merged = syncStageFields(migrated)
      targets.value[idx] = {
        ...existing,
        ...merged,
        updatedAt: new Date().toISOString()
      }
      persist()
    }
  }

  function deleteTarget(id: string) {
    targets.value = targets.value.filter(t => t.id !== id)
    persist()
  }

  function addEvent(id: string, event: Omit<IndependentFlowEvent, 'id'>) {
    const target = targets.value.find(t => t.id === id)
    if (target) {
      target.events.push({ ...event, id: generateId() })
      target.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function deleteEvent(id: string, eventId: string) {
    const target = targets.value.find(t => t.id === id)
    if (target) {
      target.events = target.events.filter(e => e.id !== eventId)
      target.updatedAt = new Date().toISOString()
      persist()
    }
  }

  return {
    targets,
    sortedTargets,
    createTarget,
    updateTarget,
    deleteTarget,
    addEvent,
    deleteEvent
  }
})
