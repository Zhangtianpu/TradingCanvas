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
        <span class="style-tag" :style="{ background: getTradeStyleColor(cycleStore.currentTradeStyle.style) }">
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
          <div class="history-item editable" :style="{ '--item-color': getTradeStyleColor(h.style) }" @click="openEditTradeStyle(h)">
            <span class="hi-dot" :style="{ background: getTradeStyleColor(h.style) }"></span>
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
        <div class="header-actions">
          <button class="btn-save-cycle" @click="openSaveCycleDialog">保存当前周期</button>
          <button class="btn-reset" @click="showResetConfirm = true">重置</button>
          <button class="btn-add" @click="openAddCyclePhase">+ 添加</button>
        </div>
      </div>
      <div class="current-style" v-if="cycleStore.currentCyclePhase">
        <span class="style-label">当前：</span>
        <span class="style-tag" :style="{ background: getCyclePhaseColor(cycleStore.currentCyclePhase.phase) }">
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
          <div class="history-item editable" :style="{ '--item-color': getCyclePhaseColor(h.phase) }" @click="openEditCyclePhase(h)">
            <span class="hi-dot" :style="{ background: getCyclePhaseColor(h.phase) }"></span>
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

    <!-- 保存周期弹窗 -->
    <div class="edit-modal" v-if="showSaveCycleDialog" @click.self="closeSaveCycleDialog">
      <div class="modal-content save-cycle-modal">
        <div class="modal-header">
          <span class="modal-title">保存当前周期</span>
        </div>
        <div class="modal-body">
          <label class="input-label">周期名称</label>
          <input type="text" v-model="cycleForm.name" class="date-input" placeholder="如：周期1" />

          <div class="form-row-inline">
            <div class="form-col">
              <label class="input-label">开始日期</label>
              <input type="date" v-model="cycleForm.startDate" class="date-input" />
            </div>
            <div class="form-col">
              <label class="input-label">结束日期</label>
              <input type="date" v-model="cycleForm.endDate" class="date-input" />
            </div>
          </div>

          <div class="cycle-range-hint" v-if="cycleRangeHint">
            {{ cycleRangeHint }}
          </div>

          <label class="input-label" style="margin-top: 12px;">周期说明</label>
          <textarea v-model="cycleForm.description" rows="3" class="date-input" placeholder="可选：记录该周期的特点、龙头、关键事件等"></textarea>

          <div class="cycle-preview" v-if="cyclePhasePreview.length > 0">
            <div class="preview-title">周期内情绪阶段（将一同保存）</div>
            <div class="preview-track">
              <template v-for="(p, idx) in cyclePhasePreview" :key="p.id">
                <span class="preview-item" :style="{ background: getCyclePhaseColor(p.phase) }">
                  {{ getCyclePhaseLabel(p.phase) }}
                  <span class="preview-date">{{ p.date.slice(5) }}</span>
                </span>
                <span v-if="idx < cyclePhasePreview.length - 1" class="preview-arrow">→</span>
              </template>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeSaveCycleDialog">取消</button>
          <button class="btn-save" @click="handleSaveCycle">保存周期</button>
        </div>
      </div>
    </div>

    <!-- 保存后选择是否重置 -->
    <div class="edit-modal" v-if="showResetAfterSave" @click.self="keepAfterSave">
      <div class="modal-content reset-modal">
        <div class="modal-header">
          <span class="modal-title">保存成功</span>
        </div>
        <div class="modal-body">
          <p class="reset-hint">是否清空当前的交易风格与情绪周期？</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="keepAfterSave">保留</button>
          <button class="btn-reset-confirm" @click="confirmResetAfterSave">清空</button>
        </div>
      </div>
    </div>

    <!-- 重置确认弹窗 -->
    <ConfirmDialog
      :show="showResetConfirm"
      title="清空交易风格与情绪周期"
      message="确定要清空当前设置的所有交易风格与情绪周期记录吗？此操作不可撤销。"
      @confirm="handleResetAll"
      @cancel="showResetConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCycleStore } from '@/stores/cycle'
import { useCycleSummaryStore } from '@/stores/cycleSummary'
import { useCustomTradeStyleStore } from '@/stores/customTradeStyle'
import { useCustomCyclePhaseStore } from '@/stores/customCyclePhase'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { TradeStyle, CyclePhase, TradeStyleHistory, CyclePhaseHistory } from '@/types'

const router = useRouter()
const cycleStore = useCycleStore()
const cycleSummaryStore = useCycleSummaryStore()
const customTradeStyleStore = useCustomTradeStyleStore()
const customCyclePhaseStore = useCustomCyclePhaseStore()
const toast = useToast()

// 从 store 动态读取交易风格选项
const tradeStyleOptions = computed(() => {
  return customTradeStyleStore.options.map(o => ({
    value: o.value as TradeStyle,
    label: o.label
  }))
})

// 从 store 动态读取情绪阶段选项
const cyclePhaseOptions = computed(() => {
  return customCyclePhaseStore.options.map(o => ({
    value: o.value as CyclePhase,
    label: o.label
  }))
})

// 根据 key 获取显示名称（从自定义 store 读取）
function getTradeStyleLabel(style: string) {
  return customTradeStyleStore.getLabelByKey(style)
}

function getCyclePhaseLabel(phase: string) {
  return customCyclePhaseStore.getLabelByKey(phase)
}

// 根据 key 获取颜色（用于渲染）
function getTradeStyleColor(style: string) {
  return customTradeStyleStore.getColorByKey(style)
}

function getCyclePhaseColor(phase: string) {
  return customCyclePhaseStore.getColorByKey(phase)
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

// ===== 保存当前周期 =====
const showSaveCycleDialog = ref(false)
const showResetConfirm = ref(false)
const showResetAfterSave = ref(false)
const savedCycleId = ref('')
const cycleForm = ref({
  name: '',
  startDate: '',
  endDate: new Date().toISOString().slice(0, 10),
  description: ''
})

// 找到最近一次"启动"阶段的日期，作为周期开始默认值
function findLatestStartDate(): string {
  const sorted = [...cycleStore.cyclePhaseHistory].sort((a, b) => b.date.localeCompare(a.date))
  const startPhase = sorted.find(h => h.phase === 'start')
  if (startPhase) return startPhase.date
  // 没有启动阶段则取最早一条情绪周期记录
  if (sorted.length > 0) {
    return sorted[sorted.length - 1].date
  }
  // 都没有则取7天前
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function openSaveCycleDialog() {
  const start = findLatestStartDate()
  cycleForm.value = {
    name: cycleSummaryStore.nextCycleName,
    startDate: start,
    endDate: new Date().toISOString().slice(0, 10),
    description: ''
  }
  showSaveCycleDialog.value = true
}

function closeSaveCycleDialog() {
  showSaveCycleDialog.value = false
}

// 预览周期内的情绪阶段（基于当前选择的时间范围）
const cyclePhasePreview = computed<CyclePhaseHistory[]>(() => {
  const { startDate, endDate } = cycleForm.value
  if (!startDate || !endDate) return []
  return cycleStore.sortedCyclePhaseHistory.filter(h => h.date >= startDate && h.date <= endDate)
})

// 周期范围提示
const cycleRangeHint = computed(() => {
  const { startDate, endDate } = cycleForm.value
  if (!startDate || !endDate) return ''
  if (startDate > endDate) return '⚠ 开始日期不能晚于结束日期'
  const days = countTradingDays(startDate, endDate)
  return `周期跨度约 ${days} 个交易日`
})

function handleSaveCycle() {
  const { name, startDate, endDate, description } = cycleForm.value
  if (!name.trim()) {
    toast.error('请输入周期名称')
    return
  }
  if (!startDate || !endDate) {
    toast.error('请选择开始和结束日期')
    return
  }
  if (startDate > endDate) {
    toast.error('开始日期不能晚于结束日期')
    return
  }

  // 快照周期内的情绪阶段和交易风格
  const cyclePhaseSnapshot = cycleStore.sortedCyclePhaseHistory.filter(
    h => h.date >= startDate && h.date <= endDate
  )
  const tradeStyleSnapshot = cycleStore.sortedTradeStyleHistory.filter(
    h => h.date >= startDate && h.date <= endDate
  )

  const summary = cycleSummaryStore.createCycle({
    name: name.trim(),
    startDate,
    endDate,
    description: description.trim(),
    cyclePhaseSnapshot,
    tradeStyleSnapshot
  })

  toast.success(`周期「${summary.name}」已保存`)
  savedCycleId.value = summary.id
  closeSaveCycleDialog()
  // 保存后询问是否重置当前交易风格与情绪周期
  showResetAfterSave.value = true
}

function keepAfterSave() {
  showResetAfterSave.value = false
  router.push(`/cycle-summary/${savedCycleId.value}`)
}

function confirmResetAfterSave() {
  cycleStore.resetAll()
  toast.success('交易风格与情绪周期已清空')
  showResetAfterSave.value = false
  router.push(`/cycle-summary/${savedCycleId.value}`)
}

function handleResetAll() {
  cycleStore.resetAll()
  showResetConfirm.value = false
  toast.success('交易风格与情绪周期已清空')
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

.header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-save-cycle {
  padding: 3px 10px;
  font-size: 11px;
  background: rgba(63,185,80,0.15);
  border: 1px solid rgba(63,185,80,0.4);
  border-radius: 4px;
  cursor: pointer;
  color: #3fb950;
  transition: all 0.15s;
  font-weight: 500;
}

.btn-save-cycle:hover {
  background: rgba(63,185,80,0.25);
  border-color: #3fb950;
}

.btn-reset {
  padding: 3px 10px;
  font-size: 11px;
  background: rgba(248,81,73,0.1);
  border: 1px solid rgba(248,81,73,0.35);
  border-radius: 4px;
  cursor: pointer;
  color: #f85149;
  transition: all 0.15s;
  font-weight: 500;
}

.btn-reset:hover {
  background: rgba(248,81,73,0.2);
  border-color: #f85149;
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

/* 历史项背景色（基于 --item-color 变量，用淡色叠加） */
.history-item {
  background: color-mix(in srgb, var(--item-color, #58a6ff) 15%, transparent);
}
/* 兼容不支持 color-mix 的浏览器：使用半透明覆盖 */
@supports not (background: color-mix(in srgb, red 15%, transparent)) {
  .history-item {
    background: rgba(88, 166, 255, 0.12);
  }
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

.btn-reset-confirm {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  background: rgba(248,81,73,0.15);
  border: 1px solid rgba(248,81,73,0.3);
  color: #f85149;
}

.btn-reset-confirm:hover {
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

/* 保存后重置选择弹窗 */
.reset-modal {
  width: 360px;
  max-width: 90vw;
}

.reset-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* 保存周期弹窗 */
.save-cycle-modal {
  width: 420px;
  max-width: 92vw;
}

.form-row-inline {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cycle-range-hint {
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.cycle-preview {
  margin-top: 12px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.preview-title {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.preview-track {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.preview-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.preview-item .preview-date {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 400;
}

.preview-arrow {
  color: var(--text-tertiary);
  font-size: 11px;
}

textarea.date-input {
  resize: vertical;
  font-family: inherit;
}
</style>
