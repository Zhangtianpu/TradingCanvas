<template>
  <div class="dashboard">
    <!-- 面板操作按钮 -->
    <div class="panel-toolbar">
      <span class="toolbar-hint">拖动模块调整顺序</span>
      <button class="toolbar-btn save" :class="{ saved: layoutSaved }" @click="saveLayout">{{ layoutSaved ? '已保存' : '保存布局' }}</button>
      <button class="toolbar-btn reset" @click="resetLayout">重置布局</button>
    </div>
    <div class="dashboard-grid">
      <div
        v-for="module in sortedModules"
        :key="module.id"
        class="dashboard-module"
        :class="{ dragging: dragId === module.id }"
        draggable="true"
        @dragstart="onDragStart(module.id, $event)"
        @dragend="onDragEnd"
        @dragover.prevent
        @drop="onDrop(module.id, $event)"
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
              <div class="space-status" :class="{ active: latestEmotion ? hasBreakthroughInChart1(latestEmotion) : false }">
                {{ latestEmotion && hasBreakthroughInChart1(latestEmotion) ? '高度突破' : '未突破' }}
              </div>
            </div>
          </div>
        </template>

        <!-- 持仓概览 -->
        <template v-else-if="module.id === 'positions'">
          <PositionCard />
        </template>

        <!-- 情绪锚定 -->
        <template v-else-if="module.id === 'emotionAnchor'">
          <EmotionAnchorPanel :show-history="false" :show-rule="false" />
        </template>

        <!-- 连板楼梯图 -->
        <template v-else-if="module.id === 'stairChart'">
          <StairChart v-if="allSortedEmotions.length > 0" :emotions="allSortedEmotions" title="连板楼梯图" chartId="stairChart1" />
        </template>

        <!-- 连板楼梯图2 -->
        <template v-else-if="module.id === 'stairChart2'">
          <StairChart v-if="allSortedEmotions.length > 0" :emotions="allSortedEmotions" title="连板楼梯图2" chartId="stairChart2" />
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
              <router-link to="/line-chart-manage" class="chart-manage-link">管理折线图与均线</router-link>
            </div>

            <div v-if="chartConfigs.length === 0" class="charts-empty">
              当前没有启用的折线图，<router-link to="/line-chart-manage">前往折线图管理</router-link>添加。
            </div>

            <!-- 分组图表 -->
            <div v-else class="chart-groups">
              <div v-for="group in chartGroups" :key="group.name" class="chart-group">
                <div class="group-header">
                  <span class="group-name">{{ group.name }}</span>
                  <span v-if="group.name !== '宏观指数'" class="date-marker-legends">
                    <span v-for="marker in dateMarkerDefs" :key="marker.key" class="clear-marker-legend">
                      <i :style="{ background: marker.color }">{{ marker.badge || marker.name.slice(0, 1) }}</i>{{ marker.name }}
                    </span>
                  </span>
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
                      <span>{{ chart.title }}</span>
                      <span class="chart-title-actions">
                        <span
                          v-for="average in chartStore.preferences[chart.key].averages"
                          :key="average.id"
                          class="average-badge"
                          :style="{ color: average.color }"
                        >{{ average.type === 'cumulative' ? '累计' : `MA${average.period}` }}</span>
                        <span class="expand-icon">{{ expandedChartKey === chart.key ? '⊖' : '⊕' }}</span>
                      </span>
                    </div>
                    <div v-if="expandedChartKey === chart.key" class="scroll-hint">← 左右滑动查看全部历史数据 →</div>
                    <div
                      :ref="el => setChartScrollRef(chart.key, el)"
                      class="chart-scroll"
                      :class="{ expanded: expandedChartKey === chart.key }"
                      @click.stop="handleChartAreaClick(chart.key)"
                    >
                      <div
                        class="chart-container"
                        :class="{ expanded: expandedChartKey === chart.key }"
                        :style="expandedChartKey === chart.key ? { width: expandedChartWidth } : undefined"
                        @pointermove="showPointTooltip(chart.key, $event)"
                        @pointerleave="hidePointTooltip(chart.key)"
                      >
                        <canvas
                          :key="`${chart.key}-${expandedChartKey === chart.key ? 'expanded' : 'compact'}`"
                          :data-dashboard-chart="chart.key"
                        ></canvas>
                        <div
                          v-if="chartPointTooltips[chart.key]"
                          class="chart-point-tooltip"
                          :class="{ below: chartPointTooltips[chart.key].below }"
                          :style="{
                            left: `${chartPointTooltips[chart.key].x}px`,
                            top: `${chartPointTooltips[chart.key].y}px`
                          }"
                        >
                          <span>{{ chartPointTooltips[chart.key].date }}</span>
                          <strong>{{ chartPointTooltips[chart.key].value }}</strong>
                          <em
                            v-for="marker in chartPointTooltips[chart.key].markers"
                            :key="marker.key"
                            :style="{ color: marker.color }"
                          >{{ marker.name }}</em>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 个股分析 -->
        <template v-else-if="module.id === 'stockFlow'">
          <StockFlowPanel />
        </template>

        <!-- 交易风格与情绪周期 -->
        <template v-else-if="module.id === 'cycle'">
          <CyclePanel />
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
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { useEmotionStore } from '@/stores/emotion'
import { useReviewStore } from '@/stores/review'
import { useLineChartStore } from '@/stores/lineChart'
import { useIndependentLabelStore } from '@/stores/independentLabel'
import type { LineChartDefinition, LineChartKey, MovingAverageConfig } from '@/stores/lineChart'
import type { EmotionDaily, IndependentLabel } from '@/types'
import { buildContinuousBoardPromotionRates } from '@/composables/useEmotionMetrics'
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
import StockFlowPanel from '@/components/StockFlowPanel.vue'
import PositionCard from '@/components/PositionCard.vue'
import EmotionAnchorPanel from '@/components/EmotionAnchorPanel.vue'

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
const chartStore = useLineChartStore()
const labelStore = useIndependentLabelStore()
const dateMarkerDefs = computed(() => labelStore.sortedLabels.filter(label => label.category === 'stairDate'))

// ===== 模块拖拽排序 =====
interface DashboardModule {
  id: string
  name: string
}

const defaultModules: DashboardModule[] = [
  { id: 'spaceBoard', name: '空间板' },
  { id: 'emotionAnchor', name: '情绪锚定' },
  { id: 'positions', name: '持仓概览' },
  { id: 'stairChart', name: '连板楼梯图' },
  { id: 'stairChart2', name: '连板楼梯图2' },
  { id: 'stockFlow', name: '个股分析' },
  { id: 'cycle', name: '交易风格与情绪周期' },
  { id: 'charts', name: '趋势图表' },
  { id: 'themes', name: '活跃题材' }
]

const moduleOrder = ref<string[]>([])

function loadModuleOrder() {
  const saved = localStorage.getItem('dashboardModuleOrder')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((id: string) => defaultModules.some(m => m.id === id))
        if (filtered.length === defaultModules.length) {
          moduleOrder.value = filtered
          return
        }
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

// 图表配置
const chartConfigs = computed(() => chartStore.enabledDefinitions)

// 图表分组
const chartGroups = computed(() => ['宏观指数', '涨跌概况', '连板情绪'].map(name => ({
  name,
  charts: chartConfigs.value.filter(chart => chart.group === name)
})).filter(group => group.charts.length > 0))

// 时间范围选项
const timeRanges = [
  { label: '5天', value: 5 },
  { label: '10天', value: 10 },
  { label: '20天', value: 20 },
  { label: '30天', value: 30 }
]
const selectedRange = ref(20)
const customRange = ref<number | null>(null)

function applyCustomRange() {
  if (customRange.value && customRange.value >= 1 && customRange.value <= 365) {
    selectedRange.value = customRange.value
    customRange.value = null
  }
}

// 图表refs存储
const chartScrollRefs = ref<Record<string, HTMLElement | null>>({})
const chartInstances = ref<Record<string, any>>({})
const chartPointTooltips = ref<Record<string, { x: number; y: number; date: string; value: string; below: boolean; markers: IndependentLabel[] }>>({})
let chartRenderVersion = 0

function setChartScrollRef(key: string, el: any) {
  if (el) chartScrollRefs.value[key] = el
}

function getVisibleChartCanvas(key: string) {
  return document.querySelector<HTMLCanvasElement>(`canvas[data-dashboard-chart="${key}"]`)
}

// 展开的图表
const expandedChartKey = ref<string | null>(null)

const latestEmotion = computed(() => emotionStore.latestEmotion)

const recentEmotions = computed(() => {
  return [...emotionStore.sortedEmotions].reverse().slice(-selectedRange.value)
})

function getEmotionsForChart(key: string) {
  const all = [...emotionStore.sortedEmotions].reverse()
  return expandedChartKey.value === key ? all : all.slice(-selectedRange.value)
}

const expandedChartWidth = computed(() => `${Math.max(900, allSortedEmotions.value.length * 52)}px`)

// 读取stairChart1的标签覆盖数据（空间板高度折线图以第一个天梯图为准）
function getChart1TagOverrides(): Record<string, Record<string, any>> {
  const saved = localStorage.getItem('stairChartTags_stairChart1')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return {}
    }
  }
  return {}
}

// 检查某日在stairChart1中是否有突破标记
function hasBreakthroughInChart1(e: EmotionDaily): boolean {
  const allTags = getChart1TagOverrides()
  const dateTags = allTags[e.date]
  if (!dateTags) return e.isBreakthrough // 没有覆盖表时用原始数据
  return Object.values(dateTags).some((t: any) => t.isBreakthrough)
}

// 检查某日在stairChart1中是否有冰点标记
function hasIcePointInChart1(e: EmotionDaily): boolean {
  const allTags = getChart1TagOverrides()
  const dateTags = allTags[e.date]
  if (!dateTags) return e.isIcePoint // 没有覆盖表时用原始数据
  return Object.values(dateTags).some((t: any) => t.isIcePoint)
}

// 全部情绪数据（从旧到新），供连板楼梯图组件独立控制显示范围
const allSortedEmotions = computed(() => {
  return [...emotionStore.sortedEmotions].reverse()
})

// 图表通用配置
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'nearest' as const, axis: 'x' as const },
  hover: { intersect: false, mode: 'nearest' as const },
  events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'] as Array<'mousemove' | 'mouseout' | 'click' | 'touchstart' | 'touchmove'>,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: false,
      position: 'nearest' as const,
      mode: 'nearest' as const,
      intersect: false,
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
function getChartDataForEmotions(key: LineChartKey, emotions: EmotionDaily[]): number[] {
  if (key === 'promotionRate') {
    const rates = buildContinuousBoardPromotionRates(emotionStore.emotions)
    return emotions.map(e => rates[e.date] || 0)
  }
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
  return emotions.map(dataMap[key] || (e => 0))
}

function getChartData(key: LineChartKey): number[] {
  return getChartDataForEmotions(key, getEmotionsForChart(key))
}

function calculateMovingAverage(values: number[], average: MovingAverageConfig): Array<number | null> {
  let runningTotal = 0
  return values.map((value, index) => {
    runningTotal += value
    if (average.type === 'cumulative') return Number((runningTotal / (index + 1)).toFixed(4))

    const period = average.period || 2
    if (index < period - 1) return null
    let total = 0
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) total += values[cursor]
    return Number((total / period).toFixed(4))
  })
}

function getAverageData(key: LineChartKey, emotions: EmotionDaily[], average: MovingAverageConfig) {
  const allEmotions = allSortedEmotions.value
  const allValues = getChartDataForEmotions(key, allEmotions)
  const allAverages = calculateMovingAverage(allValues, average)
  const valuesByDate = new Map(allEmotions.map((emotion, index) => [emotion.date, allAverages[index]]))
  return emotions.map(emotion => valuesByDate.get(emotion.date) ?? null)
}

function createAverageDatasets(config: LineChartDefinition, emotions: EmotionDaily[]) {
  return chartStore.preferences[config.key].averages.map(average => ({
    label: average.type === 'cumulative' ? '开始至今均线' : `${average.period}日均线`,
    data: getAverageData(config.key, emotions, average),
    borderColor: average.color,
    backgroundColor: 'transparent',
    borderWidth: 1.8,
    borderDash: average.type === 'cumulative' ? [6, 4] : [],
    fill: false,
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 0,
    spanGaps: true
  }))
}

function showsDateMarkers(config: LineChartDefinition) {
  return config.group === '涨跌概况' || config.group === '连板情绪'
}

function emotionDateTagKeys(emotion: EmotionDaily) {
  const keys = new Set(emotion.stairDateTags || [])
  if (emotion.isClear) keys.add('isClear')
  if (emotion.isLeaderBreak) keys.add('isLeaderBreak')
  return [...keys]
}

function getEmotionDateMarkers(emotion: EmotionDaily) {
  const keys = emotionDateTagKeys(emotion)
  return dateMarkerDefs.value.filter(marker => keys.includes(marker.key))
}

function primaryDateMarker(config: LineChartDefinition, emotion: EmotionDaily) {
  return showsDateMarkers(config) ? getEmotionDateMarkers(emotion)[0] : undefined
}

function createDateMarkerPlugin(config: LineChartDefinition, emotions: EmotionDaily[]) {
  return {
    id: `date-marker-${config.key}`,
    afterDatasetsDraw(chart: any) {
      if (!showsDateMarkers(config)) return
      const points = chart.getDatasetMeta(0)?.data || []
      const ctx = chart.ctx as CanvasRenderingContext2D
      ctx.save()
      ctx.font = '700 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      emotions.forEach((emotion, index) => {
        const markers = getEmotionDateMarkers(emotion)
        if (!markers.length || !points[index]) return
        const point = points[index]
        markers.forEach((marker, markerIndex) => {
          const offset = (markerIndex - (markers.length - 1) / 2) * 13
          ctx.fillStyle = marker.color
          ctx.fillText(marker.badge || marker.name.slice(0, 1), point.x + offset, Math.max(12, point.y - 8))
        })
      })
      ctx.restore()
    }
  }
}

function formatChartValue(key: string, value: number): string {
  if (['sh', 'sz', 'cyb', 'allA'].includes(key)) return value.toFixed(2) + ' 点'
  if (key === 'sealRate' || key === 'promotionRate') return value.toFixed(2) + '%'
  if (key === 'height') return value.toFixed(0) + ' 板'
  if (key === 'targetStocks') return value.toFixed(0) + ' 个'
  return value.toLocaleString() + ' 家'
}

function chartTooltipTitle(emotions: EmotionDaily[], items: any[]): string {
  const index = items[0]?.dataIndex
  return emotions[index]?.date || items[0]?.label || ''
}

function chartTooltipLabel(config: any, context: any): string {
  return `${config.title}：${formatChartValue(config.key, Number(context.parsed.y) || 0)}`
}

function showPointTooltip(key: LineChartKey, event: PointerEvent) {
  const chart = chartInstances.value[key]
  const canvas = chart?.canvas as HTMLCanvasElement | undefined
  if (!chart || !canvas) return

  const points = chart.getDatasetMeta(0)?.data || []
  if (points.length === 0) return

  const rect = canvas.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  points.forEach((point: any, index: number) => {
    const distance = Math.abs(point.x - pointerX)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  const point = points[nearestIndex]
  const emotions = getEmotionsForChart(key)
  const values = getChartData(key)
  const emotion = emotions[nearestIndex]
  if (!point || !emotion) return

  chartPointTooltips.value = {
    ...chartPointTooltips.value,
    [key]: {
      x: Math.min(Math.max(point.x, 52), rect.width - 52),
      y: point.y,
      date: emotion.date,
      value: formatChartValue(key, values[nearestIndex] || 0),
      below: point.y < 55,
      markers: getEmotionDateMarkers(emotion)
    }
  }
}

function hidePointTooltip(key: LineChartKey) {
  if (!chartPointTooltips.value[key]) return
  const next = { ...chartPointTooltips.value }
  delete next[key]
  chartPointTooltips.value = next
}

// 创建单线图表
function createChart(canvas: HTMLCanvasElement, config: LineChartDefinition) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const height = 140
  const emotions = getEmotionsForChart(config.key)
  const data = getChartData(config.key)
  const labels = emotions.map(e => e.date.slice(5))

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
          pointRadius: emotions.map(e => {
            // 以第一个天梯图的标签为准
            if (primaryDateMarker(config, e)) return 7
            if (hasIcePointInChart1(e) || hasBreakthroughInChart1(e)) return 6
            return 3
          }),
          pointBackgroundColor: emotions.map(e => {
            // 以第一个天梯图的标签为准
            const dateMarker = primaryDateMarker(config, e)
            if (dateMarker) return dateMarker.color
            if (hasIcePointInChart1(e)) return '#58a6ff'
            if (hasBreakthroughInChart1(e)) return '#f85149'
            return config.color
          }),
          pointBorderColor: 'rgba(22,27,34,0.8)',
          pointBorderWidth: 1.5,
          pointHoverRadius: 7,
          pointHitRadius: 18
        }, ...createAverageDatasets(config, emotions)]
      },
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          tooltip: {
            ...chartOptions.plugins.tooltip,
            callbacks: {
              title: (items: any[]) => chartTooltipTitle(emotions, items),
              label: (context: any) => chartTooltipLabel(config, context),
              afterLabel: function(context: any) {
                const e = emotions[context.dataIndex]
                const labels: string[] = []
                // 以第一个天梯图的标签为准
                if (hasIcePointInChart1(e)) {
                  labels.push('🔵 冰点')
                }
                if (hasBreakthroughInChart1(e)) {
                  labels.push('🔴 高度突破')
                }
                // 显示空间板个股
                if (e.spaceBoardStocks && e.spaceBoardStocks.length > 0) {
                  labels.push(...e.spaceBoardStocks.map((s: any) => `${s.name}(${s.height}板)`))
                }
                return labels
              }
            }
          }
        }
      },
      plugins: [createDateMarkerPlugin(config, emotions)]
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
        pointRadius: emotions.map(e => primaryDateMarker(config, e) ? 7 : 3),
        pointBackgroundColor: emotions.map(e => primaryDateMarker(config, e)?.color || config.color),
        pointBorderColor: 'rgba(22,27,34,0.8)',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHitRadius: 18,
        pointHoverBackgroundColor: config.color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }, ...createAverageDatasets(config, emotions)]
    },
    options: {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          ...chartOptions.plugins.tooltip,
          callbacks: {
            title: (items: any[]) => chartTooltipTitle(emotions, items),
            label: (context: any) => chartTooltipLabel(config, context)
          }
        }
      }
    },
    plugins: [createDateMarkerPlugin(config, emotions)]
  })
}

// 销毁所有图表
function destroyAllCharts() {
  Object.keys(chartInstances.value).forEach(key => {
    if (chartInstances.value[key]) {
      chartInstances.value[key].destroy()
    }
    delete chartInstances.value[key]
  })
}

// 渲染所有图表
function renderAllCharts() {
  destroyAllCharts()
  chartConfigs.value.forEach(config => {
    const canvas = getVisibleChartCanvas(config.key)
    if (canvas?.isConnected) {
      chartInstances.value[config.key] = createChart(canvas, config)
    }
  })
}

function waitForChartLayout() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function toggleExpand(key: string) {
  const renderVersion = ++chartRenderVersion
  chartPointTooltips.value = {}
  expandedChartKey.value = expandedChartKey.value === key ? null : key
  await nextTick()
  await waitForChartLayout()
  if (renderVersion !== chartRenderVersion) return
  renderAllCharts()
  await waitForChartLayout()
  if (renderVersion !== chartRenderVersion) return
  if (expandedChartKey.value === key) {
    chartInstances.value[key]?.resize()
    const scroller = chartScrollRefs.value[key]
    if (scroller) scroller.scrollLeft = scroller.scrollWidth
  }
}

function handleChartAreaClick(key: string) {
  toggleExpand(key)
}

// 普通视图时间范围变化时重新渲染
watch(selectedRange, async () => {
  destroyAllCharts()
  await nextTick()
  renderAllCharts()
})

watch(() => chartStore.preferences, async () => {
  if (expandedChartKey.value && !chartStore.preferences[expandedChartKey.value as LineChartKey]?.enabled) {
    expandedChartKey.value = null
  }
  await nextTick()
  renderAllCharts()
}, { deep: true })

// 监听天梯图标签更新（以第一个天梯图为准）
function onStairChartTagsUpdated(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail?.chartId === 'stairChart1' || detail?.dateTags) {
    destroyAllCharts()
    nextTick(() => renderAllCharts())
  }
}

onMounted(async () => {
  await nextTick()
  setTimeout(() => renderAllCharts(), 100)
  window.addEventListener('stairChartTagsUpdated', onStairChartTagsUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('stairChartTagsUpdated', onStairChartTagsUpdated)
  chartRenderVersion += 1
  destroyAllCharts()
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

.chart-manage-link {
  margin-left: auto;
  padding: 5px 9px;
  background: rgba(88,166,255,.1);
  border: 1px solid rgba(88,166,255,.25);
  border-radius: 4px;
  font-size: 11px;
}

.charts-empty {
  padding: 28px 16px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  text-align: center;
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

.date-marker-legends {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.clear-marker-legend {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.clear-marker-legend i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #fff;
  background: var(--color-orange);
  border-radius: 50%;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
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

.chart-title-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.average-badge {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .2px;
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
  position: relative;
}

.chart-container.expanded {
  height: 280px;
}

.chart-scroll { width: 100%; overflow: hidden; }
.chart-scroll canvas { cursor: crosshair; }

.chart-point-tooltip {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 86px;
  padding: 6px 9px;
  color: #c9d1d9;
  background: rgba(22, 27, 34, 0.96);
  border: 1px solid rgba(88, 166, 255, 0.5);
  border-radius: 7px;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.32);
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 9px));
  white-space: nowrap;
}

.chart-point-tooltip::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 8px;
  height: 8px;
  background: rgba(22, 27, 34, 0.96);
  border-right: 1px solid rgba(88, 166, 255, 0.5);
  border-bottom: 1px solid rgba(88, 166, 255, 0.5);
  transform: translateX(-50%) rotate(45deg);
}

.chart-point-tooltip.below {
  transform: translate(-50%, 9px);
}

.chart-point-tooltip.below::after {
  top: -5px;
  bottom: auto;
  border: 0;
  border-top: 1px solid rgba(88, 166, 255, 0.5);
  border-left: 1px solid rgba(88, 166, 255, 0.5);
}

.chart-point-tooltip strong {
  color: var(--color-blue);
  font-size: 12px;
}

.chart-point-tooltip em {
  margin-top: 2px;
  color: var(--color-orange);
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
}

.chart-scroll.expanded {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 7px;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: rgba(88,166,255,.55) var(--bg-tertiary);
}

.chart-scroll.expanded:active { cursor: grabbing; }

.chart-scroll.expanded::-webkit-scrollbar { height: 8px; }
.chart-scroll.expanded::-webkit-scrollbar-track { background: var(--bg-tertiary); border-radius: 4px; }
.chart-scroll.expanded::-webkit-scrollbar-thumb { background: rgba(88,166,255,.55); border-radius: 4px; }

.scroll-hint { margin: -2px 0 7px; color: var(--text-tertiary); font-size: 10px; text-align: right; }

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
