<template>
  <div class="cycle-summary-page">
    <!-- 顶部导航 -->
    <div class="page-header">
      <div class="header-left">
        <button v-if="currentCycle" class="back-btn" @click="backToList">← 返回列表</button>
        <h1 class="page-title">{{ currentCycle ? currentCycle.name : '周期总结' }}</h1>
      </div>
      <div class="header-right" v-if="!currentCycle">
        <span class="count-hint" v-if="cycleSummaryStore.sortedSummaries.length > 0">
          共 {{ cycleSummaryStore.sortedSummaries.length }} 个周期
        </span>
      </div>
    </div>

    <!-- 周期列表视图 -->
    <div v-if="!currentCycle" class="cycle-list-view">
      <div v-if="cycleSummaryStore.sortedSummaries.length === 0" class="empty-state">
        <div class="empty-icon">○</div>
        <div class="empty-text">暂无保存的周期</div>
        <div class="empty-hint">请在看板的"交易风格与情绪周期"模块中点击"保存当前周期"按钮来创建周期总结</div>
      </div>
      <div v-else class="cycle-grid">
        <div
          v-for="cycle in cycleSummaryStore.sortedSummaries"
          :key="cycle.id"
          class="cycle-card"
          @click="selectCycle(cycle.id)"
        >
          <div class="card-header">
            <span class="cycle-name">{{ cycle.name }}</span>
            <span class="cycle-dates">{{ cycle.startDate.slice(5) }} ~ {{ cycle.endDate.slice(5) }}</span>
          </div>
          <div class="card-body">
            <div class="phase-progression" v-if="cycle.cyclePhaseSnapshot.length > 0">
              <template v-for="(p, idx) in sortPhases(cycle.cyclePhaseSnapshot)" :key="p.id">
                <span class="phase-chip" :style="{ background: getCyclePhaseColor(p.phase) }">
                  {{ getCyclePhaseLabel(p.phase) }}
                </span>
                <span v-if="idx < cycle.cyclePhaseSnapshot.length - 1" class="phase-arrow">→</span>
              </template>
            </div>
            <div class="phase-progression empty" v-else>
              <span class="no-phase">无情绪阶段记录</span>
            </div>
            <div class="cycle-summary-text" v-if="cycle.summary">{{ cycle.summary }}</div>
            <div class="cycle-desc" v-else-if="cycle.description">{{ cycle.description }}</div>
          </div>
          <div class="card-footer">
            <span class="footer-stat">情绪数据：{{ getCycleEmotionCount(cycle) }} 天</span>
            <span class="footer-stat">活跃题材：{{ getCycleThemeCount(cycle) }} 个</span>
            <span class="footer-stat">已平仓：{{ getCycleClosedCount(cycle) }} 笔</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 周期详情视图 -->
    <div v-else class="cycle-detail-view">
      <!-- 周期总结（用户输入对该周期的总结） -->
      <div class="detail-section summary-section">
        <div class="section-header">
          <div class="section-title">周期总结</div>
          <button v-if="!editingSummary" class="btn-edit-summary" @click="startEditSummary">编辑总结</button>
        </div>
        <div v-if="!editingSummary" class="summary-content">
          <div v-if="currentCycle.summary" class="summary-text">{{ currentCycle.summary }}</div>
          <div v-else class="summary-empty">
            <span class="empty-hint">暂无周期总结，点击"编辑总结"添加对该周期的总结</span>
          </div>
        </div>
        <div v-else class="summary-editor">
          <textarea
            v-model="summaryForm"
            rows="6"
            class="summary-textarea"
            placeholder="请输入对该周期的总结，例如：本周期主线题材、龙头表现、情绪节奏、关键事件、操作得失等..."
          ></textarea>
          <div class="summary-editor-actions">
            <button class="btn-cancel" @click="cancelEditSummary">取消</button>
            <button class="btn-save" @click="saveSummary">保存总结</button>
          </div>
        </div>
      </div>

      <!-- 周期概要 -->
      <div class="cycle-overview">
        <div class="overview-row">
          <div class="overview-item">
            <span class="overview-label">周期名称</span>
            <span class="overview-value">{{ currentCycle.name }}</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">起止时间</span>
            <span class="overview-value">{{ currentCycle.startDate }} ~ {{ currentCycle.endDate }}</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">交易日数</span>
            <span class="overview-value">{{ countTradingDays(currentCycle.startDate, currentCycle.endDate) }} 天</span>
          </div>
        </div>
        <div class="overview-desc" v-if="currentCycle.description">
          <span class="overview-label">周期说明：</span>
          <span>{{ currentCycle.description }}</span>
        </div>
        <!-- 情绪阶段进程 -->
        <div class="overview-phases" v-if="currentCycle.cyclePhaseSnapshot.length > 0">
          <span class="overview-label">情绪阶段进程：</span>
          <div class="phase-progression">
            <template v-for="(p, idx) in sortPhases(currentCycle.cyclePhaseSnapshot)" :key="p.id">
              <span class="phase-chip" :style="{ background: getCyclePhaseColor(p.phase) }">
                {{ getCyclePhaseLabel(p.phase) }}
                <span class="chip-date">{{ p.date.slice(5) }}</span>
              </span>
              <span v-if="idx < currentCycle.cyclePhaseSnapshot.length - 1" class="phase-arrow">→</span>
            </template>
          </div>
        </div>
        <!-- 交易风格进程 -->
        <div class="overview-phases" v-if="currentCycle.tradeStyleSnapshot.length > 0">
          <span class="overview-label">交易风格进程：</span>
          <div class="phase-progression">
            <template v-for="(s, idx) in sortStyles(currentCycle.tradeStyleSnapshot)" :key="s.id">
              <span class="style-chip" :style="{ background: getTradeStyleColor(s.style) }">
                {{ getTradeStyleLabel(s.style) }}
                <span class="chip-date">{{ s.date.slice(5) }}</span>
              </span>
              <span v-if="idx < currentCycle.tradeStyleSnapshot.length - 1" class="phase-arrow">→</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 周期内数据为空提示 -->
      <div v-if="cycleEmotions.length === 0" class="empty-state">
        <div class="empty-icon">○</div>
        <div class="empty-text">该周期内暂无情绪数据</div>
        <div class="empty-hint">请确保在看板中已录入该时间范围内的情绪数据</div>
      </div>

      <template v-else>
        <!-- 连板楼梯图 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">连板楼梯图</div>
            <span class="range-tag">{{ currentCycle.startDate.slice(5) }} ~ {{ currentCycle.endDate.slice(5) }}</span>
          </div>
          <StairChart
            :emotions="cycleEmotions"
            title="周期连板楼梯图"
            :chartId="`cycleStair_${currentCycle.id}`"
          />
        </div>

        <!-- 宏观指数变化 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">宏观指数变化</div>
            <span class="range-tag">{{ cycleEmotions.length }} 个交易日</span>
          </div>
          <div class="charts-grid" ref="macroChartsContainer">
            <div
              v-for="chart in macroCharts"
              :key="chart.key"
              class="chart-card"
            >
              <div class="chart-title">{{ chart.title }}</div>
              <div class="chart-container">
                <canvas :data-chart-key="chart.key"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- 市场概况变化 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">市场概况变化</div>
          </div>
          <div class="charts-grid" ref="marketChartsContainer">
            <div
              v-for="chart in marketCharts"
              :key="chart.key"
              class="chart-card"
            >
              <div class="chart-title">{{ chart.title }}</div>
              <div class="chart-container">
                <canvas :data-chart-key="chart.key"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- 已平仓记录 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">已平仓记录</div>
            <span class="range-tag" v-if="closedStats">{{ closedStats.total }} 笔</span>
          </div>
          <div v-if="cycleClosedPositions.length === 0" class="empty-hint small">该周期内暂无已平仓记录</div>
          <div v-else class="closed-section">
            <!-- 平仓统计 -->
            <div class="closed-stats" v-if="closedStats">
              <div class="stat-item" :class="closedStats.totalRealizedPnl >= 0 ? 'profit' : 'loss'">
                <span class="stat-label">总盈亏</span>
                <span class="stat-value">{{ formatPnl(closedStats.totalRealizedPnl) }}</span>
                <span class="stat-amount">含手续费 {{ formatAmount(closedStats.totalFee) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">胜率</span>
                <span class="stat-value">{{ (closedStats.winRate * 100).toFixed(0) }}%</span>
                <span class="stat-amount">{{ closedStats.winCount }}胜 {{ closedStats.lossCount }}负</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平仓笔数</span>
                <span class="stat-value">{{ closedStats.total }} 笔</span>
              </div>
            </div>

            <!-- 已平仓列表 -->
            <div class="closed-list">
              <div class="closed-header-row">
                <span class="col-stock">股票</span>
                <span class="col-date">买入</span>
                <span class="col-date">平仓</span>
                <span class="col-qty">数量</span>
                <span class="col-price">买价</span>
                <span class="col-price">卖价</span>
                <span class="col-pnl">盈亏</span>
                <span class="col-mode">模式</span>
              </div>
              <div
                v-for="(p, idx) in cycleClosedPositions"
                :key="p.stock.id + '-' + idx"
                class="closed-row"
                @click="$router.push(`/stocks/${p.stock.id}`)"
              >
                <span class="col-stock">
                  <span class="stock-name-text">{{ p.stock.name }}</span>
                  <span class="stock-code-text">{{ p.stock.code }}</span>
                </span>
                <span class="col-date">{{ p.buyDate?.slice(5) || '-' }}</span>
                <span class="col-date">{{ p.closeDate?.slice(5) || '-' }}</span>
                <span class="col-qty">{{ p.totalBuyQty }}</span>
                <span class="col-price">{{ p.avgBuyPrice.toFixed(2) }}</span>
                <span class="col-price">{{ p.avgSellPrice.toFixed(2) }}</span>
                <span class="col-pnl" :class="p.realizedPnl >= 0 ? 'profit' : 'loss'">
                  {{ formatPnl(p.realizedPnl) }}
                  <span class="pnl-rate">({{ (p.realizedPnlRate * 100).toFixed(1) }}%)</span>
                </span>
                <span class="col-mode">
                  <span
                    class="trade-mode-tag"
                    :style="{ background: getModeColor(p.modeId || ''), color: '#fff' }"
                  >{{ getModeName(p.modeId || '') }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 题材变化 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">题材变化</div>
            <span class="range-tag">{{ cycleThemes.length }} 个活跃题材</span>
          </div>
          <div v-if="cycleThemes.length === 0" class="empty-hint small">该周期内暂无题材记录</div>
          <div v-else class="theme-list">
            <div v-for="t in cycleThemes" :key="t.id" class="theme-row" @click="$router.push(`/themes/${t.id}`)">
              <span class="theme-level-tag" :class="`level-${t.level}`">{{ getThemeLevelLabel(t.level) }}</span>
              <span class="theme-name">{{ t.name }}</span>
              <span class="theme-sector">{{ t.sector }}</span>
              <span class="theme-status" :class="`status-${t.status}`">{{ getThemeStatusLabel(t.status) }}</span>
              <span class="theme-burst">启动：{{ t.burstDate.slice(5) }}</span>
              <span v-if="t.endDate" class="theme-end">结束：{{ t.endDate.slice(5) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 删除按钮 -->
      <div class="danger-zone" v-if="currentCycle">
        <button class="btn-delete" @click="showDeleteConfirm = true">删除该周期总结</button>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除周期总结"
      :message="`确定要删除周期「${currentCycle?.name}」吗？此操作不可撤销。`"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useCycleSummaryStore } from '@/stores/cycleSummary'
import { useEmotionStore } from '@/stores/emotion'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { useTradeModeStore } from '@/stores/tradeMode'
import { useCustomTradeStyleStore } from '@/stores/customTradeStyle'
import { useCustomCyclePhaseStore } from '@/stores/customCyclePhase'
import { useToast } from '@/composables/useToast'
import { loadData } from '@/composables/useStorage'
import type { CycleSummary as CycleSummaryType, CyclePhaseHistory, TradeStyleHistory, EmotionDaily, TradeRecord, Stock } from '@/types'
import { THEME_LEVEL_LABELS, THEME_STATUS_LABELS } from '@/types'

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

const route = useRoute()
const router = useRouter()
const cycleSummaryStore = useCycleSummaryStore()
const emotionStore = useEmotionStore()
const themeStore = useThemeStore()
const stockStore = useStockStore()
const tradeModeStore = useTradeModeStore()
const customTradeStyleStore = useCustomTradeStyleStore()
const customCyclePhaseStore = useCustomCyclePhaseStore()
const toast = useToast()

// 删除确认弹窗状态
const showDeleteConfirm = ref(false)

// ===== 周期总结编辑 =====
const editingSummary = ref(false)
const summaryForm = ref('')

function startEditSummary() {
  if (!currentCycle.value) return
  summaryForm.value = currentCycle.value.summary || ''
  editingSummary.value = true
}

function cancelEditSummary() {
  editingSummary.value = false
  summaryForm.value = ''
}

function saveSummary() {
  if (!currentCycle.value) return
  cycleSummaryStore.updateCycle(currentCycle.value.id, { summary: summaryForm.value })
  toast.success('周期总结已保存')
  editingSummary.value = false
}

// 当前选中的周期
const currentCycle = computed<CycleSummaryType | null>(() => {
  const id = route.params.id as string | undefined
  if (!id) return null
  return cycleSummaryStore.getById(id)
})

// 周期内的情绪数据（按日期升序）
const cycleEmotions = computed<EmotionDaily[]>(() => {
  if (!currentCycle.value) return []
  const { startDate, endDate } = currentCycle.value
  return [...emotionStore.emotions]
    .filter(e => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
})

// 周期内活跃的题材（启动日期在周期内 或 状态历史有变更在周期内）
const cycleThemes = computed(() => {
  if (!currentCycle.value) return []
  const { startDate, endDate } = currentCycle.value
  return themeStore.themes.filter(t => {
    // 题材启动日期在周期内
    if (t.burstDate >= startDate && t.burstDate <= endDate) return true
    // 题材在周期内结束
    if (t.endDate && t.endDate >= startDate && t.endDate <= endDate) return true
    // 题材跨越整个周期（启动早于周期开始，且未结束或结束晚于周期开始）
    if (t.burstDate < startDate && (!t.endDate || t.endDate >= startDate)) return true
    // 状态历史有周期内的变更
    if (t.statusHistory && t.statusHistory.some(sh => sh.date >= startDate && sh.date <= endDate)) return true
    return false
  }).sort((a, b) => a.burstDate.localeCompare(b.burstDate))
})

// 周期内的交易记录（含所属个股信息）
interface CycleTrade {
  stock: Stock
  trade: TradeRecord
}
const cycleTrades = computed<CycleTrade[]>(() => {
  if (!currentCycle.value) return []
  const { startDate, endDate } = currentCycle.value
  const result: CycleTrade[] = []
  for (const stock of stockStore.stocks) {
    if (!stock.trades || stock.trades.length === 0) continue
    for (const trade of stock.trades) {
      if (trade.date >= startDate && trade.date <= endDate) {
        result.push({ stock, trade })
      }
    }
  }
  return result.sort((a, b) => a.trade.date.localeCompare(b.trade.date))
})

// ===== 已平仓记录（FIFO配对，closeDate 在周期内） =====
interface PositionData {
  stock: Stock
  netQty: number
  totalBuyQty: number
  totalSellQty: number
  avgBuyPrice: number
  avgSellPrice: number
  avgCost: number
  totalCost: number
  pnl: number
  pnlRate: number
  realizedPnl: number
  realizedPnlRate: number
  totalFee: number
  buyDate?: string
  closeDate?: string
  modeId?: string
}

// 手续费设置（从存储中读取）
const settings = loadData().settings
const commissionRate = settings.commissionRate ?? 0.0003
const stampDutyRate = settings.stampDutyRate ?? 0.001
const minCommission = 5

// FIFO 配对计算已平仓记录
function computeClosedPositions(stock: Stock): PositionData[] {
  if (!stock.trades || stock.trades.length === 0) return []

  const sortedTrades = [...stock.trades].sort((a, b) => a.date.localeCompare(b.date))
  const buyQueue: { trade: TradeRecord; remainingQty: number; fee: number }[] = []
  const closedList: PositionData[] = []

  for (const t of sortedTrades) {
    const amount = t.price * t.quantity
    if (t.direction === 'buy') {
      const buyFee = Math.max(amount * commissionRate, minCommission)
      buyQueue.push({ trade: t, remainingQty: t.quantity, fee: buyFee })
    } else {
      let sellQty = t.quantity
      const sellAmount = amount
      const sellFee = Math.max(amount * commissionRate, minCommission) + amount * stampDutyRate

      let matchedBuyAmount = 0
      let matchedBuyQty = 0
      let matchedBuyFee = 0
      let firstBuyDate = ''
      let firstBuyModeId = ''

      while (sellQty > 0 && buyQueue.length > 0) {
        const buyItem = buyQueue[0]
        const matchQty = Math.min(sellQty, buyItem.remainingQty)
        const matchAmount = buyItem.trade.price * matchQty
        const matchFee = buyItem.fee * matchQty / buyItem.trade.quantity

        if (firstBuyDate === '') {
          firstBuyDate = buyItem.trade.date
          firstBuyModeId = buyItem.trade.modeId
        }

        matchedBuyAmount += matchAmount
        matchedBuyQty += matchQty
        matchedBuyFee += matchFee

        buyItem.remainingQty -= matchQty
        sellQty -= matchQty

        if (buyItem.remainingQty === 0) {
          buyQueue.shift()
        }
      }

      if (matchedBuyQty > 0) {
        const avgBuyPrice = matchedBuyAmount / matchedBuyQty
        const avgSellPrice = sellAmount / t.quantity
        const totalFee = matchedBuyFee + sellFee
        const realizedPnl = (avgSellPrice - avgBuyPrice) * matchedBuyQty - totalFee
        const realizedPnlRate = avgBuyPrice > 0 ? realizedPnl / (avgBuyPrice * matchedBuyQty) : 0

        closedList.push({
          stock,
          netQty: 0,
          totalBuyQty: matchedBuyQty,
          totalSellQty: matchedBuyQty,
          avgBuyPrice,
          avgSellPrice,
          avgCost: 0,
          totalCost: 0,
          pnl: 0,
          pnlRate: 0,
          realizedPnl,
          realizedPnlRate,
          totalFee,
          buyDate: firstBuyDate,
          closeDate: t.date,
          modeId: firstBuyModeId
        })
      }
    }
  }

  return closedList
}

// 周期内已平仓记录（closeDate 在周期时间范围内）
const cycleClosedPositions = computed<PositionData[]>(() => {
  if (!currentCycle.value) return []
  const { startDate, endDate } = currentCycle.value
  return stockStore.stocks
    .flatMap(s => computeClosedPositions(s))
    .filter(p => p.closeDate && p.closeDate >= startDate && p.closeDate <= endDate)
    .sort((a, b) => {
      const aDate = a.closeDate || ''
      const bDate = b.closeDate || ''
      return bDate.localeCompare(aDate) // 按平仓日期降序
    })
})

// 已平仓统计
const closedStats = computed(() => {
  const positions = cycleClosedPositions.value
  if (positions.length === 0) return null
  let totalRealizedPnl = 0
  let totalFee = 0
  let winCount = 0
  let lossCount = 0
  for (const p of positions) {
    totalRealizedPnl += p.realizedPnl
    totalFee += p.totalFee
    if (p.realizedPnl >= 0) winCount++
    else lossCount++
  }
  const winRate = positions.length > 0 ? winCount / positions.length : 0
  return { totalRealizedPnl, totalFee, winCount, lossCount, total: positions.length, winRate }
})

// 获取交易模式名称
function getModeName(modeId: string): string {
  const mode = tradeModeStore.getMode(modeId)
  return mode?.name || '未分类'
}

// 获取交易模式颜色
function getModeColor(modeId: string): string {
  const mode = tradeModeStore.getMode(modeId)
  return mode?.color || '#8b949e'
}

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  }
  return amount.toFixed(0)
}

// 格式化盈亏
function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : ''
  if (Math.abs(pnl) >= 10000) {
    return sign + (pnl / 10000).toFixed(2) + '万'
  }
  return sign + pnl.toFixed(0)
}

// 图表配置
const macroCharts = [
  { key: 'sh', title: '上证指数', color: '#f85149', fill: false },
  { key: 'sz', title: '深证指数', color: '#58a6ff', fill: false },
  { key: 'cyb', title: '创业板指数', color: '#3fb950', fill: false },
  { key: 'allA', title: '全A指数', color: '#a371f7', fill: false },
  { key: 'allAVolume', title: '成交量(亿)', color: '#f0c040', fill: true }
]

const marketCharts = [
  { key: 'up', title: '上涨家数', color: '#f85149', fill: true },
  { key: 'limitUp', title: '涨停家数', color: '#f0c040', fill: true },
  { key: 'limitDown', title: '跌停家数', color: '#3fb950', fill: true },
  { key: 'continuousBoard', title: '连板家数', color: '#f0c040', fill: true },
  { key: 'sealRate', title: '封板率%', color: '#58a6ff', fill: true },
  { key: 'height', title: '空间板高度', color: '#f0c040', fill: true }
]

// 容器 ref（通过 querySelectorAll 查找 canvas，避免函数 ref 时序问题）
const macroChartsContainer = ref<HTMLElement | null>(null)
const marketChartsContainer = ref<HTMLElement | null>(null)

// 图表实例
const chartInstances = ref<Record<string, any>>({})

function getChartData(key: string): number[] {
  const dataMap: Record<string, (e: any) => number> = {
    sh: e => e.shIndex || 0,
    sz: e => e.szIndex || 0,
    cyb: e => e.cybIndex || 0,
    allA: e => e.allAIndex || 0,
    allAVolume: e => e.allAVolume || 0,
    up: e => e.upCount || 0,
    limitUp: e => e.limitUpCount || 0,
    limitDown: e => e.limitDownCount || 0,
    continuousBoard: e => e.continuousBoardCount || 0,
    sealRate: e => e.sealRate || 0,
    height: e => e.maxBoardHeight || 0
  }
  return cycleEmotions.value.map(dataMap[key] || (e => 0))
}

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
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      titleFont: { size: 12, weight: 'bold' as const },
      bodyFont: { size: 11 }
    }
  },
  scales: {
    x: {
      ticks: { color: '#8b949e', font: { size: 10 }, maxRotation: 0 },
      grid: { color: 'rgba(48,54,61,0.15)', drawBorder: false }
    },
    y: {
      ticks: { color: '#8b949e', font: { size: 10 }, padding: 4 },
      grid: { color: 'rgba(48,54,61,0.15)', drawBorder: false }
    }
  },
  animation: { duration: 300 }
}

function createGradient(ctx: CanvasRenderingContext2D, color: string, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  gradient.addColorStop(0, `rgba(${r},${g},${b},0.2)`)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

function createChart(canvas: HTMLCanvasElement, config: any) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const height = 120
  const data = getChartData(config.key)
  const labels = cycleEmotions.value.map(e => e.date.slice(5))

  return new ChartJS(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: config.title,
        data,
        borderColor: config.color,
        backgroundColor: config.fill ? createGradient(ctx, config.color, height) : 'transparent',
        borderWidth: 2,
        fill: config.fill,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: config.color,
        pointBorderColor: 'rgba(22,27,34,0.8)',
        pointBorderWidth: 1,
        pointHoverRadius: 5
      }]
    },
    options: chartOptions
  })
}

function destroyAllCharts() {
  Object.keys(chartInstances.value).forEach(key => {
    if (chartInstances.value[key]) {
      chartInstances.value[key].destroy()
      chartInstances.value[key] = null
    }
  })
}

function renderAllCharts(): void {
  destroyAllCharts()
  const allConfigs = [...macroCharts, ...marketCharts]
  let renderedCount = 0

  // 通过 querySelectorAll 在容器内查找 canvas（避免函数 ref 时序问题）
  const containers = [macroChartsContainer.value, marketChartsContainer.value]
  const canvasMap = new Map<string, HTMLCanvasElement>()
  for (const container of containers) {
    if (!container) continue
    const canvases = container.querySelectorAll('canvas[data-chart-key]')
    canvases.forEach(canvas => {
      const key = canvas.getAttribute('data-chart-key')
      if (key) canvasMap.set(key, canvas as HTMLCanvasElement)
    })
  }

  for (const config of allConfigs) {
    const canvas = canvasMap.get(config.key)
    if (canvas) {
      chartInstances.value[config.key] = createChart(canvas, config)
      renderedCount++
    }
  }
}

// 统一调度：等待 DOM 就绪后渲染图表
let renderTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer)
  destroyAllCharts()

  if (!currentCycle.value || cycleEmotions.value.length === 0) return

  // 多次 nextTick + 延迟，确保 Vue 条件渲染的 DOM 已挂载
  renderTimer = setTimeout(async () => {
    await nextTick()
    // 再等一帧让浏览器完成布局
    requestAnimationFrame(() => {
      renderAllCharts()
      // 如果首次渲染未成功，延迟再试一次
      const total = macroCharts.length + marketCharts.length
      const rendered = Object.values(chartInstances.value).filter(Boolean).length
      if (rendered < total) {
        setTimeout(() => renderAllCharts(), 300)
      }
    })
  }, 200)
}

// 组件挂载后尝试渲染（处理直接访问详情页 URL 的场景）
onMounted(() => {
  scheduleRender()
})

// 路由参数变化时重新渲染（处理从列表跳转详情的场景）
watch(() => route.params.id, () => {
  scheduleRender()
})

// 情绪数据变化时重新渲染
watch(() => cycleEmotions.value.length, () => {
  scheduleRender()
})

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
  destroyAllCharts()
})

// 工具方法
function getCyclePhaseLabel(phase: any) {
  return customCyclePhaseStore.getLabelByKey(phase) || phase
}

function getTradeStyleLabel(style: any) {
  return customTradeStyleStore.getLabelByKey(style) || style
}

function getCyclePhaseColor(phase: any) {
  return customCyclePhaseStore.getColorByKey(phase) || '#8b949e'
}

function getTradeStyleColor(style: any) {
  return customTradeStyleStore.getColorByKey(style) || '#8b949e'
}

function getThemeLevelLabel(level: any) {
  return THEME_LEVEL_LABELS[level as keyof typeof THEME_LEVEL_LABELS] || level
}

function getThemeStatusLabel(status: any) {
  return THEME_STATUS_LABELS[status as keyof typeof THEME_STATUS_LABELS] || status
}

function sortPhases(phases: CyclePhaseHistory[]) {
  return [...phases].sort((a, b) => a.date.localeCompare(b.date))
}

function sortStyles(styles: TradeStyleHistory[]) {
  return [...styles].sort((a, b) => a.date.localeCompare(b.date))
}

function countTradingDays(startDate: string, endDate: string): number {
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return Math.max(count, 1)
}

function getCycleEmotionCount(cycle: CycleSummaryType): number {
  return emotionStore.emotions.filter(e => e.date >= cycle.startDate && e.date <= cycle.endDate).length
}

function getCycleThemeCount(cycle: CycleSummaryType): number {
  return themeStore.themes.filter(t => {
    if (t.burstDate >= cycle.startDate && t.burstDate <= cycle.endDate) return true
    if (t.endDate && t.endDate >= cycle.startDate && t.endDate <= cycle.endDate) return true
    if (t.burstDate < cycle.startDate && (!t.endDate || t.endDate >= cycle.startDate)) return true
    return false
  }).length
}

function getCycleClosedCount(cycle: CycleSummaryType): number {
  let count = 0
  for (const stock of stockStore.stocks) {
    if (!stock.trades) continue
    const closed = computeClosedPositions(stock)
    count += closed.filter(p => p.closeDate && p.closeDate >= cycle.startDate && p.closeDate <= cycle.endDate).length
  }
  return count
}

// 导航
function selectCycle(id: string) {
  router.push(`/cycle-summary/${id}`)
}

function backToList() {
  router.push('/cycle-summary')
}

async function handleDelete() {
  if (!currentCycle.value) return
  const id = currentCycle.value.id
  const name = currentCycle.value.name
  cycleSummaryStore.deleteCycle(id)
  showDeleteConfirm.value = false
  toast.success(`已删除周期「${name}」`)
  router.push('/cycle-summary')
}
</script>

<style scoped>
.cycle-summary-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.back-btn:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.count-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 列表视图 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-text {
  font-size: 15px;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 380px;
  margin: 0 auto;
  line-height: 1.6;
}

.empty-hint.small {
  padding: 20px;
}

.cycle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.cycle-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cycle-card:hover {
  border-color: rgba(88,166,255,0.5);
  box-shadow: 0 2px 12px rgba(88,166,255,0.08);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.cycle-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-blue);
}

.cycle-dates {
  font-size: 11px;
  color: var(--text-tertiary);
}

.card-body {
  margin-bottom: 10px;
}

.phase-progression {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.phase-progression.empty {
  margin-bottom: 0;
}

.no-phase {
  font-size: 11px;
  color: var(--text-tertiary);
}

.phase-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}

.chip-date {
  margin-left: 4px;
  font-size: 9px;
  opacity: 0.7;
  font-weight: 400;
}

.phase-arrow {
  color: var(--text-tertiary);
  font-size: 10px;
}

.style-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}

.cycle-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.footer-stat {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 详情视图 */
.cycle-overview {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px;
}

.overview-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.overview-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.overview-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}

.overview-phases {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.overview-phases .overview-label {
  padding-top: 3px;
}

.detail-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
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

.range-tag {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
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
  padding: 10px;
}

.chart-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.chart-container {
  height: 120px;
  width: 100%;
}

/* 题材列表 */
.theme-list {
  display: flex;
  flex-direction: column;
}

.theme-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 12px;
  flex-wrap: wrap;
}

.theme-row:hover {
  background: var(--bg-tertiary);
  margin: 0 -4px;
  padding: 8px 8px;
}

.theme-row:last-child {
  border-bottom: none;
}

.theme-level-tag {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.theme-level-tag.level-main { background: rgba(248,81,73,0.15); color: #f85149; }
.theme-level-tag.level-sub { background: rgba(88,166,255,0.15); color: #58a6ff; }
.theme-level-tag.level-rotation { background: rgba(139,148,158,0.15); color: #8b949e; }

.theme-name {
  font-weight: 500;
  color: var(--text-primary);
}

.theme-sector {
  color: var(--text-tertiary);
  font-size: 11px;
}

.theme-status {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.theme-status.status-burst { background: rgba(248,81,73,0.15); color: #f85149; }
.theme-status.status-ferment { background: rgba(240,192,64,0.15); color: #f0c040; }
.theme-status.status-climax { background: rgba(248,81,73,0.2); color: #f85149; }
.theme-status.status-diverge { background: rgba(163,113,247,0.15); color: #a371f7; }
.theme-status.status-retreat { background: rgba(139,148,158,0.15); color: #8b949e; }
.theme-status.status-rebound { background: rgba(63,185,80,0.15); color: #3fb950; }
.theme-status.status-adjust { background: rgba(139,148,158,0.1); color: var(--text-secondary); }
.theme-status.status-repair { background: rgba(88,166,255,0.15); color: #58a6ff; }

.theme-burst, .theme-end {
  color: var(--text-tertiary);
  font-size: 11px;
}

/* 已平仓记录 */
.closed-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.closed-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.closed-stats .stat-item {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  border-left: 3px solid var(--text-tertiary);
}

.closed-stats .stat-item.profit {
  border-left-color: #f85149;
}

.closed-stats .stat-item.loss {
  border-left-color: #3fb950;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value.profit {
  color: #f85149;
}

.stat-value.loss {
  color: #3fb950;
}

.stat-amount {
  font-size: 11px;
  color: var(--text-secondary);
}

.closed-list {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.closed-header-row,
.closed-row {
  display: grid;
  grid-template-columns: 1.4fr 0.7fr 0.7fr 0.6fr 0.7fr 0.7fr 1fr 0.8fr;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  align-items: center;
}

.closed-header-row {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
}

.closed-row {
  border-top: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
}

.closed-row:hover {
  background: var(--bg-tertiary);
}

.col-stock {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stock-name-text {
  font-weight: 500;
  color: var(--text-primary);
}

.stock-code-text {
  font-size: 10px;
  color: var(--text-tertiary);
}

.col-date {
  color: var(--text-secondary);
  font-size: 11px;
}

.col-qty {
  color: var(--text-secondary);
}

.col-price {
  color: var(--text-primary);
}

.col-pnl {
  font-weight: 600;
}

.col-pnl.profit {
  color: #f85149;
}

.col-pnl.loss {
  color: #3fb950;
}

.pnl-rate {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.8;
}

.col-mode {
  display: flex;
}

.trade-mode-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
  white-space: nowrap;
}

/* 危险区域 */
.danger-zone {
  padding: 16px;
  border: 1px dashed rgba(248,81,73,0.3);
  border-radius: 8px;
  text-align: center;
  margin-top: 8px;
}

/* 周期总结编辑模块 */
.summary-section {
  border-left: 3px solid var(--color-blue);
}

.btn-edit-summary {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.btn-edit-summary:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
  background: rgba(88,166,255,0.08);
}

.summary-content {
  min-height: 40px;
  display: flex;
  align-items: flex-start;
}

.summary-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.summary-empty .empty-hint {
  color: var(--text-tertiary);
  font-size: 12px;
}

.summary-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-textarea {
  width: 100%;
  min-height: 140px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.summary-textarea:focus {
  outline: none;
  border-color: var(--color-blue);
}

.summary-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel, .btn-save {
  padding: 5px 14px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid var(--border-color);
}

.btn-cancel {
  background: transparent;
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-save {
  background: var(--color-blue);
  border-color: var(--color-blue);
  color: #fff;
}

.btn-save:hover {
  filter: brightness(1.1);
}

/* 列表卡片中的周期总结 */
.cycle-summary-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-top: 6px;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  border-left: 2px solid var(--color-blue);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.btn-delete {
  padding: 6px 16px;
  font-size: 12px;
  background: rgba(248,81,73,0.1);
  border: 1px solid rgba(248,81,73,0.3);
  border-radius: 4px;
  color: #f85149;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete:hover {
  background: rgba(248,81,73,0.2);
}

@media (max-width: 768px) {
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
  .overview-row {
    gap: 16px;
  }
  .closed-header-row,
  .closed-row {
    grid-template-columns: 1.4fr 0.7fr 0.7fr 1fr 0.8fr;
    font-size: 11px;
  }
  .closed-header-row .col-qty,
  .closed-row .col-qty,
  .closed-header-row .col-price,
  .closed-row .col-price:nth-child(6),
  .closed-header-row .col-mode,
  .closed-row .col-mode {
    display: none;
  }
}
</style>
