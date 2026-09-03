<template>
  <div class="stock-flow-card">
    <div class="flow-header">
      <div class="flow-title">个股分析</div>
      <div class="flow-actions">
        <span v-if="visibleTargets.length > 0" class="flow-count">共 {{ visibleTargets.length }} 个</span>
        <button class="btn-add" @click="openCreate">+ 添加</button>
      </div>
    </div>

    <div v-if="visibleTargets.length === 0" class="empty-hint">暂无标的</div>

    <div v-else>
      <div class="timeline-axis">
        <span>{{ formatShort(globalRange.start) }}</span>
        <span class="axis-middle"></span>
        <span>{{ formatShort(globalRange.end) }}</span>
      </div>

      <div class="target-list">
        <div v-for="target in visibleTargets" :key="target.id" class="target-item">
          <div class="target-main">
            <div class="target-meta">
              <div class="name-line">
                <span class="target-name">{{ target.name }}</span>
                <span v-if="target.code" class="target-code">{{ target.code }}</span>
                <span class="running-dot" :class="{ live: !target.endDate }"></span>
              </div>
              <div class="fund-line">
                <span class="flow-tag meta-position" :class="`position-${target.position}`" :style="tagStyle('position', target.position)" @click.stop="openPositionEditor(target)">{{ labelName('position', target.position) }}</span>
                <span
                  v-for="fund in target.fundTags"
                  :key="fund"
                  class="flow-tag"
                  :class="`fund-${fund}`"
                  :style="tagStyle('fund', fund)"
                >{{ labelName('fund', fund) }}</span>
              </div>
            </div>

            <div class="lane-zone">
              <div class="target-lane">
                <div
                  v-for="seg in laneSegments(target)"
                  :key="seg.stage.id"
                  class="lane-segment"
                  :class="`seg-${seg.stage.status}`"
                  :style="{ left: seg.left + '%', width: seg.width + '%', background: labelColor('status', seg.stage.status) }"
                  :title="`${labelName('status', seg.stage.status)} ${seg.start} ~ ${seg.end}`"
                ></div>
              </div>
            </div>

            <div class="target-actions">
              <button class="btn-edit" @click.stop="openEdit(target)">编辑</button>
              <button v-if="!target.endDate" class="btn-finish" @click.stop="finishTarget(target)">结束</button>
              <button v-else class="btn-restart" @click.stop="restartTarget(target)">启动</button>
              <button class="btn-remove" @click.stop="pendingDeleteId = target.id">移除</button>
            </div>
          </div>

          <div class="stage-chain">
            <template v-for="(stage, idx) in getStages(target)" :key="stage.id">
              <div class="stage-node" @click.stop="openStageEditor(target, idx)">
                <span class="stage-tag" :class="`status-${stage.status}`" :style="tagStyle('status', stage.status)">{{ labelName('status', stage.status) }}</span>
                <span class="stage-date">{{ stage.date.slice(5) }} ~ {{ getStageEnd(target, idx).slice(5) }}</span>
                <span class="stage-days">{{ countTradingDays(stage.date, getStageEnd(target, idx)) }}日</span>
              </div>
              <span v-if="idx < getStages(target).length - 1" class="stage-arrow">→</span>
            </template>
            <button class="stage-add" @click.stop="openAddStage(target)" title="添加阶段">+</button>
          </div>

          <div v-if="target.events.length > 0" class="flow-events">
            <span v-for="event in sortedEvents(target.events)" :key="event.id" class="flow-event" :class="`kind-${event.kind}`">
              <span class="fe-date">{{ event.date.slice(5) }}</span>
              <span class="fe-kind">{{ KIND_LABELS[event.kind] }}</span>
              <span v-if="event.content" class="fe-content">{{ event.content }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditor" class="edit-modal" @click.self="closeEditor">
      <div class="modal-content target-modal">
        <div class="modal-header">
          <span class="modal-title">{{ editingId ? '编辑标的' : '添加标的' }}</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-col">
              <label class="input-label">标的名称</label>
              <input v-model="form.name" class="text-input" maxlength="20" placeholder="名称" />
            </div>
            <div class="form-col">
              <label class="input-label">代码</label>
              <input v-model="form.code" class="text-input" maxlength="10" placeholder="可选" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-col">
              <label class="input-label">结束日期</label>
              <input v-model="form.endDate" type="date" class="text-input" />
            </div>
          </div>

          <div class="option-block">
            <span class="option-label">身位</span>
            <div class="option-row">
              <button
                v-for="opt in labelOptions('position')"
                :key="opt.value"
                class="option-btn"
                :class="[`pos-${opt.value}`, { active: form.position === opt.value }]"
                :style="optionStyle('position', opt.value, form.position === opt.value)"
                @click="form.position = opt.value"
              >{{ opt.name }}</button>
            </div>
          </div>

          <div class="option-block">
            <span class="option-label">资金性质</span>
            <div class="option-row">
              <button
                v-for="opt in labelOptions('fund')"
                :key="opt.value"
                class="multi-btn"
                :class="[`fund-${opt.value}`, { active: form.fundTags.includes(opt.value) }]"
                :style="optionStyle('fund', opt.value, form.fundTags.includes(opt.value))"
                @click="toggleFund(opt.value)"
              >{{ opt.name }}</button>
            </div>
          </div>

          <div class="option-block">
            <span class="option-label">行情阶段</span>
            <div v-for="(stage, idx) in form.stages" :key="stage.id" class="stage-form-row">
              <span class="stage-index">{{ idx + 1 }}</span>
              <input v-model="stage.date" type="date" class="text-input stage-date" />
              <select v-model="stage.status" class="text-input stage-status">
                <option v-for="opt in labelOptions('status')" :key="opt.value" :value="opt.value">{{ opt.name }}</option>
              </select>
              <button v-if="form.stages.length > 1" class="btn-link" @click="removeStage(stage.id)">删除</button>
            </div>
            <button class="btn-add-stage" @click="addStage">+ 添加阶段</button>
          </div>

          <div class="option-block">
            <span class="option-label">关键节点</span>
            <div class="event-form">
              <input v-model="eventDraft.date" type="date" class="text-input event-date" />
              <select v-model="eventDraft.kind" class="text-input event-kind">
                <option value="breakout">突破前高</option>
                <option value="rebound">反包修复</option>
                <option value="custom">备注</option>
              </select>
              <input v-model="eventDraft.content" class="text-input event-content" maxlength="40" placeholder="备注，可选" />
              <button class="btn-add-event" @click="addDraftEvent">添加</button>
            </div>
            <div v-if="form.events.length > 0" class="form-event-list">
              <div v-for="event in form.events" :key="event.id" class="form-event-item">
                <span class="fe-date">{{ event.date.slice(5) }}</span>
                <span class="fe-kind">{{ KIND_LABELS[event.kind] }}</span>
                <span class="fe-content">{{ event.content }}</span>
                <button class="btn-link" @click="removeFormEvent(event.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="editingId" class="btn-danger-sm" @click="pendingDeleteId = editingId">删除</button>
          <button class="btn-cancel" @click="closeEditor">取消</button>
          <button class="btn-save" @click="saveTarget">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showStageModal" class="edit-modal" @click.self="closeStageEditor">
      <div class="modal-content stage-quick-modal">
        <div class="modal-header">
          <span class="modal-title">{{ stageForm.id ? '编辑阶段' : '添加阶段' }}</span>
        </div>
        <div class="modal-body">
          <label class="input-label">开始日期</label>
          <input v-model="stageForm.date" type="date" class="text-input" />

          <div class="option-block">
            <span class="option-label">状态</span>
            <div class="option-row">
              <button
                v-for="opt in labelOptions('status')"
                :key="opt.value"
                class="option-btn"
                :class="[`state-${opt.value}`, { active: stageForm.status === opt.value }]"
                :style="optionStyle('status', opt.value, stageForm.status === opt.value)"
                @click="stageForm.status = opt.value"
              >{{ opt.name }}</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="stageForm.id && stageModalStageCount > 1" class="btn-danger-sm" @click="deleteStageFromEditor">删除</button>
          <button class="btn-cancel" @click="closeStageEditor">取消</button>
          <button class="btn-save" @click="saveStageEditor">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showPositionModal" class="edit-modal" @click.self="closePositionEditor">
      <div class="modal-content stage-quick-modal">
        <div class="modal-header">
          <span class="modal-title">身位</span>
        </div>
        <div class="modal-body">
          <div class="option-block">
            <span class="option-label">当前标的</span>
            <div class="option-row">
              <button
                v-for="opt in labelOptions('position')"
                :key="opt.value"
                class="option-btn"
                :class="[`pos-${opt.value}`, { active: positionDraft === opt.value }]"
                :style="optionStyle('position', opt.value, positionDraft === opt.value)"
                @click="positionDraft = opt.value"
              >{{ opt.name }}</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closePositionEditor">取消</button>
          <button class="btn-save" @click="savePositionEditor">保存</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="!!pendingDeleteId"
      title="删除标的"
      :message="pendingDeleteId ? `确定删除「${getPendingName()}」？` : ''"
      @confirm="confirmDelete"
      @cancel="pendingDeleteId = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useIndependentTargetStore } from '@/stores/independentTarget'
import { useIndependentLabelStore } from '@/stores/independentLabel'
import { useToast } from '@/composables/useToast'
import { generateId } from '@/composables/useStorage'
import { today } from '@/composables/useDate'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type {
  IndependentTarget,
  IndependentPosition,
  IndependentStatus,
  IndependentFundTag,
  IndependentFlowKind,
  IndependentFlowEvent,
  IndependentStage,
  IndependentLabelCategory
} from '@/types'

const targetStore = useIndependentTargetStore()
const labelStore = useIndependentLabelStore()
const toast = useToast()

const props = withDefaults(defineProps<{
  statusFilter?: 'active' | 'ended' | 'all'
}>(), {
  statusFilter: 'all'
})

const visibleTargets = computed(() => {
  if (props.statusFilter === 'active') {
    return targetStore.sortedTargets.filter(t => !t.endDate)
  }
  if (props.statusFilter === 'ended') {
    return targetStore.sortedTargets.filter(t => !!t.endDate)
  }
  return targetStore.sortedTargets
})

function labelOptions(category: IndependentLabelCategory) {
  return labelStore.sortedLabels
    .filter(l => l.category === category)
    .map(l => ({ value: l.key, name: l.name, color: l.color }))
}

function labelName(category: IndependentLabelCategory, key: string) {
  return labelStore.getName(category, key)
}

function labelColor(category: IndependentLabelCategory, key: string) {
  return labelStore.getColor(category, key)
}

function withAlpha(hex: string, alpha = 0.14): string {
  const clean = hex.replace('#', '')
  return '#' + clean.slice(0, 6) + Math.round(alpha * 255).toString(16).padStart(2, '0')
}

function tagStyle(category: IndependentLabelCategory, key: string) {
  const color = labelColor(category, key)
  return {
    background: withAlpha(color, 0.14),
    color,
    borderColor: withAlpha(color, 0.3)
  }
}

function optionStyle(category: IndependentLabelCategory, key: string, active: boolean) {
  if (!active) return {}
  const color = labelColor(category, key)
  return {
    background: withAlpha(color, 0.18),
    borderColor: color,
    color
  }
}

const KIND_LABELS: Record<IndependentFlowKind, string> = {
  breakout: '突破前高',
  rebound: '反包修复',
  custom: '备注'
}

const showEditor = ref(false)
const editingId = ref('')
const pendingDeleteId = ref('')

const showStageModal = ref(false)
const stageModalTargetId = ref('')
const stageModalStageCount = ref(0)

const showPositionModal = ref(false)
const positionModalTargetId = ref('')
const positionDraft = ref<IndependentPosition>('leader')
const stageForm = reactive({
  id: '',
  date: today(),
  status: 'board' as IndependentStatus
})

const form = reactive({
  name: '',
  code: '',
  position: 'leader' as IndependentPosition,
  endDate: '',
  fundTags: [] as IndependentFundTag[],
  stages: [] as IndependentStage[],
  events: [] as IndependentFlowEvent[]
})

const eventDraft = reactive({
  date: today(),
  kind: 'breakout' as IndependentFlowKind,
  content: ''
})

function resetDraftEvent() {
  eventDraft.date = today()
  eventDraft.kind = 'breakout'
  eventDraft.content = ''
}

function defaultStage(date: string): IndependentStage {
  return {
    id: generateId(),
    date,
    status: 'board'
  }
}

function openCreate() {
  editingId.value = ''
  form.name = ''
  form.code = ''
  form.position = 'leader'
  form.endDate = ''
  form.fundTags = []
  form.stages = [defaultStage(today())]
  form.events = []
  resetDraftEvent()
  showEditor.value = true
}

function openEdit(target: IndependentTarget) {
  editingId.value = target.id
  form.name = target.name
  form.code = target.code || ''
  form.position = target.position
  form.endDate = target.endDate || ''
  form.fundTags = [...target.fundTags]
  form.stages = getStages(target).map(s => ({ ...s }))
  form.events = target.events.map(e => ({ ...e }))
  resetDraftEvent()
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingId.value = ''
}

function toggleFund(tag: IndependentFundTag) {
  const idx = form.fundTags.indexOf(tag)
  if (idx >= 0) {
    form.fundTags.splice(idx, 1)
  } else {
    form.fundTags.push(tag)
  }
}

function addStage() {
  const last = form.stages.length ? form.stages[form.stages.length - 1] : null
  form.stages.push({
    id: generateId(),
    date: today(),
    status: last?.status || 'board'
  })
}

function removeStage(id: string) {
  if (form.stages.length <= 1) return
  form.stages = form.stages.filter(s => s.id !== id)
}

function addDraftEvent() {
  if (!eventDraft.date) {
    toast.error('请选择节点日期')
    return
  }
  form.events.push({
    id: generateId(),
    date: eventDraft.date,
    kind: eventDraft.kind,
    content: eventDraft.content.trim()
  })
  resetDraftEvent()
}

function removeFormEvent(id: string) {
  form.events = form.events.filter(e => e.id !== id)
}

function openStageEditor(target: IndependentTarget, idx: number) {
  const stages = getStages(target)
  if (idx < 0 || idx >= stages.length) return
  const stage = stages[idx]
  stageModalTargetId.value = target.id
  stageModalStageCount.value = stages.length
  stageForm.id = stage.id
  stageForm.date = stage.date
  stageForm.status = stage.status
  showStageModal.value = true
}

function openAddStage(target: IndependentTarget) {
  const stages = getStages(target)
  const last = stages[stages.length - 1]
  stageModalTargetId.value = target.id
  stageModalStageCount.value = stages.length
  stageForm.id = ''
  stageForm.date = today()
  stageForm.status = last?.status || 'board'
  showStageModal.value = true
}

function closeStageEditor() {
  showStageModal.value = false
  stageForm.id = ''
}

function openPositionEditor(target: IndependentTarget) {
  positionModalTargetId.value = target.id
  positionDraft.value = target.position
  showPositionModal.value = true
}

function closePositionEditor() {
  showPositionModal.value = false
  positionModalTargetId.value = ''
}

function savePositionEditor() {
  if (!positionModalTargetId.value) return
  targetStore.updateTarget(positionModalTargetId.value, { position: positionDraft.value })
  toast.success('身位已更新')
  closePositionEditor()
}

function saveStageEditor() {
  if (!stageModalTargetId.value) return
  if (!stageForm.date) {
    toast.error('请选择日期')
    return
  }
  const target = targetStore.targets.find(t => t.id === stageModalTargetId.value)
  if (!target) return
  const stages = getStages(target)
  const stage: IndependentStage = {
    id: stageForm.id || generateId(),
    date: stageForm.date,
    status: stageForm.status
  }
  if (stageForm.id) {
    const idx = stages.findIndex(s => s.id === stageForm.id)
    if (idx !== -1) stages[idx] = stage
  } else {
    stages.push(stage)
  }
  const sortedDraft = [...stages].sort((a, b) => a.date.localeCompare(b.date))
  for (let i = 1; i < sortedDraft.length; i++) {
    if (sortedDraft[i].date <= sortedDraft[i - 1].date) {
      toast.error('阶段日期不能重叠，后一阶段需从下一日开始')
      return
    }
  }
  targetStore.updateTarget(target.id, { stages })
  toast.success(stageForm.id ? '阶段已更新' : '阶段已添加')
  closeStageEditor()
}

function deleteStageFromEditor() {
  if (!stageModalTargetId.value || !stageForm.id) return
  const target = targetStore.targets.find(t => t.id === stageModalTargetId.value)
  if (!target) return
  const stages = getStages(target).filter(s => s.id !== stageForm.id)
  targetStore.updateTarget(target.id, { stages })
  toast.success('阶段已删除')
  closeStageEditor()
}

function saveTarget() {
  const name = form.name.trim()
  if (!name) {
    toast.error('请输入标的名称')
    return
  }
  if (form.stages.length === 0) {
    toast.error('请至少保留一个行情阶段')
    return
  }
  const sortedStages = [...form.stages].sort((a, b) => a.date.localeCompare(b.date))
  if (form.endDate && form.endDate < sortedStages[0].date) {
    toast.error('结束日期不能早于开始日期')
    return
  }
  for (let i = 1; i < sortedStages.length; i++) {
    if (sortedStages[i].date <= sortedStages[i - 1].date) {
      toast.error('阶段日期不能重叠，后一阶段需从下一日开始')
      return
    }
  }
  const first = sortedStages[0]
  const last = sortedStages[sortedStages.length - 1]
  const payload = {
    name,
    code: form.code.trim() || undefined,
    position: form.position,
    startDate: first.date,
    status: last.status,
    endDate: form.endDate || undefined,
    fundTags: [...form.fundTags],
    stages: sortedStages,
    events: form.events.map(e => ({ ...e }))
  }
  if (editingId.value) {
    targetStore.updateTarget(editingId.value, payload)
    toast.success('标的已更新')
  } else {
    targetStore.createTarget(payload)
    toast.success('标的已添加')
  }
  closeEditor()
}

function finishTarget(target: IndependentTarget) {
  targetStore.updateTarget(target.id, {
    status: 'end',
    endDate: today()
  })
  toast.success('标的已结束')
}

function restartTarget(target: IndependentTarget) {
  const stages = getStages(target)
  const previous = [...stages].reverse().find(s => s.status !== 'end')
  const statusOptions = labelOptions('status')
  const fallback = statusOptions.find(s => s.value !== 'end')?.value || target.status
  targetStore.updateTarget(target.id, {
    status: previous?.status || fallback,
    endDate: undefined
  })
  toast.success('标的已重新启动')
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

function addDays(date: string, delta: number): string {
  return new Date(new Date(date).getTime() + delta * 86400000).toISOString().slice(0, 10)
}

function getStageEnd(target: IndependentTarget, idx: number): string {
  const stages = getStages(target)
  if (idx < stages.length - 1) {
    const end = addDays(stages[idx + 1].date, -1)
    return end < stages[idx].date ? stages[idx].date : end
  }
  return target.endDate || today()
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
  return count
}

function dateDiffDays(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.round((e - s) / 86400000) + 1)
}

const globalRange = computed(() => {
  const targets = visibleTargets.value
  const starts = targets.flatMap(t => getStages(t).map(s => s.date))
  const ends = targets.map(t => t.endDate || today())
  if (starts.length === 0) {
    return { start: today(), end: today() }
  }
  const start = starts.reduce((a, b) => a < b ? a : b)
  let end = ends.reduce((a, b) => a > b ? a : b)
  const lastStageDates = targets.map(t => {
    const stages = getStages(t)
    return stages[stages.length - 1].date
  })
  const maxStage = lastStageDates.reduce((a, b) => a > b ? a : b)
  if (maxStage > end) end = maxStage
  return { start, end }
})

function laneSegments(target: IndependentTarget) {
  const stages = getStages(target)
  const total = dateDiffDays(globalRange.value.start, globalRange.value.end)
  return stages.map((stage, idx) => {
    const start = stage.date
    const end = getStageEnd(target, idx)
    const left = (dateDiffDays(globalRange.value.start, start) - 1) / total * 100
    const width = dateDiffDays(start, end) / total * 100
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

function formatShort(date: string) {
  return date.slice(5)
}

function getPendingName() {
  const target = targetStore.targets.find(t => t.id === pendingDeleteId.value)
  return target?.name || ''
}

function confirmDelete() {
  if (!pendingDeleteId.value) return
  targetStore.deleteTarget(pendingDeleteId.value)
  toast.success('标的已删除')
  if (editingId.value === pendingDeleteId.value) {
    closeEditor()
  }
  pendingDeleteId.value = ''
}
</script>

<style scoped>
.stock-flow-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.flow-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  position: relative;
  padding-left: 12px;
}

.flow-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  background: var(--color-blue);
  border-radius: 2px;
}

.flow-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-count {
  font-size: 11px;
  color: var(--text-tertiary);
}

.btn-add {
  padding: 3px 10px;
  font-size: 11px;
  background: rgba(88,166,255,0.12);
  border: 1px solid rgba(88,166,255,0.35);
  border-radius: 4px;
  color: var(--color-blue);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add:hover {
  background: rgba(88,166,255,0.22);
  border-color: var(--color-blue);
}

.empty-hint {
  color: var(--text-tertiary);
  text-align: center;
  padding: 18px;
  font-size: 13px;
}

.timeline-axis {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 0 150px 4px 0;
}

.axis-middle {
  flex: 1;
  border-top: 1px dashed var(--border-color);
}

.target-list {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
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
  grid-template-columns: 150px minmax(0, 1fr) auto;
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
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.target-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.target-code {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.running-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
}

.running-dot.live {
  background: var(--color-red);
  box-shadow: 0 0 6px rgba(248,81,73,0.65);
}

.fund-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.flow-tag {
  font-size: 12px;
  padding: 0 7px;
  border-radius: 3px;
  white-space: nowrap;
}

.meta-position {
  cursor: pointer;
  transition: filter 0.15s;
}

.meta-position:hover {
  filter: brightness(1.25);
}

.fund-independent { background: rgba(188,140,255,0.13); color: var(--color-purple); }
.fund-theme { background: rgba(88,166,255,0.13); color: var(--color-blue); }
.fund-switch { background: rgba(240,192,64,0.13); color: var(--color-gold); }
.fund-recognition { background: rgba(240,136,62,0.13); color: var(--color-orange); }

.lane-zone {
  min-width: 0;
}

.target-lane {
  position: relative;
  height: 22px;
  min-width: 220px;
  background:
    repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(139,148,158,0.16) calc(10% - 1px), rgba(139,148,158,0.16) 10%);
  border-radius: 4px;
}

.lane-segment {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 2px;
  min-width: 2px;
}

.seg-board { background: rgba(248,81,73,0.78); }
.seg-breakRebound { background: rgba(240,136,62,0.78); }
.seg-divergence { background: rgba(188,140,255,0.75); }
.seg-limitRepair { background: rgba(63,185,80,0.75); }
.seg-avoidAlert { background: rgba(240,192,64,0.78); }
.seg-end { background: rgba(139,148,158,0.7); }

.target-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-edit,
.btn-finish {
  padding: 3px 9px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  transition: all 0.15s;
}

.btn-edit:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.btn-finish {
  color: var(--color-gold);
  border-color: rgba(240,192,64,0.3);
}

.btn-finish:hover {
  background: rgba(240,192,64,0.12);
}

.btn-restart {
  color: var(--color-green);
  border-color: rgba(63,185,80,0.35);
  padding: 3px 9px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  transition: all 0.15s;
}

.btn-restart:hover {
  background: rgba(63,185,80,0.12);
}

.btn-remove {
  color: var(--color-red);
  border-color: rgba(248,81,73,0.35);
  padding: 3px 9px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  transition: all 0.15s;
}

.btn-remove:hover {
  background: rgba(248,81,73,0.12);
}

.stage-chain {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
  padding-left: 162px;
}

.stage-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}

.stage-node:hover {
  border-color: var(--color-blue);
  transform: translateY(-1px);
}

.stage-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px dashed rgba(88,166,255,0.5);
  border-radius: 50%;
  background: transparent;
  color: var(--color-blue);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.stage-add:hover {
  background: rgba(88,166,255,0.12);
  border-style: solid;
}

.stage-tag {
  font-size: 12px;
  padding: 0 6px;
  border-radius: 3px;
}

.position-leader { background: rgba(240,192,64,0.14); color: var(--color-gold); }
.position-catchup { background: rgba(88,166,255,0.14); color: var(--color-blue); }

.status-board { background: rgba(248,81,73,0.14); color: var(--color-red); }
.status-breakRebound { background: rgba(240,136,62,0.14); color: var(--color-orange); }
.status-divergence { background: rgba(188,140,255,0.14); color: var(--color-purple); }
.status-limitRepair { background: rgba(63,185,80,0.14); color: var(--color-green); }
.status-avoidAlert { background: rgba(240,192,64,0.14); color: var(--color-gold); }
.status-end { background: rgba(139,148,158,0.14); color: var(--text-secondary); }

.stage-date {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.stage-days {
  font-size: 11px;
  color: var(--color-blue);
  font-weight: 500;
  white-space: nowrap;
}

.stage-arrow {
  color: var(--text-tertiary);
  font-size: 12px;
}

.flow-events {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
  padding-left: 162px;
}

.flow-event {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 11px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.flow-event.kind-breakout {
  border-color: rgba(248,81,73,0.35);
  color: var(--color-red);
  background: rgba(248,81,73,0.06);
}

.flow-event.kind-rebound {
  border-color: rgba(63,185,80,0.35);
  color: var(--color-green);
  background: rgba(63,185,80,0.06);
}

.flow-event.kind-custom {
  border-color: rgba(139,148,158,0.35);
  background: rgba(139,148,158,0.06);
}

.fe-date {
  color: var(--text-tertiary);
}

.fe-content {
  color: var(--text-secondary);
}

.edit-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content.stage-quick-modal {
  width: 420px;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 620px;
  max-width: 94vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
}

.modal-body {
  padding: 14px 16px;
  overflow-y: auto;
}

.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.form-col {
  flex: 1;
  min-width: 0;
}

.input-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.text-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
}

.text-input:focus {
  border-color: var(--color-blue);
}

.option-block {
  margin-bottom: 12px;
}

.option-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-btn,
.multi-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.option-btn.active,
.multi-btn.active {
  color: var(--text-primary);
}

.pos-leader.active { background: rgba(240,192,64,0.18); border-color: var(--color-gold); color: var(--color-gold); }
.pos-catchup.active { background: rgba(88,166,255,0.18); border-color: var(--color-blue); color: var(--color-blue); }

.state-board.active { background: rgba(248,81,73,0.18); border-color: var(--color-red); color: var(--color-red); }
.state-breakRebound.active { background: rgba(240,136,62,0.18); border-color: var(--color-orange); color: var(--color-orange); }
.state-divergence.active { background: rgba(188,140,255,0.18); border-color: var(--color-purple); color: var(--color-purple); }
.state-limitRepair.active { background: rgba(63,185,80,0.18); border-color: var(--color-green); color: var(--color-green); }
.state-avoidAlert.active { background: rgba(240,192,64,0.18); border-color: var(--color-gold); color: var(--color-gold); }
.state-end.active { background: rgba(139,148,158,0.18); border-color: var(--text-secondary); color: var(--text-secondary); }

.multi-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.multi-btn.active {
  color: var(--text-primary);
}

.fund-independent.active { background: rgba(188,140,255,0.18); border-color: var(--color-purple); color: var(--color-purple); }
.fund-theme.active { background: rgba(88,166,255,0.18); border-color: var(--color-blue); color: var(--color-blue); }
.fund-switch.active { background: rgba(240,192,64,0.18); border-color: var(--color-gold); color: var(--color-gold); }
.fund-recognition.active { background: rgba(240,136,62,0.18); border-color: var(--color-orange); color: var(--color-orange); }

.stage-form-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

.stage-index {
  width: 18px;
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
  flex-shrink: 0;
}

.stage-date {
  width: 132px;
  flex-shrink: 0;
}

.stage-position,
.stage-status {
  width: 92px;
  flex-shrink: 0;
}

.btn-add-stage {
  padding: 4px 10px;
  font-size: 11px;
  background: transparent;
  border: 1px dashed rgba(88,166,255,0.45);
  border-radius: 4px;
  color: var(--color-blue);
  cursor: pointer;
}

.btn-add-stage:hover {
  background: rgba(88,166,255,0.1);
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--color-blue);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
}

.event-form {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.event-date {
  width: 130px;
  flex-shrink: 0;
}

.event-kind {
  width: 110px;
  flex-shrink: 0;
}

.event-content {
  flex: 1;
}

.btn-add-event {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  background: rgba(88,166,255,0.12);
  border: 1px solid rgba(88,166,255,0.35);
  color: var(--color-blue);
  white-space: nowrap;
  cursor: pointer;
}

.form-event-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-event-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.form-event-item .fe-content {
  flex: 1;
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel,
.btn-save,
.btn-danger-sm {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-save {
  background: var(--color-blue);
  border: none;
  color: #fff;
}

.btn-save:hover {
  filter: brightness(1.1);
}

.btn-danger-sm {
  background: rgba(248,81,73,0.12);
  border: 1px solid rgba(248,81,73,0.3);
  color: var(--color-red);
  margin-right: auto;
}

.btn-danger-sm:hover {
  background: rgba(248,81,73,0.2);
}

@media (max-width: 768px) {
  .target-main {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .target-actions {
    justify-content: flex-end;
  }

  .stage-chain,
  .flow-events {
    padding-left: 0;
  }

  .timeline-axis {
    padding-right: 0;
  }

  .form-row,
  .event-form {
    flex-wrap: wrap;
    gap: 8px;
  }

  .form-col {
    flex: 1 1 100%;
  }

  .stage-form-row {
    flex-wrap: wrap;
  }

  .stage-date {
    width: 130px;
  }
}
</style>
