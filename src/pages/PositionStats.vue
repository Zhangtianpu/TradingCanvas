<template>
  <div class="position-stats-page">
    <div class="page-header">
      <h1 class="page-title">持仓统计</h1>
      <button class="btn-add-trade" @click="openAddTrade">+ 添加交易</button>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-grid">
      <div class="card stat-card">
        <div class="stat-label">总投入</div>
        <div class="stat-value">{{ formatMoney(totalCost) }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">当前市值</div>
        <div class="stat-value">{{ formatMoney(totalValue) }}</div>
      </div>
      <div class="card stat-card" :class="{ profit: totalPnl > 0, loss: totalPnl < 0 }">
        <div class="stat-label">浮动盈亏</div>
        <div class="stat-value">{{ formatMoney(totalPnl) }}</div>
        <div class="stat-sub" v-if="totalCost > 0">{{ formatPct(totalPnlRate) }}</div>
      </div>
      <div class="card stat-card" :class="{ profit: realizedPnl > 0, loss: realizedPnl < 0 }">
        <div class="stat-label">已实现盈亏</div>
        <div class="stat-value">{{ formatMoney(realizedPnl) }}</div>
      </div>
    </div>

    <!-- 模式胜率统计 -->
    <div class="card mode-stats" v-if="modeStats.length > 0">
      <div class="mode-stats-title">模式统计</div>
      <div class="mode-stats-grid">
        <div v-for="m in modeStats" :key="m.modeId" class="mode-stat-item">
          <div class="mode-stat-header">
            <span class="mode-stat-name">
              <span class="mode-dot" :style="{ background: m.color }"></span>
              {{ m.label }}
            </span>
            <span class="mode-stat-rate" :class="{ win: m.winRate >= 50, loss: m.winRate < 50 }">
              {{ m.winRate.toFixed(0) }}%
            </span>
          </div>
          <div class="mode-stat-detail">
            <span>{{ m.winCount }}胜 / {{ m.lossCount }}负</span>
            <span :class="{ win: m.totalPnl >= 0, loss: m.totalPnl < 0 }">
              {{ m.totalPnl >= 0 ? '+' : '' }}{{ formatMoney(m.totalPnl) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'positions' }" @click="tab = 'positions'">
        当前持仓 <span class="tab-count" v-if="positions.length">{{ positions.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: tab === 'closed' }" @click="tab = 'closed'">
        已平仓 <span class="tab-count" v-if="closedPositions.length">{{ closedPositions.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: tab === 'trades' }" @click="tab = 'trades'">
        交易记录 <span class="tab-count" v-if="allTrades.length">{{ allTrades.length }}</span>
      </button>
    </div>

    <!-- 当前持仓 -->
    <div v-if="tab === 'positions'">
      <div v-if="positions.length === 0" class="empty-state card">
        <p>暂无持仓</p>
        <p class="hint">在个股详情页添加买卖记录后会自动统计</p>
      </div>
      <div v-else class="position-list">
        <div v-for="p in positions" :key="p.stock.id" class="card position-card">
          <div class="pos-header">
            <span class="pos-name" @click="$router.push(`/stocks/${p.stock.id}`)">{{ p.stock.name }}</span>
            <span class="pos-code">{{ p.stock.code }}</span>
            <span class="pos-theme">{{ getThemeName(p.stock.themeId) }}</span>
          </div>
          <div class="pos-grid">
            <div class="pos-item">
              <span class="pos-label">持仓</span>
              <span class="pos-val">{{ p.netQty.toLocaleString() }}股</span>
            </div>
            <div class="pos-item">
              <span class="pos-label">均价</span>
              <span class="pos-val">{{ p.avgCost.toFixed(2) }}</span>
            </div>
            <div class="pos-item">
              <span class="pos-label">成本</span>
              <span class="pos-val">{{ formatMoney(p.totalCost) }}</span>
            </div>
            <div class="pos-item">
              <span class="pos-label">现价</span>
              <input
                type="number"
                step="0.01"
                class="price-input"
                :value="p.stock.currentPrice"
                @change="updatePrice(p.stock.id, $event)"
                placeholder="输入"
              />
            </div>
            <div class="pos-item" :class="{ profit: p.pnl > 0, loss: p.pnl < 0 }">
              <span class="pos-label">浮盈</span>
              <span class="pos-val">{{ formatMoney(p.pnl) }}</span>
            </div>
            <div class="pos-item" :class="{ profit: p.pnlRate > 0, loss: p.pnlRate < 0 }">
              <span class="pos-label">盈亏%</span>
              <span class="pos-val">{{ formatPct(p.pnlRate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 已平仓 -->
    <div v-if="tab === 'closed'">
      <div v-if="closedPositions.length === 0" class="empty-state card">
        <p>暂无已平仓记录</p>
      </div>
      <div v-else class="position-list">
        <div v-for="p in closedPositions" :key="p.stock.id" class="card position-card">
          <div class="pos-header">
            <span class="pos-name" @click="$router.push(`/stocks/${p.stock.id}`)">{{ p.stock.name }}</span>
            <span class="pos-code">{{ p.stock.code }}</span>
            <span class="pos-theme">{{ getThemeName(p.stock.themeId) }}</span>
          </div>
          <div class="pos-grid">
            <div class="pos-item">
              <span class="pos-label">买入</span>
              <span class="pos-val">{{ p.totalBuyQty.toLocaleString() }}股</span>
            </div>
            <div class="pos-item">
              <span class="pos-label">买入均价</span>
              <span class="pos-val">{{ p.avgBuyPrice.toFixed(2) }}</span>
            </div>
            <div class="pos-item">
              <span class="pos-label">卖出</span>
              <span class="pos-val">{{ p.totalSellQty.toLocaleString() }}股</span>
            </div>
            <div class="pos-item">
              <span class="pos-label">卖出均价</span>
              <span class="pos-val">{{ p.avgSellPrice.toFixed(2) }}</span>
            </div>
            <div class="pos-item" :class="{ profit: p.realizedPnl > 0, loss: p.realizedPnl < 0 }">
              <span class="pos-label">已实现盈亏</span>
              <span class="pos-val">{{ formatMoney(p.realizedPnl) }}</span>
            </div>
            <div class="pos-item" :class="{ profit: p.realizedPnlRate > 0, loss: p.realizedPnlRate < 0 }">
              <span class="pos-label">盈亏%</span>
              <span class="pos-val">{{ formatPct(p.realizedPnlRate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 交易记录 -->
    <div v-if="tab === 'trades'">
      <div v-if="allTrades.length === 0" class="empty-state card">
        <p>暂无交易记录</p>
      </div>
      <div v-else class="card trade-table-wrap">
        <table class="trade-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>个股</th>
              <th>题材</th>
              <th>方向</th>
              <th>模式</th>
              <th>价格</th>
              <th>数量</th>
              <th>金额</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in allTrades" :key="t.trade.id">
              <td>{{ t.trade.date }}</td>
              <td class="td-name" @click="$router.push(`/stocks/${t.stockId}`)">{{ t.stockName }}</td>
              <td>{{ t.themeName }}</td>
              <td :class="t.trade.direction === 'buy' ? 'td-buy' : 'td-sell'">
                {{ t.trade.direction === 'buy' ? '买入' : '卖出' }}
              </td>
              <td>
                <div class="mode-cell" @click="openModeSelect($event, t)">
                  <span class="mode-tag" :style="{ background: getModeColor(t.trade.modeId), color: '#fff' }">
                    {{ getModeName(t.trade.modeId) }}
                  </span>
                  <span class="mode-edit-icon">▾</span>
                </div>
              </td>
              <td>{{ t.trade.price.toFixed(2) }}</td>
              <td>{{ t.trade.quantity.toLocaleString() }}</td>
              <td>{{ formatMoney(t.trade.price * t.trade.quantity) }}</td>
              <td class="td-note">{{ t.trade.note }}</td>
              <td class="td-actions">
                <button class="btn-edit-sm" @click="openEditTrade(t)">编辑</button>
                <button class="btn-del-sm" @click="deleteTrade(t)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加交易弹窗 -->
    <div class="modal-overlay" v-if="showAddTrade" @click.self="showAddTrade = false">
      <div class="modal-card">
        <div class="modal-title">{{ editingTradeId ? '编辑交易记录' : '添加交易记录' }}</div>
        <div class="modal-body">
          <div class="form-row">
            <label class="form-label">个股</label>
            <input
              type="text"
              v-model="tradeForm.stockInput"
              list="stock-list"
              class="form-input"
              :placeholder="editingTradeId ? '' : '输入名称或代码，可选择已有'"
              :disabled="!!editingTradeId"
              @input="onStockInput"
            />
            <datalist id="stock-list">
              <option v-for="s in stockStore.stocks" :key="s.id" :value="`${s.name}（${s.code}）`">
                {{ s.id }}
              </option>
            </datalist>
            <div class="match-hint" v-if="matchedStock">
              <span class="match-tag">已匹配</span>
              {{ matchedStock.name }}（{{ matchedStock.code }}）· {{ getThemeName(matchedStock.themeId) }}
            </div>
            <div class="match-hint new" v-else-if="tradeForm.stockInput.trim()">
              <span class="match-tag new-tag">新个股</span>
              将自动创建
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">方向</label>
            <div class="dir-btns">
              <button class="dir-btn buy" :class="{ active: tradeForm.direction === 'buy' }" @click="tradeForm.direction = 'buy'">买入</button>
              <button class="dir-btn sell" :class="{ active: tradeForm.direction === 'sell' }" @click="tradeForm.direction = 'sell'">卖出</button>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">交易模式</label>
            <select v-model="tradeForm.modeId" class="form-select">
              <option v-for="m in tradeModeStore.tradeModes" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">日期</label>
            <input type="date" v-model="tradeForm.date" class="form-input" />
          </div>
          <div class="form-row two-col">
            <div>
              <label class="form-label">价格</label>
              <input type="number" step="0.01" v-model.number="tradeForm.price" class="form-input" placeholder="0.00" />
            </div>
            <div>
              <label class="form-label">数量</label>
              <input type="number" step="100" v-model.number="tradeForm.quantity" class="form-input" placeholder="股" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">备注</label>
            <textarea v-model="tradeForm.note" class="form-textarea" placeholder="可选，支持多行" rows="2"></textarea>
          </div>
          <div class="form-amount" v-if="tradeForm.price && tradeForm.quantity">
            金额：{{ formatMoney(tradeForm.price * tradeForm.quantity) }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showAddTrade = false">取消</button>
          <button class="btn-save" @click="saveTrade" :disabled="!canSave">保存</button>
        </div>
      </div>
    </div>

    <!-- 模式选择下拉菜单 -->
    <div class="mode-select-menu" v-if="showModeSelect" :style="modeSelectStyle" @click.stop>
      <div
        v-for="m in tradeModeStore.tradeModes"
        :key="m.id"
        class="mode-option"
        :class="{ active: m.id === editingTrade?.trade.modeId }"
        @click="selectMode(m.id)"
      >
        <span class="mode-option-color" :style="{ background: m.color }"></span>
        <span class="mode-option-name">{{ m.name }}</span>
      </div>
    </div>

    <!-- 点击空白关闭菜单 -->
    <div class="mode-select-mask" v-if="showModeSelect" @click="closeModeSelect"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStockStore } from '@/stores/stock'
import { useThemeStore } from '@/stores/theme'
import { useTradeModeStore } from '@/stores/tradeMode'
import { today } from '@/composables/useDate'
import type { Stock, TradeRecord } from '@/types'

const stockStore = useStockStore()
const themeStore = useThemeStore()
const tradeModeStore = useTradeModeStore()

const tab = ref<'positions' | 'closed' | 'trades'>('positions')

// 添加/编辑交易弹窗
const showAddTrade = ref(false)
const editingTradeId = ref<string | null>(null)
const tradeForm = ref({
  stockInput: '',
  stockId: '',
  direction: 'buy' as 'buy' | 'sell',
  date: today(),
  price: 0,
  quantity: 0,
  modeId: '',
  note: ''
})

const matchedStock = computed(() => {
  const input = tradeForm.value.stockInput.trim()
  if (!input) return null
  // 尝试匹配：完整名称+代码格式，或单独名称/代码
  const stocks = stockStore.stocks
  // 精确匹配 "名称（代码）" 格式
  let found = stocks.find(s => `${s.name}（${s.code}）` === input)
  if (found) return found
  // 匹配名称
  found = stocks.find(s => s.name === input)
  if (found) return found
  // 匹配代码
  found = stocks.find(s => s.code === input)
  if (found) return found
  // 模糊匹配
  found = stocks.find(s => s.name.includes(input) || s.code.includes(input))
  return found || null
})

function onStockInput() {
  if (matchedStock.value) {
    tradeForm.value.stockId = matchedStock.value.id
  } else {
    tradeForm.value.stockId = ''
  }
}

const canSave = computed(() => {
  if (!tradeForm.value.stockInput.trim()) return false
  if (tradeForm.value.price <= 0) return false
  if (tradeForm.value.quantity <= 0) return false
  return true
})

function openAddTrade() {
  editingTradeId.value = null
  tradeForm.value = {
    stockInput: '',
    stockId: '',
    direction: 'buy',
    date: today(),
    price: 0,
    quantity: 0,
    modeId: tradeModeStore.tradeModes[0]?.id || '',
    note: ''
  }
  showAddTrade.value = true
}

function openEditTrade(row: TradeRow) {
  editingTradeId.value = row.trade.id
  const stock = stockStore.getStock(row.stockId)
  tradeForm.value = {
    stockInput: stock ? `${stock.name}（${stock.code}）` : row.stockName,
    stockId: row.stockId,
    direction: row.trade.direction,
    date: row.trade.date,
    price: row.trade.price,
    quantity: row.trade.quantity,
    modeId: row.trade.modeId,
    note: row.trade.note
  }
  showAddTrade.value = true
}

function saveTrade() {
  if (!canSave.value) return
  let stockId = tradeForm.value.stockId

  // 编辑模式
  if (editingTradeId.value) {
    stockStore.updateTradeRecord(stockId, editingTradeId.value, {
      date: tradeForm.value.date,
      direction: tradeForm.value.direction,
      price: tradeForm.value.price,
      quantity: tradeForm.value.quantity,
      modeId: tradeForm.value.modeId,
      note: tradeForm.value.note.trim()
    })
    showAddTrade.value = false
    return
  }

  // 新增模式 - 如果没有匹配到已有个股，创建新个股
  if (!stockId) {
    const input = tradeForm.value.stockInput.trim()
    let name = input
    let code = ''
    const match = input.match(/^(.+?)（(.+?)）$/)
    if (match) {
      name = match[1]
      code = match[2]
    }
    stockStore.addStock({
      name,
      code: code || name,
      themeId: '',
      role: 'follower',
      tags: []
    })
    const newStock = stockStore.stocks[stockStore.stocks.length - 1]
    stockId = newStock.id
  }

  stockStore.addTradeRecord(stockId, {
    date: tradeForm.value.date,
    direction: tradeForm.value.direction,
    price: tradeForm.value.price,
    quantity: tradeForm.value.quantity,
    modeId: tradeForm.value.modeId,
    note: tradeForm.value.note.trim()
  })
  showAddTrade.value = false
  tab.value = 'trades'
}

function deleteTrade(row: TradeRow) {
  stockStore.deleteTradeRecord(row.stockId, row.trade.id)
}

// 模式选择下拉菜单
const showModeSelect = ref(false)
const modeSelectStyle = ref<{ top: string; left: string }>({ top: '0', left: '0' })
const editingTrade = ref<TradeRow | null>(null)

function openModeSelect(event: MouseEvent, row: TradeRow) {
  event.stopPropagation()
  editingTrade.value = row
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  modeSelectStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`
  }
  showModeSelect.value = true
}

function closeModeSelect() {
  showModeSelect.value = false
  editingTrade.value = null
}

function selectMode(modeId: string) {
  if (editingTrade.value && editingTrade.value.trade.modeId !== modeId) {
    stockStore.updateTradeRecord(editingTrade.value.stockId, editingTrade.value.trade.id, { modeId })
  }
  closeModeSelect()
}

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
}

function computePosition(stock: Stock): PositionData | null {
  if (!stock.trades || stock.trades.length === 0) return null

  let totalBuyQty = 0
  let totalBuyAmount = 0
  let totalSellQty = 0
  let totalSellAmount = 0

  for (const t of stock.trades) {
    if (t.direction === 'buy') {
      totalBuyQty += t.quantity
      totalBuyAmount += t.price * t.quantity
    } else {
      totalSellQty += t.quantity
      totalSellAmount += t.price * t.quantity
    }
  }

  const netQty = totalBuyQty - totalSellQty
  const avgBuyPrice = totalBuyQty > 0 ? totalBuyAmount / totalBuyQty : 0
  const avgSellPrice = totalSellQty > 0 ? totalSellAmount / totalSellQty : 0

  if (netQty > 0) {
    // 持仓中
    const avgCost = netQty > 0 ? (totalBuyAmount - totalSellAmount) / netQty : 0
    const totalCost = avgCost * netQty
    const currentPrice = stock.currentPrice || 0
    const pnl = currentPrice > 0 ? (currentPrice - avgCost) * netQty : 0
    const pnlRate = avgCost > 0 && currentPrice > 0 ? (currentPrice - avgCost) / avgCost : 0
    const realizedPnl = totalSellQty > 0 ? (avgSellPrice - avgBuyPrice) * totalSellQty : 0
    const realizedPnlRate = avgBuyPrice > 0 && totalSellQty > 0 ? (avgSellPrice - avgBuyPrice) / avgBuyPrice : 0
    return { stock, netQty, totalBuyQty, totalSellQty, avgBuyPrice, avgSellPrice, avgCost, totalCost, pnl, pnlRate, realizedPnl, realizedPnlRate }
  } else if (totalBuyQty > 0) {
    // 已平仓
    const realizedPnl = (avgSellPrice - avgBuyPrice) * totalSellQty
    const realizedPnlRate = avgBuyPrice > 0 ? (avgSellPrice - avgBuyPrice) / avgBuyPrice : 0
    return {
      stock, netQty: 0, totalBuyQty, totalSellQty, avgBuyPrice, avgSellPrice,
      avgCost: 0, totalCost: 0, pnl: 0, pnlRate: 0, realizedPnl, realizedPnlRate
    }
  }
  return null
}

const allPositions = computed(() => {
  return stockStore.stocks
    .map(s => computePosition(s))
    .filter((p): p is PositionData => p !== null)
})

const positions = computed(() => allPositions.value.filter(p => p.netQty > 0))
const closedPositions = computed(() => allPositions.value.filter(p => p.netQty === 0 && p.totalBuyQty > 0))

const totalCost = computed(() => positions.value.reduce((sum, p) => sum + p.totalCost, 0))
const totalValue = computed(() =>
  positions.value.reduce((sum, p) => sum + (p.stock.currentPrice || 0) * p.netQty, 0)
)
const totalPnl = computed(() => totalValue.value - totalCost.value)
const totalPnlRate = computed(() => totalCost.value > 0 ? totalPnl.value / totalCost.value : 0)
const realizedPnl = computed(() => allPositions.value.reduce((sum, p) => sum + p.realizedPnl, 0))

// 交易记录
interface TradeRow {
  trade: TradeRecord
  stockId: string
  stockName: string
  themeName: string
}

const allTrades = computed<TradeRow[]>(() => {
  const rows: TradeRow[] = []
  for (const s of stockStore.stocks) {
    if (!s.trades) continue
    for (const t of s.trades) {
      rows.push({
        trade: t,
        stockId: s.id,
        stockName: s.name,
        themeName: getThemeName(s.themeId)
      })
    }
  }
  return rows.sort((a, b) => b.trade.date.localeCompare(a.trade.date))
})

function getThemeName(themeId: string) {
  if (!themeId) return '未分类'
  return themeStore.getTheme(themeId)?.name || '未分类'
}

function getModeName(modeId?: string) {
  if (!modeId) return '其他'
  return tradeModeStore.getMode(modeId)?.name || '其他'
}

function getModeColor(modeId?: string) {
  if (!modeId) return '#8b949e'
  return tradeModeStore.getMode(modeId)?.color || '#8b949e'
}

// 模式胜率统计
interface ModeStat {
  modeId: string
  label: string
  color: string
  winCount: number
  lossCount: number
  winRate: number
  totalPnl: number
}

const modeStats = computed<ModeStat[]>(() => {
  const stats = new Map<string, ModeStat>()

  for (const p of closedPositions.value) {
    // 从买入记录中获取模式
    const stock = p.stock
    const buyTrades = stock.trades.filter(t => t.direction === 'buy')
    const modeId = buyTrades[0]?.modeId || ''
    if (!stats.has(modeId)) {
      const mode = tradeModeStore.getMode(modeId)
      stats.set(modeId, {
        modeId,
        label: mode?.name || '其他',
        color: mode?.color || '#8b949e',
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        totalPnl: 0
      })
    }
    const s = stats.get(modeId)!
    if (p.realizedPnl >= 0) {
      s.winCount++
    } else {
      s.lossCount++
    }
    s.totalPnl += p.realizedPnl
  }

  const result = Array.from(stats.values())
  for (const s of result) {
    const total = s.winCount + s.lossCount
    s.winRate = total > 0 ? (s.winCount / total) * 100 : 0
  }
  return result.sort((a, b) => b.totalPnl - a.totalPnl)
})

function formatMoney(val: number) {
  if (Math.abs(val) >= 10000) {
    return `${(val / 10000).toFixed(2)}万`
  }
  return val.toFixed(2)
}

function formatPct(val: number) {
  return `${(val * 100).toFixed(2)}%`
}

function updatePrice(stockId: string, event: Event) {
  const target = event.target as HTMLInputElement
  const price = parseFloat(target.value)
  if (!isNaN(price) && price > 0) {
    stockStore.updateStock(stockId, { currentPrice: price })
  }
}
</script>

<style scoped>
.position-stats-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.btn-add-trade {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  background: var(--color-blue);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-add-trade:hover {
  opacity: 0.85;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

/* 模式统计 */
.mode-stats {
  padding: 14px 16px;
  margin-bottom: 20px;
}

.mode-stats-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.mode-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.mode-stat-item {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 10px 12px;
}

.mode-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.mode-stat-name {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mode-stat-rate {
  font-size: 15px;
  font-weight: 700;
}

.mode-stat-rate.win {
  color: #f85149;
}

.mode-stat-rate.loss {
  color: #3fb950;
}

.mode-stat-detail {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.mode-stat-detail .win {
  color: #f85149;
}

.mode-stat-detail .loss {
  color: #3fb950;
}

.mode-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  font-weight: 500;
}

.mode-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.15s;
}

.mode-cell:hover {
  background: rgba(255,255,255,0.05);
}

.mode-edit-icon {
  font-size: 10px;
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.15s;
}

.mode-cell:hover .mode-edit-icon {
  opacity: 1;
}

.mode-select-menu {
  position: fixed;
  z-index: 300;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.mode-option:hover {
  background: var(--bg-tertiary);
}

.mode-option.active {
  background: rgba(88,166,255,0.1);
}

.mode-option-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.mode-option-name {
  font-size: 13px;
}

.mode-select-mask {
  position: fixed;
  inset: 0;
  z-index: 299;
}

.td-actions {
  white-space: nowrap;
}

.btn-edit-sm,
.btn-del-sm {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  margin-right: 4px;
  transition: all 0.15s;
}

.btn-edit-sm:hover {
  color: var(--color-blue);
  border-color: var(--color-blue);
}

.btn-del-sm:hover {
  color: #f85149;
  border-color: #f85149;
}

.stat-card {
  padding: 14px 16px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
}

.stat-sub {
  font-size: 12px;
  margin-top: 4px;
}

.stat-card.profit .stat-value,
.stat-card.profit .stat-sub {
  color: #f85149;
}

.stat-card.loss .stat-value,
.stat-card.loss .stat-sub {
  color: #3fb950;
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  padding: 8px 16px;
  font-size: 13px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--color-blue);
  border-bottom-color: var(--color-blue);
}

.tab-count {
  display: inline-block;
  font-size: 11px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1px 6px;
  margin-left: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-secondary);
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.6;
}

.position-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.position-card {
  padding: 12px 16px;
}

.pos-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.pos-name {
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.pos-name:hover {
  color: var(--color-blue);
}

.pos-code {
  font-size: 12px;
  color: var(--text-secondary);
}

.pos-theme {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: auto;
}

.pos-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.pos-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pos-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.pos-val {
  font-size: 13px;
  font-weight: 500;
}

.pos-item.profit .pos-val {
  color: #f85149;
}

.pos-item.loss .pos-val {
  color: #3fb950;
}

.price-input {
  width: 70px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.price-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

/* 交易记录表格 */
.trade-table-wrap {
  padding: 0;
  overflow: hidden;
}

.trade-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.trade-table th {
  text-align: left;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.trade-table td {
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
}

.trade-table tr:hover td {
  background: var(--bg-tertiary);
}

.td-name {
  cursor: pointer;
  font-weight: 500;
}

.td-name:hover {
  color: var(--color-blue);
}

.td-buy {
  color: #f85149;
  font-weight: 500;
}

.td-sell {
  color: #3fb950;
  font-weight: 500;
}

.td-note {
  color: var(--text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre-line;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pos-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .trade-table {
    font-size: 11px;
  }

  .trade-table th,
  .trade-table td {
    padding: 6px 8px;
  }

  .td-note {
    display: none;
  }
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
}

.modal-title {
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.modal-body {
  padding: 16px 20px;
}

.form-row {
  margin-bottom: 14px;
}

.form-row.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row.two-col > div {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-blue);
}

.form-textarea {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-blue);
}

.match-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.match-hint.new {
  gap: 8px;
}

.match-tag {
  font-size: 11px;
  background: rgba(88,166,255,0.15);
  color: var(--color-blue);
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.match-tag.new-tag {
  background: rgba(63,185,80,0.15);
  color: #3fb950;
}

.form-select-sm {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  color: var(--text-primary);
  font-size: 12px;
}

.form-select-sm:focus {
  outline: none;
  border-color: var(--color-blue);
}

.dir-btns {
  display: flex;
  gap: 8px;
}

.dir-btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.dir-btn.buy.active {
  background: rgba(248,81,73,0.15);
  border-color: #f85149;
  color: #f85149;
  font-weight: 600;
}

.dir-btn.sell.active {
  background: rgba(63,185,80,0.15);
  border-color: #3fb950;
  color: #3fb950;
  font-weight: 600;
}

.form-amount {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
  margin-top: 4px;
}

.modal-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  color: var(--text-primary);
}

.btn-save {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: var(--color-blue);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-save:not(:disabled):hover {
  opacity: 0.85;
}
</style>
