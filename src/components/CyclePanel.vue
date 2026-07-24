<template>
  <div class="cycle-panel">
    <!-- 交易风格时间轴 -->
    <div class="cycle-section">
      <div class="section-header">
        <div class="section-title">交易风格</div>
        <div class="header-actions">
          <button class="btn-add" @click="openAddTradeStyle">+ 添加</button>
        </div>
      </div>

      <!-- 时间轴 -->
      <div class="timeline-view" v-if="tradeStyleSegments.length > 0">
        <!-- 时间标尺 -->
        <div class="timeline-ruler">
          <span v-for="mark in tradeStyleTimeMarks" :key="mark" class="ruler-mark">{{ mark }}</span>
        </div>
        <!-- 时间轴主体 -->
        <div class="timeline-body">
          <div
            v-for="seg in tradeStyleSegments"
            :key="seg.id"
            class="timeline-block"
            :class="`style-${seg.style}`"
            :style="{ width: seg.width + '%', left: seg.left + '%' }"
            @click="openEditTradeStyle(seg)"
            :title="`${getTradeStyleLabel(seg.style!)} | ${seg.date.slice(5)} ~ ${seg.endDate.slice(5)} | ${seg.days}天`"
          >
            <span class="block-label">{{ getTradeStyleLabel(seg.style!) }}</span>
            <span class="block-days">{{ seg.days }}天</span>
          </div>
        </div>
        <!-- 日期标签 -->
        <div class="timeline-labels">
          <span v-for="seg in tradeStyleSegments" :key="seg.id" class="label-item" :style="{ width: seg.width + '%' }">
            {{ seg.date.slice(5) }}
          </span>
        </div>
      </div>
      <div v-else class="empty-hint">暂无记录，点击"+ 添加"开始记录</div>
    </div>

    <!-- 情绪周期时间轴 -->
    <div class="cycle-section">
      <div class="section-header">
        <div class="section-title">情绪周期</div>
        <div class="header-actions">
          <button class="btn-add" @click="openAddCyclePhase">+ 添加</button>
        </div>
      </div>

      <!-- 时间轴 -->
      <div class="timeline-view" v-if="cyclePhaseSegments.length > 0">
        <!-- 时间标尺 -->
        <div class="timeline-ruler">
          <span v-for="mark in cyclePhaseTimeMarks" :key="mark" class="ruler-mark">{{ mark }}</span>
        </div>
        <!-- 时间轴主体 -->
        <div class="timeline-body">
          <div
            v-for="seg in cyclePhaseSegments"
            :key="seg.id"
            class="timeline-block"
            :class="`phase-${seg.phase}`"
            :style="{ width: seg.width + '%', left: seg.left + '%' }"
            @click="openEditCyclePhase(seg)"
            :title="`${getCyclePhaseLabel(seg.phase!)} | ${seg.date.slice(5)} ~ ${seg.endDate.slice(5)} | ${seg.days}天`"
          >
            <span class="block-label">{{ getCyclePhaseLabel(seg.phase!) }}</span>
            <span class="block-days">{{ seg.days }}天</span>
          </div>
        </div>
        <!-- 日期标签 -->
        <div class="timeline-labels">
          <span v-for="seg in cyclePhaseSegments" :key="seg.id" class="label-item" :style="{ width: seg.width + '%' }">
            {{ seg.date.slice(5) }}
          </span>
        </div>
      </div>
      <div v-else class="empty-hint">暂无记录，点击"+ 添加"开始记录</div>
    </div>

    <!-- 编辑弹窗 -->
    <div class="edit-modal" v-if="editing" @click.self="editing = null">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">{{ editing.isNew ? '添加记录' : '编辑记录' }}</span>
        </div>
        <div class="modal-body">
          <label class="input-label">{{ editing.type === 'tradeStyle' ? '交易风格' : '情绪周期' }}</label>
          <select v-if="editing.type === 'tradeStyle'" v-model="editing.value" class="date-input">
            <option v-for="s in tradeStyleOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <select v-else v-model="editing.value" class="date-input">
            <option v-for="p in cyclePhaseOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <label class="input-label" style="margin-top: 12px;">日期</label>
          <input type="date" v-model="editing.date" class="date-input" />
        </div>
        <div class="modal-footer">
          <button v-if="!editing.isNew" class="btn-danger-sm" @click="deleteRecord">删除</button>
          <button class="btn-cancel" @click="editing = null">取消</button>
          <button class="btn-save" @click="saveRecord">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCycleStore } from '@/stores/cycle'
import type { TradeStyle, CyclePhase, TradeStyleHistory, CyclePhaseHistory } from '@/types'
import { TRADE_STYLE_LABELS, CYCLE_PHASE_LABELS } from '@/types'

const cycleStore = useCycleStore()

const tradeStyleOptions = [
  { value: 'trend' as TradeStyle, label: '趋势' },
  { value: 'board' as TradeStyle, label: '连板' }
]

const cyclePhaseOptions = [
  { value: 'start' as CyclePhase, label: '启动' },
  { value: 'main' as CyclePhase, label: '主升' },
  { value: 'diverge' as CyclePhase, label: '分歧' },
  { value: 'retreat' as CyclePhase, label: '退潮' }
]

function getTradeStyleLabel(style: TradeStyle) {
  return TRADE_STYLE_LABELS[style]
}

function getCyclePhaseLabel(phase: CyclePhase) {
  return CYCLE_PHASE_LABELS[phase]
}

// 计算交易日数量（排除周末）
function countTradingDays(startDate: string, endDate: string): number {
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return Math.max(count, 1)
}

// 交易风格时间段
interface Segment {
  id: string
  style?: TradeStyle
  phase?: CyclePhase
  date: string
  endDate: string
  days: number
  width: number  // 百分比宽度
  left: number   // 百分比左偏移
}

const tradeStyleSegments = computed<Segment[]>(() => {
  const history = cycleStore.sortedTradeStyleHistory
  if (history.length === 0) return []

  const today = new Date().toISOString().slice(0, 10)
  const segments: Array<{ id: string; style: TradeStyle; date: string; endDate: string; days: number }> = []

  // 计算每个段的起止时间
  for (let i = 0; i < history.length; i++) {
    const start = history[i].date
    const end = i < history.length - 1 ? history[i + 1].date : today
    const days = countTradingDays(start, end)
    segments.push({
      id: history[i].id,
      style: history[i].style,
      date: start,
      endDate: end,
      days
    })
  }

  // 计算总天数
  const totalDays = segments.reduce((sum, s) => sum + s.days, 0)

  // 计算宽度和位置
  let accumulated = 0
  return segments.map(s => {
    const width = (s.days / totalDays) * 100
    const left = accumulated
    accumulated += width
    return { ...s, width, left }
  })
})

const cyclePhaseSegments = computed<Segment[]>(() => {
  const history = cycleStore.sortedCyclePhaseHistory
  if (history.length === 0) return []

  const today = new Date().toISOString().slice(0, 10)
  const segments: Array<{ id: string; phase: CyclePhase; date: string; endDate: string; days: number }> = []

  for (let i = 0; i < history.length; i++) {
    const start = history[i].date
    const end = i < history.length - 1 ? history[i + 1].date : today
    const days = countTradingDays(start, end)
    segments.push({
      id: history[i].id,
      phase: history[i].phase,
      date: start,
      endDate: end,
      days
    })
  }

  const totalDays = segments.reduce((sum, s) => sum + s.days, 0)

  let accumulated = 0
  return segments.map(s => {
    const width = (s.days / totalDays) * 100
    const left = accumulated
    accumulated += width
    return { ...s, width, left }
  })
})

// 时间标尺标记
const tradeStyleTimeMarks = computed(() => {
  return tradeStyleSegments.value.map(s => s.date.slice(5))
})

const cyclePhaseTimeMarks = computed(() => {
  return cyclePhaseSegments.value.map(s => s.date.slice(5))
})

// 编辑弹窗
const editing = ref<{
  type: 'tradeStyle' | 'cyclePhase'
  id: string
  value: string
  date: string
  isNew: boolean
} | null>(null)

function openAddTradeStyle() {
  editing.value = {
    type: 'tradeStyle',
    id: '',
    value: 'trend',
    date: new Date().toISOString().slice(0, 10),
    isNew: true
  }
}

function openAddCyclePhase() {
  editing.value = {
    type: 'cyclePhase',
    id: '',
    value: 'start',
    date: new Date().toISOString().slice(0, 10),
    isNew: true
  }
}

function openEditTradeStyle(seg: Segment) {
  if (!seg.style) return
  editing.value = {
    type: 'tradeStyle',
    id: seg.id,
    value: seg.style,
    date: seg.date,
    isNew: false
  }
}

function openEditCyclePhase(seg: Segment) {
  if (!seg.phase) return
  editing.value = {
    type: 'cyclePhase',
    id: seg.id,
    value: seg.phase,
    date: seg.date,
    isNew: false
  }
}

function saveRecord() {
  if (!editing.value) return
  const { type, id, value, date, isNew } = editing.value
  if (type === 'tradeStyle') {
    if (isNew) {
      cycleStore.addTradeStyle(value as TradeStyle, date)
    } else {
      cycleStore.updateTradeStyle(id, { style: value as TradeStyle, date })
    }
  } else {
    if (isNew) {
      cycleStore.addCyclePhase(value as CyclePhase, date)
    } else {
      cycleStore.updateCyclePhase(id, { phase: value as CyclePhase, date })
    }
  }
  editing.value = null
}

function deleteRecord() {
  if (!editing.value) return
  const { type, id } = editing.value
  if (type === 'tradeStyle') {
    cycleStore.deleteTradeStyle(id)
  } else {
    cycleStore.deleteCyclePhase(id)
  }
  editing.value = null
}
</script>

<style scoped>
.cycle-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cycle-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  position: relative;
  padding-left: 12px;
}

.section-title::before {
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

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-add {
  padding: 3px 10px;
  font-size: 11px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.btn-add:hover {
  background: rgba(88,166,255,0.1);
  border-color: var(--color-blue);
  color: var(--color-blue);
}

/* 时间轴视图 */
.timeline-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-ruler {
  display: flex;
  height: 18px;
  font-size: 9px;
  color: var(--text-tertiary);
}

.ruler-mark {
  text-align: left;
  border-left: 1px solid var(--border-color);
  padding-left: 2px;
  white-space: nowrap;
  overflow: hidden;
}

/* 时间轴主体 */
.timeline-body {
  display: flex;
  position: relative;
  height: 36px;
  background: var(--bg-primary);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.timeline-block {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
  border-right: 1px solid rgba(0,0,0,0.2);
  overflow: hidden;
}

.timeline-block:hover {
  filter: brightness(1.2);
  transform: scaleY(1.05);
}

.block-label {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.block-days {
  font-size: 9px;
  color: rgba(255,255,255,0.85);
  margin-top: 2px;
}

/* 日期标签 */
.timeline-labels {
  display: flex;
  font-size: 9px;
  color: var(--text-tertiary);
}

.label-item {
  text-align: left;
  padding-left: 2px;
  white-space: nowrap;
  overflow: hidden;
}

/* 颜色 - 交易风格 */
.style-trend { background: linear-gradient(135deg, #58a6ff, #79c0ff); }
.style-board { background: linear-gradient(135deg, #f0c040, #ffd700); }

/* 颜色 - 情绪周期 */
.phase-start { background: linear-gradient(135deg, #3fb950, #56d364); }
.phase-main { background: linear-gradient(135deg, #f85149, #ff7b72); }
.phase-diverge { background: linear-gradient(135deg, #a371f7, #c297ff); }
.phase-retreat { background: linear-gradient(135deg, #8b949e, #aab2bc); }

/* 空状态 */
.empty-hint {
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

/* 弹窗 */
.edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 320px;
  max-width: 90vw;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
}

.modal-body {
  padding: 16px;
}

.input-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.date-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  outline: none;
}

.date-input:focus {
  border-color: var(--color-blue);
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel, .btn-save {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-danger-sm {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  background: rgba(248,81,73,0.15);
  border: 1px solid rgba(248,81,73,0.3);
  color: #f85149;
  margin-right: auto;
}

.btn-danger-sm:hover {
  background: rgba(248,81,73,0.25);
}

.btn-save {
  background: var(--color-blue);
  border: none;
  color: #fff;
}

.btn-save:hover {
  filter: brightness(1.1);
}

@media (max-width: 768px) {
  .block-label { font-size: 10px; }
  .block-days { font-size: 8px; }
}
</style>
