<template>
  <div class="dashboard">
    <!-- 面板操作按钮 -->
    <div class="panel-toolbar">
      <span class="toolbar-hint">拖动模块调整顺序 | 点击模块后滚轮缩放时间范围</span>
      <button class="toolbar-btn save" :class="{ saved: layoutSaved }" @click="saveLayout">{{ layoutSaved ? '已保存' : '保存布局' }}</button>
      <button class="toolbar-btn reset" @click="resetLayout">重置布局</button>
    </div>
    <div class="dashboard-grid">
      <div
        v-for="module in sortedModules"
        :key="module.id"
        class="dashboard-module"
        :class="{ dragging: dragId === module.id, active: activeModule === module.id }"
        draggable="true"
        @dragstart="onDragStart(module.id, $event)"
        @dragend="onDragEnd"
        @dragover.prevent
        @drop="onDrop(module.id, $event)"
        @click="setActiveModule(module.id)"
        @wheel="onWheel(module.id, $event)"
      >
        <!-- 空间板 -->
        <template v-if="module.id === 'spaceBoard'">
          <div class="space-board-card">
            <div class="space-left">
              <div class="space-label">最高板</div>
              <div class="space-height">{{ latestEmotion?.maxBoardHeight ?? '-' }}</div>
              <div class="space-unit">板</div>
            </div>
            <div class="space-right">
              <div class="space-stocks">
                <span v-for="(s, idx) in latestEmotion?.spaceBoardStocks" :key="idx" class="stock-tag">
                  {{ s.name }}({{ s.height }}板)
                </span>
                <span v-if="!latestEmotion?.spaceBoardStocks?.length">-</span>
              </div>
              <div class="space-status" :class="{ active: latestEmotion?.isBreakthrough }">
                {{ latestEmotion?.isBreakthrough ? '高度突破' : '未突破' }}
              </div>
            </div>
          </div>
        </template>

        <!-- 连板楼梯图 -->
        <template v-else-if="module.id === 'stairChart'">
          <StairChart v-if="recentEmotions.length > 0" :emotions="recentEmotions" :dateRange="selectedRange" />
        </template>

        <!-- 趋势图表 -->
        <template v-else-if="module.id === 'charts'">
          <div class="charts-section" v-if="recentEmotions.length > 0">
            <!-- 时间范围选择 -->
            <div class="chart-controls">
              <span class="control-label">显示范围：</span>
              <button
                v-for="r in timeRanges"
                :key="r.value"
                class="range-btn"
                :class="{ active: selectedRange === r.value }"
                @click="selectedRange = r.value"
              >{{ r.label }}</button>
              <div class="custom-range">
                <input
                  type="number"
                  v-model.number="customRange"
                  min="1"
                  max="365"
                  class="range-input"
                  placeholder="天数"
                />
                <button class="range-btn" @click="applyCustomRange">确定</button>
              </div>
            </div>

            <!-- 分组图表 -->
            <div class="chart-groups">
              <div v-for="group in chartGroups" :key="group.name" class="chart-group">
                <div class="group-header">
                  <span class="group-name">{{ group.name }}</span>
                </div>
                <div class="charts-grid">
                  <div
                    v-for="chart in group.charts"
                    :key="chart.key"
                    class="chart-card"
                    :class="{ expanded: expandedChartKey === chart.key }"
                    @click="toggleExpand(chart.key)"
                  >
                    <div class="chart-title">
                      {{ chart.title }}
                      <span class="expand-icon">{{ expandedChartKey === chart.key ? '⊖' : '⊕' }}</span>
                    </div>
                    <div class="chart-container" :class="{ expanded: expandedChartKey === chart.key }">
                      <canvas :ref="el => setChartRef(chart.key, el)"></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 交易风格与情绪周期 -->
        <template v-else-if="module.id === 'cycle'">
          <CyclePanel />
        </template>

        <!-- 历史记录 -->
        <template v-else-if="module.id === 'history'">
          <div class="card history-card">
            <div class="section-header" @click="historyCollapsed = !historyCollapsed">
              <div class="section-title">历史记录</div>
              <span class="collapse-icon">{{ historyCollapsed ? '▶' : '▼' }}</span>
            </div>
            <div v-if="!historyCollapsed">
              <div v-if="emotionStore.sortedEmotions.length === 0" class="empty-hint">暂无数据</div>
              <div v-else class="history-table-wrapper">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>上证</th>
                      <th>上涨</th>
                      <th>下跌</th>
                      <th>涨停</th>
                      <th>跌停</th>
                      <th>最高板</th>
                      <th>个股</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="e in emotionStore.sortedEmotions" :key="e.id" :class="{ today: e.date === today() }">
                      <td class="date-col">{{ e.date.slice(5) }}</td>
                      <td :class="e.shChange >= 0 ? 'up' : 'down'">
                        {{ e.shChange >= 0 ? '+' : '' }}{{ (e.shChange || 0).toFixed(2) }}%
                      </td>
                      <td class="up">{{ e.upCount || '-' }}</td>
                      <td class="down">{{ e.downCount || '-' }}</td>
                      <td class="up">{{ e.limitUpCount || '-' }}</td>
                      <td class="down">{{ e.limitDownCount || '-' }}</td>
                      <td class="height-col" :class="{ breakthrough: e.isBreakthrough }">
                        {{ e.maxBoardHeight || '-' }}板
                        <span v-if="e.isBreakthrough" class="breakthrough-tag">破</span>
                      </td>
                      <td class="stock-col">
                        <span v-for="(s, idx) in e.spaceBoardStocks" :key="idx" class="stock-item">
                          {{ s.name }}({{ s.height }})
                        </span>
                        <span v-if="!e.spaceBoardStocks?.length">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- 活跃题材 -->
        <template v-else-if="module.id === 'themes'">
          <ThemeTree />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { useEmotionStore } from '@/stores/emotion'
import { useReviewStore } from '@/stores/review'
import { today } from '@/composables/useDate'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import StairChart from '@/components/StairChart.vue'
import ThemeTree from '@/components/ThemeTree.vue'
import CyclePanel from '@/components/CyclePanel.vue'

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
)

const themeStore = useThemeStore()
const stockStore = useStockStore()
const emotionStore = useEmotionStore()
const reviewStore = useReviewStore()

// ===== 模块拖拽排序 =====
interface DashboardModule {
  id: string
  name: string
}

const defaultModules: DashboardModule[] = [
  { id: 'spaceBoard', name: '空间板' },
  { id: 'stairChart', name: '连板楼梯图' },
  { id: 'cycle', name: '交易风格与情绪周期' },
  { id: 'charts', name: '趋势图表' },
  { id: 'history', name: '历史记录' },
  { id: 'themes', name: '活跃题材' }
]

const moduleOrder = ref<string[]>([])

function loadModuleOrder() {
  const saved = localStorage.getItem('dashboardModuleOrder')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length === defaultModules.length) {
        moduleOrder.value = parsed
        return
      }
    } catch {}
  }
  moduleOrder.value = defaultModules.map(m => m.id)
}

function saveModuleOrder() {
  localStorage.setItem('dashboardModuleOrder', JSON.stringify(moduleOrder.value))
}

const sortedModules = computed(() => {
  return moduleOrder.value.map(id => defaultModules.find(m => m.id === id)!).filter(Boolean)
})

const dragId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)

function onDragStart(id: string, e: DragEvent) {
  dragId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}

function onDragEnd() {
  dragId.value = null
  dropTargetId.value = null
}

function onDrop(targetId: string, e: DragEvent) {
  if (!dragId.value || dragId.value === targetId) return

  const fromIndex = moduleOrder.value.indexOf(dragId.value)
  const toIndex = moduleOrder.value.indexOf(targetId)

  if (fromIndex !== -1 && toIndex !== -1) {
    const newOrder = [...moduleOrder.value]
    newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, dragId.value)
    moduleOrder.value = newOrder
  }
}

// 保存布局
const layoutSaved = ref(false)
function saveLayout() {
  saveModuleOrder()
  layoutSaved.value = true
  setTimeout(() => { layoutSaved.value = false }, 2000)
}

// 重置布局
function resetLayout() {
  moduleOrder.value = defaultModules.map(m => m.id)
  saveModuleOrder()
}

// 初始化加载排序
loadModuleOrder()

// 当前激活的模块（用于滚轮缩放）
const activeModule = ref<string | null>(null)

function setActiveModule(id: string) {
  activeModule.value = id
}

// 滚轮缩放时间范围
function onWheel(id: string, e: WheelEvent) {
  // 只对有时间范围的模块生效
  if (id !== 'charts' && id !== 'stairChart') return
  e.preventDefault()
  const delta = e.deltaY > 0 ? 5 : -5  // 向下滚动增加范围，向上减少
  selectedRange.value = Math.max(3, Math.min(120, selectedRange.value + delta))
}

// 图表配置
const chartConfigs = [
  { key: 'sh', title: '上证指数', color: '#f85149', fill: false },
  { key: 'sz', title: '深证指数', color: '#58a6ff', fill: false },
  { key: 'cyb', title: '创业板指数', color: '#3fb950', fill: false },
  { key: 'allA', title: '全A指数', color: '#a371f7', fill: false },
  { key: 'up', title: '上涨家数', color: '#f85149', fill: true },
  { key: 'limitUp', title: '涨停家数', color: '#f0c040', fill: true },
  { key: 'limitDown', title: '跌停家数', color: '#3fb950', fill: true },
  { key: 'continuousBoard', title: '连板家数', color: '#f0c040', fill: true },
  { key: 'sealRate', title: '封板率', color: '#58a6ff', fill: true },
  { key: 'height', title: '空间板高度', color: '#f0c040', fill: true, special: true },
  { key: 'targetStocks', title: '目标标的', color: '#a371f7', fill: true, special: 'review' }
]

// 图表分组
const chartGroups = computed(() => [
  { name: '宏观指数', charts: chartConfigs.filter(c => ['sh', 'sz', 'cyb', 'allA'].includes(c.key)) },
  { name: '涨跌概况', charts: chartConfigs.filter(c => ['up', 'limitUp', 'limitDown'].includes(c.key)) },
  { name: '连板情绪', charts: chartConfigs.filter(c => ['continuousBoard', 'sealRate', 'height', 'targetStocks'].includes(c.key)) }
])

// 时间范围选项
const timeRanges = [
  { label: '5天', value: 5 },
  { label: '10天', value: 10 },
  { label: '20天', value: 20 },
  { label: '30天', value: 30 }
]
const selectedRange = ref(20)
const customRange = ref<number | null>(null)

// 历史记录折叠状态
const historyCollapsed = ref(false)

function applyCustomRange() {
  if (customRange.value && customRange.value >= 1 && customRange.value <= 365) {
    selectedRange.value = customRange.value
    customRange.value = null
  }
}

// 图表refs存储
const chartRefs = ref<Record<string, HTMLCanvasElement | null>>({})
const chartInstances = ref<Record<string, any>>({})

function setChartRef(key: string, el: any) {
  if (el) chartRefs.value[key] = el
}

// 展开的图表
const expandedChartKey = ref<string | null>(null)

const latestEmotion = computed(() => emotionStore.latestEmotion)

const recentEmotions = computed(() => {
  return [...emotionStore.sortedEmotions].reverse().slice(-selectedRange.value)
})

// 图表通用配置
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(22,27,34,0.95)',
      titleColor: '#f0f6fc',
      bodyColor: '#c9d1d9',
      borderColor: 'rgba(48,54,61,0.6)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      titleFont: { size: 13, weight: 'bold' as const },
      bodyFont: { size: 12 }
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#8b949e',
        font: { size: 10 },
        maxRotation: 0
      },
      grid: {
        color: 'rgba(48,54,61,0.15)',
        drawBorder: false,
        lineWidth: 1
      }
    },
    y: {
      ticks: {
        color: '#8b949e',
        font: { size: 10 },
        padding: 4
      },
      grid: {
        color: 'rgba(48,54,61,0.15)',
        drawBorder: false,
        lineWidth: 1
      }
    }
  },
  animation: {
    duration: 300
  }
}

// 创建渐变色
function createGradient(ctx: CanvasRenderingContext2D, color: string, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  gradient.addColorStop(0, `rgba(${r},${g},${b},0.2)`)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

// 获取图表数据
function getChartData(key: string): number[] {
  const dataMap: Record<string, (e: any) => number> = {
    sh: e => e.shIndex || 0,
    sz: e => e.szIndex || 0,
    cyb: e => e.cybIndex || 0,
    allA: e => e.allAIndex || 0,
    up: e => e.upCount || 0,
    limitUp: e => e.limitUpCount || 0,
    limitDown: e => e.limitDownCount || 0,
    continuousBoard: e => e.continuousBoardCount || 0,
    sealRate: e => e.sealRate || 0,
    height: e => e.maxBoardHeight || 0,
    targetStocks: e => reviewStore.getReviewByDate(e.date)?.targetStocks || 0
  }
  return recentEmotions.value.map(dataMap[key] || (e => 0))
}

// 创建单线图表
function createChart(canvas: HTMLCanvasElement, config: any) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const height = 140
  const data = getChartData(config.key)
  const labels = recentEmotions.value.map(e => e.date.slice(5))

  // 空间板高度特殊处理
  if (config.key === 'height') {
    return new ChartJS(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: config.title,
          data,
          borderColor: config.color,
          backgroundColor: config.fill ? createGradient(ctx, config.color, height) : 'transparent',
          borderWidth: 2.5,
          fill: config.fill,
          tension: 0.4,
          pointRadius: recentEmotions.value.map(e => e.isBreakthrough ? 5 : 3),
          pointBackgroundColor: recentEmotions.value.map(e => e.isBreakthrough ? '#f85149' : config.color),
          pointBorderColor: 'rgba(22,27,34,0.8)',
          pointBorderWidth: 1.5,
          pointHoverRadius: 7
        }]
      },
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          tooltip: {
            ...chartOptions.plugins.tooltip,
            callbacks: {
              afterLabel: function(context: any) {
                const e = recentEmotions.value[context.dataIndex]
                if (e.spaceBoardStocks && e.spaceBoardStocks.length > 0) {
                  return e.spaceBoardStocks.map((s: any) => `${s.name}(${s.height}板)`)
                }
                return ''
              }
            }
          }
        }
      }
    })
  }

  return new ChartJS(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: config.title,
        data,
        borderColor: config.color,
        backgroundColor: config.fill ? createGradient(ctx, config.color, height) : 'transparent',
        borderWidth: 2.5,
        fill: config.fill,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: config.color,
        pointBorderColor: 'rgba(22,27,34,0.8)',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: config.color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: chartOptions
  })
}

// 销毁所有图表
function destroyAllCharts() {
  Object.keys(chartInstances.value).forEach(key => {
    if (chartInstances.value[key]) {
      chartInstances.value[key].destroy()
      chartInstances.value[key] = null
    }
  })
}

// 渲染所有图表
function renderAllCharts() {
  destroyAllCharts()
  chartConfigs.forEach(config => {
    const canvas = chartRefs.value[config.key]
    if (canvas) {
      chartInstances.value[config.key] = createChart(canvas, config)
    }
  })
}

// 切换展开状态 - 不销毁图表，只调用resize
async function toggleExpand(key: string) {
  expandedChartKey.value = expandedChartKey.value === key ? null : key

  // 等待DOM更新完成（CSS高度变化）
  await nextTick()
  // 再等一帧确保布局完成
  requestAnimationFrame(() => {
    // 对所有图表调用resize，让Chart.js适应新的容器尺寸
    Object.keys(chartInstances.value).forEach(k => {
      if (chartInstances.value[k]) {
        chartInstances.value[k].resize()
      }
    })
  })
}

// 监听时间范围变化重新渲染
watch(selectedRange, async () => {
  destroyAllCharts()
  await nextTick()
  renderAllCharts()
})

onMounted(async () => {
  await nextTick()
  setTimeout(() => renderAllCharts(), 100)
})

watch(() => emotionStore.sortedEmotions.length, async () => {
  destroyAllCharts()
  await nextTick()
  renderAllCharts()
})
</script>

<style scoped>
/* 面板工具栏 */
.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-right: auto;
}

.toolbar-btn {
  padding: 4px 14px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
}

.toolbar-btn:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.toolbar-btn.save {
  background: var(--color-blue);
  color: #fff;
  border-color: var(--color-blue);
}

.toolbar-btn.save:hover {
  filter: brightness(1.1);
}

.toolbar-btn.save.saved {
  background: #3fb950;
  border-color: #3fb950;
}

.toolbar-btn.reset:hover {
  border-color: #f85149;
  color: #f85149;
}

/* 模块拖拽 */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-module {
  position: relative;
  transition: transform 0.2s, opacity 0.2s, border-color 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 4px;
}

.dashboard-module:hover {
  border-color: rgba(88,166,255,0.4);
  box-shadow: 0 0 12px rgba(88,166,255,0.08);
}

.dashboard-module.active {
  border-color: var(--color-blue);
  box-shadow: 0 0 16px rgba(88,166,255,0.15);
}

.dashboard-module.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.section-title {
  font-weight: 500;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.link-more {
  font-size: 12px;
  color: var(--color-blue);
}

/* 空间板 */
.space-board-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(240,192,64,0.15) 0%, rgba(240,192,64,0.05) 100%);
  border: 1px solid rgba(240,192,64,0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.space-left {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-right: 16px;
}

.space-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.space-height {
  font-size: 32px;
  font-weight: 700;
  color: #f0c040;
}

.space-unit {
  font-size: 14px;
  color: #f0c040;
}

.space-right {
  flex: 1;
}

.space-stocks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.stock-tag {
  font-size: 13px;
  font-weight: 500;
  padding: 2px 8px;
  background: rgba(240,192,64,0.2);
  border-radius: 4px;
  color: #f0c040;
}

.space-stock {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.space-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

.space-status.active {
  color: #f85149;
  font-weight: 500;
}

/* 接力结构 */
.relay-card {
  margin-bottom: 12px;
}

.relay-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.relay-item {
  text-align: center;
  padding: 10px 4px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.relay-level {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.relay-count {
  font-size: 16px;
  font-weight: 600;
  color: #f0c040;
}

/* 情绪阶段 */
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

/* 图表 */
.chart-card {
  margin-bottom: 12px;
}

.chart-tabs {
  display: flex;
  gap: 4px;
}

.chart-tab {
  padding: 4px 12px;
  font-size: 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 4px;
}

.chart-tab.active {
  background: var(--color-blue);
  color: #fff;
}

/* 趋势图表 */
.charts-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.control-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.range-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.range-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--color-blue);
}

.range-btn.active {
  background: var(--color-blue);
  color: #fff;
  border-color: var(--color-blue);
}

.custom-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.range-input {
  width: 60px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  text-align: center;
}

.range-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

/* 图表分组 */
.chart-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
}

.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  position: relative;
  padding-left: 12px;
}

.group-name::before {
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

.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.chart-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  overflow: hidden;
}

.chart-card:hover {
  border-color: rgba(88,166,255,0.3);
}

.chart-card.expanded {
  grid-column: 1 / -1;
  border-color: var(--color-blue);
}

.chart-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expand-icon {
  font-size: 14px;
  color: var(--text-tertiary);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.chart-card:hover .expand-icon {
  opacity: 1;
}

.chart-card.expanded .expand-icon {
  opacity: 1;
  color: var(--color-blue);
}

.chart-container {
  height: 140px;
  width: 100%;
}

.chart-container.expanded {
  height: 280px;
}

/* 历史记录 */
.history-card {
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding-bottom: 12px;
  user-select: none;
}

.section-header:hover .section-title {
  color: var(--text-primary);
}

.collapse-icon {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.history-table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.history-table th,
.history-table td {
  padding: 8px 6px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
}

.history-table th {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 11px;
}

.history-table tr.today {
  background: rgba(88,166,255,0.1);
}

.history-table tr.today td {
  font-weight: 500;
}

.date-col {
  color: var(--text-secondary);
}

.up { color: var(--color-red); }
.down { color: var(--color-green); }

.height-col {
  color: #f0c040;
  font-weight: 500;
}

.height-col.breakthrough {
  color: #f85149;
}

.breakthrough-tag {
  display: inline-block;
  font-size: 9px;
  background: #f85149;
  color: #fff;
  padding: 1px 3px;
  border-radius: 2px;
  margin-left: 2px;
}

.stock-col {
  color: var(--text-secondary);
  max-width: 120px;
  text-align: left !important;
}

.stock-item {
  display: inline-block;
  margin-right: 4px;
  font-size: 11px;
}

.stock-item::after {
  content: '、';
}

.stock-item:last-child::after {
  content: '';
}

/* 题材列表 */
.theme-list {
  font-size: 13px;
}

.theme-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.theme-row:last-child {
  border-bottom: none;
}

.theme-row:hover {
  background: var(--bg-tertiary);
  margin: 0 -16px;
  padding: 8px 16px;
}

.theme-name {
  font-weight: 500;
}

.leader {
  color: var(--color-gold);
  font-size: 12px;
  margin-left: auto;
}

.empty-hint {
  color: var(--text-tertiary);
  text-align: center;
  padding: 16px;
  font-size: 13px;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .relay-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .chart-card {
    padding: 8px;
  }
  .chart-container {
    height: 100px;
  }
  .chart-container.expanded {
    height: 200px;
  }
}
</style>
