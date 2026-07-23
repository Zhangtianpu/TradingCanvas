<template>
  <div class="cycle-panel">
    <!-- 交易风格 -->
    <div class="cycle-section">
      <div class="section-header">
        <div class="section-title">交易风格</div>
        <button class="btn-add" @click="openAddTradeStyle">+ 添加</button>
      </div>
      <div class="current-style" v-if="cycleStore.currentTradeStyle">
        <span class="style-label">当前：</span>
        <span class="style-tag" :class="`style-${cycleStore.currentTradeStyle.style}`">
          {{ getTradeStyleLabel(cycleStore.currentTradeStyle.style) }}
        </span>
        <span class="style-since">{{ cycleStore.currentTradeStyle.date.slice(5) }}起</span>
        <span class="style-duration">{{ getTradeStyleDuration() }}</span>
      </div>
      <div class="current-style" v-else>
        <span class="style-label">未设置</span>
      </div>

      <!-- 交易风格历史 -->
      <div class="history-track" v-if="cycleStore.sortedTradeStyleHistory.length > 0">
        <template v-for="(h, idx) in cycleStore.sortedTradeStyleHistory" :key="h.id">
          <div class="history-item editable" :class="`style-${h.style}`" @click="openEditTradeStyle(h)">
            <span class="hi-dot"></span>
            <span class="hi-label">{{ getTradeStyleLabel(h.style) }}</span>
            <span class="hi-date">{{ h.date.slice(5) }}</span>
            <span class="hi-duration">{{ getTradeStyleItemDuration(idx) }}</span>
          </div>
          <span v-if="idx < cycleStore.sortedTradeStyleHistory.length - 1" class="hi-arrow">→</span>
        </template>
      </div>
    </div>

    <!-- 情绪周期 -->
    <div class="cycle-section">
      <div class="section-header">
        <div class="section-title">情绪周期</div>
        <button class="btn-add" @click="openAddCyclePhase">+ 添加</button>
      </div>
      <div class="current-style" v-if="cycleStore.currentCyclePhase">
        <span class="style-label">当前：</span>
        <span class="style-tag" :class="`phase-${cycleStore.currentCyclePhase.phase}`">
          {{ getCyclePhaseLabel(cycleStore.currentCyclePhase.phase) }}
        </span>
        <span class="style-since">{{ cycleStore.currentCyclePhase.date.slice(5) }}起</span>
        <span class="style-duration">{{ getCyclePhaseDuration() }}</span>
      </div>
      <div class="current-style" v-else>
        <span class="style-label">未设置</span>
      </div>

      <!-- 情绪周期历史 -->
      <div class="history-track" v-if="cycleStore.sortedCyclePhaseHistory.length > 0">
        <template v-for="(h, idx) in cycleStore.sortedCyclePhaseHistory" :key="h.id">
          <div class="history-item editable" :class="`phase-${h.phase}`" @click="openEditCyclePhase(h)">
            <span class="hi-dot"></span>
            <span class="hi-label">{{ getCyclePhaseLabel(h.phase) }}</span>
            <span class="hi-date">{{ h.date.slice(5) }}</span>
            <span class="hi-duration">{{ getCyclePhaseItemDuration(idx) }}</span>
          </div>
          <span v-if="idx < cycleStore.sortedCyclePhaseHistory.length - 1" class="hi-arrow">→</span>
        </template>
      </div>
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
import { ref } from 'vue'
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

function getTradeStyleDuration() {
  if (!cycleStore.currentTradeStyle) return ''
  const start = cycleStore.currentTradeStyle.date
  const end = new Date().toISOString().slice(0, 10)
  return `${countTradingDays(start, end)}天`
}

function getCyclePhaseDuration() {
  if (!cycleStore.currentCyclePhase) return ''
  const start = cycleStore.currentCyclePhase.date
  const end = new Date().toISOString().slice(0, 10)
  return `${countTradingDays(start, end)}天`
}

function getTradeStyleItemDuration(index: number) {
  const history = cycleStore.sortedTradeStyleHistory
  if (index >= history.length) return ''
  const start = history[index].date
  let end: string
  if (index < history.length - 1) {
    end = history[index + 1].date
  } else {
    end = new Date().toISOString().slice(0, 10)
  }
  return `${countTradingDays(start, end)}天`
}

function getCyclePhaseItemDuration(index: number) {
  const history = cycleStore.sortedCyclePhaseHistory
  if (index >= history.length) return ''
  const start = history[index].date
  let end: string
  if (index < history.length - 1) {
    end = history[index + 1].date
  } else {
    end = new Date().toISOString().slice(0, 10)
  }
  return `${countTradingDays(start, end)}天`
}

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

function openEditTradeStyle(h: TradeStyleHistory) {
  editing.value = {
    type: 'tradeStyle',
    id: h.id,
    value: h.style,
    date: h.date,
    isNew: false
  }
}

function openEditCyclePhase(h: CyclePhaseHistory) {
  editing.value = {
    type: 'cyclePhase',
    id: h.id,
    value: h.phase,
    date: h.date,
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
  gap: 16px;
}

.cycle-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.current-style {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
}

.style-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.style-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.style-trend { background: #58a6ff; }
.style-board { background: #f0c040; color: #1f2328; }

.phase-start { background: #3fb950; }
.phase-main { background: #f85149; }
.phase-diverge { background: #a371f7; }
.phase-retreat { background: #8b949e; }

.style-since {
  color: var(--text-tertiary);
  font-size: 11px;
}

.style-duration {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-blue);
  font-weight: 600;
  padding: 1px 6px;
  background: rgba(88,166,255,0.15);
  border-radius: 3px;
}

/* 历史记录条 */
.history-track {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding: 6px 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.history-item.editable {
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
}

.history-item.editable:hover {
  filter: brightness(1.3);
  transform: scale(1.05);
}

.hi-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hi-label {
  color: var(--text-primary);
}

.hi-date {
  color: var(--text-tertiary);
  font-size: 10px;
}

.hi-duration {
  font-size: 9px;
  color: var(--text-secondary);
  margin-left: 4px;
  padding: 1px 4px;
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.hi-arrow {
  color: var(--text-tertiary);
  font-size: 11px;
}

/* 历史项颜色 */
.history-item.style-trend { background: rgba(88,166,255,0.12); }
.history-item.style-trend .hi-dot { background: #58a6ff; }
.history-item.style-board { background: rgba(240,192,64,0.12); }
.history-item.style-board .hi-dot { background: #f0c040; }

.history-item.phase-start { background: rgba(63,185,80,0.12); }
.history-item.phase-start .hi-dot { background: #3fb950; }
.history-item.phase-main { background: rgba(248,81,73,0.12); }
.history-item.phase-main .hi-dot { background: #f85149; }
.history-item.phase-diverge { background: rgba(163,113,247,0.12); }
.history-item.phase-diverge .hi-dot { background: #a371f7; }
.history-item.phase-retreat { background: rgba(139,148,158,0.12); }
.history-item.phase-retreat .hi-dot { background: #8b949e; }

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
</style>
