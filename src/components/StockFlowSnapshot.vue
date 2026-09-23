<template>
  <div class="snapshot-flow">
    <div v-if="targets.length > 0" class="timeline-axis">
      <span>{{ formatShort(globalRange.start) }}</span>
      <span class="axis-middle"></span>
      <span>{{ formatShort(globalRange.end) }}</span>
    </div>

    <div class="target-list">
      <div v-for="target in targets" :key="target.id" class="target-item">
        <div class="target-main">
          <div class="target-meta">
            <div class="name-line">
              <span class="target-name">{{ target.name }}</span>
              <span v-if="target.code" class="target-code">{{ target.code }}</span>
            </div>
            <div class="fund-line">
              <span class="flow-tag" :style="tagStyle('position', target.position)">{{ labelName('position', target.position) }}</span>
              <span v-for="fund in target.fundTags" :key="fund" class="flow-tag" :style="tagStyle('fund', fund)">{{ labelName('fund', fund) }}</span>
            </div>
          </div>

          <div class="lane-zone">
            <div class="target-lane">
              <div
                v-for="seg in laneSegments(target)"
                :key="seg.stage.id"
                class="lane-segment"
                :style="{ left: seg.left + '%', width: seg.width + '%', background: labelColor('status', seg.stage.status) }"
                :title="`${labelName('status', seg.stage.status)} ${seg.start} ~ ${seg.end}`"
              ></div>
            </div>
          </div>
        </div>

        <div class="stage-chain">
          <template v-for="(stage, idx) in getStages(target)" :key="stage.id">
            <div class="stage-node" :style="tagStyle('status', stage.status)">
              <span class="stage-name">{{ labelName('status', stage.status) }}</span>
              <span class="stage-date">{{ stage.date.slice(5) }} ~ {{ getStageEnd(target, idx).slice(5) }}</span>
              <span class="stage-days">{{ countTradingDays(stage.date, getStageEnd(target, idx)) }}日</span>
            </div>
            <span v-if="idx < getStages(target).length - 1" class="stage-arrow">→</span>
          </template>
        </div>

        <div v-if="target.events.length > 0" class="flow-events">
          <span v-for="event in sortedEvents(target.events)" :key="event.id" class="flow-event">
            <span class="fe-date">{{ event.date.slice(5) }}</span>
            <span>{{ eventKindLabel(event.kind) }}</span>
            <span v-if="event.content" class="fe-content">{{ event.content }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { today } from '@/composables/useDate'
import type { IndependentTarget, IndependentStage, IndependentLabel, IndependentLabelCategory, IndependentFlowKind, IndependentFlowEvent } from '@/types'

const props = defineProps<{
  targets: IndependentTarget[]
  labels: IndependentLabel[]
}>()

const KIND_LABELS: Record<IndependentFlowKind, string> = {
  breakout: '突破前高',
  rebound: '反包修复',
  custom: '备注'
}

function labelInfo(category: IndependentLabelCategory, key: string) {
  return props.labels.find(l => l.category === category && l.key === key)
}

function labelName(category: IndependentLabelCategory, key: string) {
  return labelInfo(category, key)?.name || key
}

function labelColor(category: IndependentLabelCategory, key: string) {
  return labelInfo(category, key)?.color || '#8b949e'
}

function tagStyle(category: IndependentLabelCategory, key: string) {
  const color = labelColor(category, key)
  return {
    color,
    background: color + '22',
    borderColor: color + '55'
  }
}

function getStages(target: IndependentTarget): IndependentStage[] {
  if (target.stages && target.stages.length > 0) {
    return [...target.stages].sort((a, b) => a.date.localeCompare(b.date))
  }
  return [{
    id: target.id + '-stage',
    date: target.startDate,
    status: target.status
  }]
}

function previousTradingDay(date: string): string {
  const cursor = new Date(date)
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() - 1)
  }
  return cursor.toISOString().slice(0, 10)
}

function addTradingDays(date: string, delta: number): string {
  const direction = delta >= 0 ? 1 : -1
  let remaining = Math.abs(delta)
  const cursor = new Date(date)
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + direction)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) remaining--
  }
  return cursor.toISOString().slice(0, 10)
}

function getStageEnd(target: IndependentTarget, idx: number): string {
  const stages = getStages(target)
  if (idx < stages.length - 1) {
    return previousTradingDay(addTradingDays(stages[idx + 1].date, -1))
  }
  return previousTradingDay(target.endDate || today())
}

function countTradingDays(start: string, end: string): number {
  const cursor = new Date(start)
  const last = new Date(end)
  let count = 0
  while (cursor <= last) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(count, 1)
}

const globalRange = computed(() => {
  const starts = props.targets.flatMap(t => getStages(t).map(s => s.date))
  const ends = props.targets.map(t => t.endDate || today())
  if (starts.length === 0) {
    const end = previousTradingDay(today())
    return { start: end, end }
  }
  const start = previousTradingDay(starts.reduce((a, b) => a < b ? a : b))
  const lastStageDates = props.targets.map(t => {
    const stages = getStages(t)
    return stages[stages.length - 1].date
  })
  let end = ends.reduce((a, b) => a > b ? a : b)
  const maxStage = lastStageDates.reduce((a, b) => a > b ? a : b)
  if (maxStage > end) end = maxStage
  return { start, end: previousTradingDay(end) }
})

function laneSegments(target: IndependentTarget) {
  const stages = getStages(target)
  const total = countTradingDays(globalRange.value.start, globalRange.value.end)
  return stages.map((stage, idx) => {
    const start = stage.date
    const end = getStageEnd(target, idx)
    const left = (countTradingDays(globalRange.value.start, start) - 1) / total * 100
    const width = countTradingDays(start, end) / total * 100
    return {
      stage,
      start,
      end,
      left: Math.max(0, left),
      width: Math.max(0.5, Math.min(100 - Math.max(0, left), width))
    }
  })
}

function sortedEvents(events: IndependentFlowEvent[]) {
  return [...events].sort((a, b) => a.date.localeCompare(b.date))
}

function eventKindLabel(kind: IndependentFlowKind) {
  return KIND_LABELS[kind] || kind
}

function formatShort(date: string) {
  return date.slice(5)
}
</script>

<style scoped>
.snapshot-flow {
  font-size: 12px;
}

.timeline-axis {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.axis-middle {
  flex: 1;
  border-top: 1px dashed var(--border-color);
}

.target-list {
  display: flex;
  flex-direction: column;
}

.target-item {
  padding: 9px 0;
  border-top: 1px solid var(--border-color);
}

.target-item:first-child {
  border-top: none;
}

.target-main {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.target-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.target-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.target-code {
  font-size: 11px;
  color: var(--text-tertiary);
}

.fund-line,
.stage-chain,
.flow-events {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.lane-zone {
  min-width: 0;
}

.target-lane {
  position: relative;
  height: 22px;
  min-width: 220px;
  background: repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(139,148,158,0.16) calc(10% - 1px), rgba(139,148,158,0.16) 10%);
  border-radius: 4px;
}

.lane-segment {
  position: absolute;
  top: 2px;
  bottom: 2px;
  min-width: 2px;
  border-radius: 2px;
}

.flow-tag {
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-size: 12px;
}

.stage-chain,
.flow-events {
  margin-top: 7px;
  padding-left: 162px;
}

.stage-node,
.flow-event {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border: 1px solid transparent;
  border-radius: 4px;
}

.stage-name {
  font-weight: 600;
}

.stage-date,
.stage-days,
.fe-date,
.fe-content {
  font-size: 10px;
  color: var(--text-secondary);
}

.stage-days {
  color: var(--color-blue);
}

.stage-arrow {
  color: var(--text-tertiary);
  font-size: 12px;
}

.flow-event {
  border-color: var(--border-color);
  background: var(--bg-tertiary);
  font-size: 11px;
}

@media (max-width: 768px) {
  .target-main {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .stage-chain,
  .flow-events {
    padding-left: 0;
  }
}
</style>
