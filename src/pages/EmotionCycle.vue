<template>
  <div class="emotion-page">
    <div class="page-header">
      <h1 class="page-title">情绪周期</h1>
    </div>

    <!-- 空间板核心指标 -->
    <div class="space-board-card">
      <div class="space-height">
        <span class="height-value">{{ latestEmotion?.maxBoardHeight ?? '-' }}</span>
        <span class="height-unit">板</span>
        <span class="height-label">空间板</span>
      </div>
      <div class="space-info">
        <div class="space-stock" v-if="latestEmotion?.spaceBoardStockName">
          {{ latestEmotion.spaceBoardStockName }}
        </div>
        <div class="breakthrough-status" :class="{ active: latestEmotion?.isBreakthrough }">
          {{ latestEmotion?.isBreakthrough ? '高度突破' : '未突破' }}
          <span v-if="latestEmotion?.prevHighBoard" class="prev-high">
            前高 {{ latestEmotion.prevHighBoard }}板
          </span>
        </div>
      </div>
    </div>

    <!-- 接力结构 -->
    <div class="card relay-structure">
      <div class="section-title">接力结构</div>
      <div class="relay-pyramid">
        <div class="relay-row" v-for="(row, idx) in relayRows" :key="idx">
          <span class="relay-level">{{ row.level }}</span>
          <div class="relay-bar" :style="{ width: row.width }"></div>
          <span class="relay-count">{{ row.count }}</span>
        </div>
      </div>
    </div>

    <!-- 情绪阶段 -->
    <div class="card phase-card">
      <div class="phase-bar">
        <div
          v-for="p in phases" :key="p.key"
          class="phase-item"
          :class="{ active: currentPhase === p.key }"
        >
          {{ p.label }}
        </div>
      </div>
    </div>

    <!-- 数据录入 -->
    <div class="card">
      <div class="form-row">
        <div class="form-group">
          <label>日期</label>
          <input v-model="form.date" type="date" @change="loadEmotion" />
        </div>
        <div class="form-group">
          <label>情绪阶段</label>
          <select v-model="form.phase">
            <option v-for="p in phases" :key="p.key" :value="p.key">{{ p.label }}</option>
          </select>
        </div>
      </div>

      <!-- 接力结构录入 -->
      <div class="input-section">
        <div class="input-section-title">接力结构</div>
        <div class="input-grid relay-grid">
          <div class="input-item">
            <label>2板</label>
            <input v-model.number="form.board2Count" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>3板</label>
            <input v-model.number="form.board3Count" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>4板</label>
            <input v-model.number="form.board4Count" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>5板</label>
            <input v-model.number="form.board5Count" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>6+板</label>
            <input v-model.number="form.board6PlusCount" type="number" min="0" />
          </div>
        </div>
      </div>

      <!-- 空间板录入 -->
      <div class="input-section">
        <div class="input-section-title">
          <span>空间板</span>
          <button type="button" class="btn-add-stock" @click="addSpaceBoardStock">+ 添加</button>
        </div>
        <div class="space-board-list">
          <div v-for="(stock, idx) in form.spaceBoardStocks" :key="idx" class="space-board-item">
            <input v-model.number="stock.height" type="number" min="0" placeholder="高度" class="height-input" />
            <span class="board-unit">板</span>
            <input v-model="stock.name" placeholder="股票名称" class="stock-name-input" />
            <button type="button" class="btn-remove" @click="removeSpaceBoardStock(idx)">×</button>
          </div>
          <div v-if="form.spaceBoardStocks.length === 0" class="empty-stock-hint">
            点击"+ 添加"录入空间板个股
          </div>
        </div>
        <div class="space-board-extra">
          <div class="input-item inline">
            <label>前期高点</label>
            <input v-model.number="form.prevHighBoard" type="number" min="0" />
            <span class="unit">板</span>
          </div>
          <div class="input-item inline checkbox-item">
            <label>
              <input type="checkbox" v-model="form.isBreakthrough" />
              高度突破
            </label>
          </div>
        </div>
      </div>

      <!-- 指数行情 -->
      <div class="input-section">
        <div class="input-section-title">指数行情</div>
        <div class="index-input-grid">
          <div class="index-input-row">
            <span class="index-label">上证</span>
            <input v-model.number="form.shIndex" type="number" step="0.01" placeholder="点位" />
            <input v-model.number="form.shChange" type="number" step="0.01" placeholder="涨跌%" />
          </div>
          <div class="index-input-row">
            <span class="index-label">深证</span>
            <input v-model.number="form.szIndex" type="number" step="0.01" placeholder="点位" />
            <input v-model.number="form.szChange" type="number" step="0.01" placeholder="涨跌%" />
          </div>
          <div class="index-input-row">
            <span class="index-label">创业板</span>
            <input v-model.number="form.cybIndex" type="number" step="0.01" placeholder="点位" />
            <input v-model.number="form.cybChange" type="number" step="0.01" placeholder="涨跌%" />
          </div>
          <div class="index-input-row">
            <span class="index-label">全A</span>
            <input v-model.number="form.allAIndex" type="number" step="0.01" placeholder="点位" />
            <input v-model.number="form.allAChange" type="number" step="0.01" placeholder="涨跌%" />
          </div>
          <div class="index-input-row single">
            <span class="index-label">成交量</span>
            <input v-model.number="form.allAVolume" type="number" step="0.01" placeholder="亿" />
          </div>
        </div>
      </div>

      <!-- 市场概况 -->
      <div class="input-section">
        <div class="input-section-title">市场概况</div>
        <div class="input-grid market-grid">
          <div class="input-item">
            <label>上涨</label>
            <input v-model.number="form.upCount" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>下跌</label>
            <input v-model.number="form.downCount" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>涨停</label>
            <input v-model.number="form.limitUpCount" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>跌停</label>
            <input v-model.number="form.limitDownCount" type="number" min="0" />
          </div>
          <div class="input-item">
            <label>封板率%</label>
            <input v-model.number="form.sealRate" type="number" min="0" max="100" />
          </div>
          <div class="input-item">
            <label>炸板率%</label>
            <input v-model.number="form.brokenRate" type="number" min="0" max="100" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>领涨题材</label>
        <select v-model="form.leadingThemeId">
          <option value="">无</option>
          <option v-for="t in themeStore.themes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="form.note" rows="2" placeholder="可选"></textarea>
      </div>

      <button class="btn-primary btn-block" @click="handleSave">保存</button>
    </div>

    <!-- 空间板高度时间线 -->
    <div class="card" v-if="recentEmotions.length > 0">
      <div class="section-title">空间板高度时间线</div>
      <div class="height-timeline">
        <div
          v-for="(e, idx) in heightTimeline"
          :key="e.id"
          class="timeline-item"
          :class="{ breakthrough: e.isBreakthrough, today: idx === heightTimeline.length - 1 }"
        >
          <div class="timeline-date">{{ e.date.slice(5) }}</div>
          <div class="timeline-height">
            <span class="height-num">{{ e.maxBoardHeight }}</span>
            <span class="height-change" :class="e.changeClass">{{ e.changeText }}</span>
          </div>
          <div class="timeline-stock">{{ e.spaceBoardStockName || '-' }}</div>
          <div v-if="e.isBreakthrough" class="breakthrough-badge">破</div>
        </div>
      </div>
      <div class="timeline-chart">
        <canvas ref="chartRef" height="120"></canvas>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="card">
      <div class="section-title">历史记录</div>
      <div v-if="emotionStore.sortedEmotions.length === 0" class="empty-hint">暂无数据</div>
      <div v-else class="history-list">
        <div v-for="e in emotionStore.sortedEmotions" :key="e.id" class="history-row">
          <div class="history-main">
            <span class="history-date">{{ e.date.slice(5) }}</span>
            <span class="history-height" :class="{ breakthrough: e.isBreakthrough }">
              {{ e.maxBoardHeight }}板
              <span v-if="e.isBreakthrough" class="breakthrough-tag">破</span>
            </span>
            <span class="history-stock">{{ e.spaceBoardStockName || '-' }}</span>
          </div>
          <div class="history-side">
            <span class="tag" :class="phaseTagClass(e.phase)">{{ EMOTION_PHASE_LABELS[e.phase] }}</span>
            <span class="history-stats">{{ e.limitUpCount }}/{{ e.limitDownCount }}</span>
            <button class="btn-icon" @click="handleDelete(e.id)">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useEmotionStore } from '@/stores/emotion'
import { useThemeStore } from '@/stores/theme'
import { EMOTION_PHASE_LABELS, type EmotionPhase, type SpaceBoardStock } from '@/types'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'

const emotionStore = useEmotionStore()
const themeStore = useThemeStore()
const toast = useToast()

const chartRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: any = null

const phases: { key: EmotionPhase; label: string }[] = [
  { key: 'freeze', label: '冰点' },
  { key: 'repair', label: '修复' },
  { key: 'warm', label: '升温' },
  { key: 'climax', label: '高潮' },
  { key: 'retreat', label: '退潮' }
]

const latestEmotion = computed(() => emotionStore.latestEmotion)
const currentPhase = computed(() => latestEmotion.value?.phase ?? 'freeze')

const form = reactive({
  date: today(),
  // 指数
  shIndex: 0,
  shChange: 0,
  szIndex: 0,
  szChange: 0,
  cybIndex: 0,
  cybChange: 0,
  allAIndex: 0,
  allAChange: 0,
  allAVolume: 0,
  // 市场概况
  upCount: 0,
  downCount: 0,
  limitUpCount: 0,
  limitDownCount: 0,
  brokenRate: 0,
  sealRate: 0,
  // 接力结构
  board2Count: 0,
  board3Count: 0,
  board4Count: 0,
  board5Count: 0,
  board6PlusCount: 0,
  continuousBoardCount: 0,
  // 空间板
  maxBoardHeight: 0,
  spaceBoardStocks: [] as SpaceBoardStock[],
  prevHighBoard: 0,
  isBreakthrough: false,
  // 情绪
  phase: 'freeze' as EmotionPhase,
  leadingThemeId: '',
  note: ''
})

// 添加空间板个股
function addSpaceBoardStock() {
  form.spaceBoardStocks.push({ name: '', height: 0 })
}

// 移除空间板个股
function removeSpaceBoardStock(idx: number) {
  form.spaceBoardStocks.splice(idx, 1)
}

const recentEmotions = computed(() => {
  return [...emotionStore.sortedEmotions].reverse().slice(-15)
})

// 接力结构金字塔数据
const relayRows = computed(() => {
  const e = latestEmotion.value
  if (!e) return []

  const data = [
    { level: '6+板', count: e.board6PlusCount || 0 },
    { level: '5板', count: e.board5Count || 0 },
    { level: '4板', count: e.board4Count || 0 },
    { level: '3板', count: e.board3Count || 0 },
    { level: '2板', count: e.board2Count || 0 }
  ]

  const maxCount = Math.max(...data.map(d => d.count), 1)
  return data.map(d => ({
    level: d.level,
    count: d.count,
    width: Math.max(d.count / maxCount * 100, d.count > 0 ? 15 : 5) + '%'
  }))
})

// 空间板高度时间线数据
const heightTimeline = computed(() => {
  const emotions = recentEmotions.value
  return emotions.map((e, idx) => {
    const prev = idx > 0 ? emotions[idx - 1].maxBoardHeight : e.maxBoardHeight
    const change = e.maxBoardHeight - prev
    let changeText = ''
    let changeClass = ''

    if (idx === 0) {
      changeText = '-'
      changeClass = ''
    } else if (change > 0) {
      changeText = `+${change}`
      changeClass = 'up'
    } else if (change < 0) {
      changeText = `${change}`
      changeClass = 'down'
    } else {
      changeText = '0'
      changeClass = ''
    }

    return {
      ...e,
      changeText,
      changeClass
    }
  })
})

function loadEmotion() {
  const existing = emotionStore.getEmotionByDate(form.date)
  if (existing) {
    Object.assign(form, {
      // 指数
      shIndex: existing.shIndex || 0,
      shChange: existing.shChange || 0,
      szIndex: existing.szIndex || 0,
      szChange: existing.szChange || 0,
      cybIndex: existing.cybIndex || 0,
      cybChange: existing.cybChange || 0,
      // 市场概况
      upCount: existing.upCount,
      downCount: existing.downCount,
      limitUpCount: existing.limitUpCount,
      limitDownCount: existing.limitDownCount,
      brokenRate: existing.brokenRate,
      sealRate: existing.sealRate,
      // 接力结构
      board2Count: existing.board2Count,
      board3Count: existing.board3Count,
      board4Count: existing.board4Count || 0,
      board5Count: existing.board5Count || 0,
      board6PlusCount: existing.board6PlusCount || 0,
      continuousBoardCount: existing.continuousBoardCount,
      // 空间板
      maxBoardHeight: existing.maxBoardHeight,
      spaceBoardStocks: existing.spaceBoardStocks ? [...existing.spaceBoardStocks] : [],
      prevHighBoard: existing.prevHighBoard || 0,
      isBreakthrough: existing.isBreakthrough || false,
      // 情绪
      phase: existing.phase,
      leadingThemeId: existing.leadingThemeId,
      note: existing.note
    })
  } else {
    resetForm()
  }
}

function resetForm() {
  Object.assign(form, {
    shIndex: 0, shChange: 0, szIndex: 0, szChange: 0, cybIndex: 0, cybChange: 0,
    upCount: 0, downCount: 0, limitUpCount: 0, limitDownCount: 0,
    brokenRate: 0, sealRate: 0,
    board2Count: 0, board3Count: 0, board4Count: 0, board5Count: 0, board6PlusCount: 0,
    continuousBoardCount: 0, maxBoardHeight: 0,
    spaceBoardStocks: [], prevHighBoard: 0, isBreakthrough: false,
    phase: 'freeze' as EmotionPhase, leadingThemeId: '', note: ''
  })
}

function handleSave() {
  // 计算连板家数
  const continuousBoardCount = form.board2Count + form.board3Count + form.board4Count + form.board5Count + form.board6PlusCount

  // 计算空间板高度（取最高的）
  const maxBoardHeight = form.spaceBoardStocks.length > 0
    ? Math.max(...form.spaceBoardStocks.map(s => s.height || 0))
    : 0

  emotionStore.addOrUpdateEmotion({
    date: form.date,
    // 指数
    shIndex: form.shIndex,
    shChange: form.shChange,
    szIndex: form.szIndex,
    szChange: form.szChange,
    cybIndex: form.cybIndex,
    cybChange: form.cybChange,
    allAIndex: form.allAIndex,
    allAChange: form.allAChange,
    allAVolume: form.allAVolume,
    // 市场概况
    upCount: form.upCount,
    downCount: form.downCount,
    limitUpCount: form.limitUpCount,
    limitDownCount: form.limitDownCount,
    brokenRate: form.brokenRate,
    sealRate: form.sealRate,
    // 接力结构
    board2Count: form.board2Count,
    board3Count: form.board3Count,
    board4Count: form.board4Count,
    board5Count: form.board5Count,
    board6PlusCount: form.board6PlusCount,
    continuousBoardCount,
    // 空间板
    maxBoardHeight,
    spaceBoardStocks: form.spaceBoardStocks.filter(s => s.name && s.height > 0),
    prevHighBoard: form.prevHighBoard,
    isBreakthrough: form.isBreakthrough,
    // 情绪
    phase: form.phase,
    leadingThemeId: form.leadingThemeId,
    note: form.note
  })
  toast.success('已保存')
  renderChart()
}

function handleDelete(id: string) {
  emotionStore.deleteEmotion(id)
  toast.success('已删除')
  renderChart()
}

function phaseTagClass(phase: EmotionPhase) {
  const map: Record<EmotionPhase, string> = {
    freeze: 'tag-blue',
    repair: 'tag-yellow',
    warm: 'tag-orange',
    climax: 'tag-red',
    retreat: 'tag-green'
  }
  return map[phase]
}

async function renderChart() {
  if (!chartRef.value || recentEmotions.value.length === 0) return

  const Chart = (await import('chart.js')).default
  if (chartInstance) chartInstance.destroy()

  const data = recentEmotions.value
  const labels = data.map(e => e.date.slice(5))

  chartInstance = new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '空间板高度',
          data: data.map(e => e.maxBoardHeight),
          borderColor: '#f0c040',
          backgroundColor: 'rgba(240,192,64,0.15)',
          fill: true,
          tension: 0.2,
          pointRadius: data.map(e => e.isBreakthrough ? 6 : 3),
          pointBackgroundColor: data.map(e => e.isBreakthrough ? '#f85149' : '#f0c040')
        },
        {
          label: '涨停数',
          data: data.map(e => e.limitUpCount),
          borderColor: '#58a6ff',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.2,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8b949e', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
        y: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: 'rgba(48,54,61,0.5)' } }
      }
    }
  })
}

onMounted(() => {
  loadEmotion()
  renderChart()
})

watch(() => emotionStore.sortedEmotions.length, () => renderChart())
</script>

<style scoped>
/* 空间板核心卡片 */
.space-board-card {
  background: linear-gradient(135deg, rgba(240,192,64,0.15) 0%, rgba(240,192,64,0.05) 100%);
  border: 1px solid rgba(240,192,64,0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.space-height {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.height-value {
  font-size: 36px;
  font-weight: 700;
  color: #f0c040;
  line-height: 1;
}

.height-unit {
  font-size: 14px;
  color: #f0c040;
}

.height-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.space-info {
  flex: 1;
}

.space-stock {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.breakthrough-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

.breakthrough-status.active {
  color: #f85149;
  font-weight: 500;
}

.prev-high {
  margin-left: 8px;
  color: var(--text-tertiary);
}

/* 接力结构 */
.relay-structure {
  margin-bottom: 12px;
}

.section-title {
  font-weight: 500;
  margin-bottom: 10px;
}

.relay-pyramid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.relay-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.relay-level {
  width: 40px;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

.relay-bar {
  height: 20px;
  background: linear-gradient(90deg, #f0c040 0%, rgba(240,192,64,0.3) 100%);
  border-radius: 2px;
  transition: width 0.3s;
}

.relay-count {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 24px;
}

/* 情绪阶段 */
.phase-card {
  margin-bottom: 12px;
}

.phase-bar {
  display: flex;
  gap: 4px;
}

.phase-item {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 13px;
}

.phase-item.active {
  background: rgba(88,166,255,0.15);
  color: var(--color-blue);
  font-weight: 500;
}

/* 录入表单 */
.input-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.input-section:last-of-type {
  border-bottom: none;
  margin-bottom: 12px;
}

.input-section-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-add-stock {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--color-blue);
  color: #fff;
  border-radius: 4px;
}

/* 空间板列表 */
.space-board-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.space-board-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.height-input {
  width: 60px !important;
  text-align: center;
}

.board-unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.stock-name-input {
  flex: 1;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 16px;
  line-height: 1;
}

.btn-remove:hover {
  background: rgba(248,81,73,0.2);
  color: #f85149;
}

.empty-stock-hint {
  text-align: center;
  padding: 16px;
  color: var(--text-tertiary);
  font-size: 12px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.space-board-extra {
  display: flex;
  gap: 16px;
  align-items: center;
}

.input-item.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.input-item.inline .unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.input-grid {
  display: grid;
  gap: 8px;
}

.relay-grid {
  grid-template-columns: repeat(5, 1fr);
}

/* 指数输入 */
.index-input-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.index-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.index-label {
  width: 48px;
  font-size: 12px;
  color: var(--text-secondary);
}

.index-input-row input {
  flex: 1;
  padding: 6px 8px;
  font-size: 13px;
}

.space-grid {
  grid-template-columns: repeat(2, 1fr);
}

.market-grid {
  grid-template-columns: repeat(3, 1fr);
}

.input-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-item label {
  font-size: 11px;
  color: var(--text-secondary);
}

.input-item input {
  padding: 6px 8px;
  font-size: 13px;
}

.checkbox-item {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.checkbox-item label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
}

.btn-block {
  width: 100%;
}

/* 空间板高度时间线 */
.height-timeline {
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.timeline-item {
  flex-shrink: 0;
  width: 72px;
  padding: 10px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  text-align: center;
  position: relative;
  border: 1px solid transparent;
}

.timeline-item.today {
  border-color: #f0c040;
  background: rgba(240,192,64,0.1);
}

.timeline-item.breakthrough {
  border-color: #f85149;
}

.timeline-date {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.timeline-height {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 4px;
}

.height-num {
  font-size: 20px;
  font-weight: 700;
  color: #f0c040;
}

.timeline-item.breakthrough .height-num {
  color: #f85149;
}

.height-change {
  font-size: 11px;
  font-weight: 500;
}

.height-change.up {
  color: #f85149;
}

.height-change.down {
  color: #3fb950;
}

.timeline-stock {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breakthrough-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #f85149;
  color: #fff;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 500;
}

.timeline-chart {
  height: 120px;
}

/* 历史记录 */
.history-list {
  font-size: 13px;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.history-row:last-child {
  border-bottom: none;
}

.history-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-date {
  color: var(--text-secondary);
  font-size: 12px;
  min-width: 40px;
}

.history-height {
  font-weight: 500;
  color: #f0c040;
}

.history-height.breakthrough {
  color: #f85149;
}

.breakthrough-tag {
  font-size: 10px;
  background: #f85149;
  color: #fff;
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: 4px;
}

.history-stock {
  color: var(--text-secondary);
  font-size: 12px;
}

.history-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-stats {
  font-size: 11px;
  color: var(--text-tertiary);
}

.btn-icon {
  background: none;
  color: var(--text-tertiary);
  padding: 2px 6px;
  font-size: 14px;
  line-height: 1;
}

.btn-icon:hover {
  color: #f85149;
}

.empty-hint {
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .relay-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  .space-grid {
    grid-template-columns: 1fr 1fr;
  }
  .market-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .form-row {
    flex-direction: column;
  }
}
</style>
