<template>
  <div class="position-card">
    <div class="position-header">
      <h3 class="position-title">持仓概览</h3>
      <router-link to="/positions" class="link-more">详细 →</router-link>
    </div>

    <!-- 概览数据 -->
    <div v-if="positions.length > 0" class="position-overview">
      <div class="overview-item">
        <span class="overview-label">总投入</span>
        <span class="overview-value">{{ formatMoney(totalCost) }}</span>
      </div>
      <div class="overview-item">
        <span class="overview-label">当前市值</span>
        <span class="overview-value">{{ formatMoney(totalValue) }}</span>
      </div>
      <div class="overview-item">
        <span class="overview-label">浮动盈亏</span>
        <span class="overview-value" :class="{ profit: totalPnl > 0, loss: totalPnl < 0 }">
          {{ totalPnl >= 0 ? '+' : '' }}{{ formatMoney(totalPnl) }}
          <span v-if="totalCost > 0" class="pnl-rate">({{ formatPct(totalPnlRate) }})</span>
        </span>
      </div>
    </div>

    <!-- 持仓列表 -->
    <div v-if="positions.length > 0" class="position-list">
      <div v-for="p in positions.slice(0, 5)" :key="p.stock.id" class="position-row">
        <div class="pos-info">
          <span class="pos-name" @click="$router.push(`/stocks/${p.stock.id}`)">{{ p.stock.name }}</span>
          <span class="pos-code">{{ p.stock.code }}</span>
        </div>
        <div class="pos-data">
          <span class="pos-qty">{{ p.netQty.toLocaleString() }}股</span>
          <span class="pos-pnl" :class="{ profit: p.pnl > 0, loss: p.pnl < 0 }">
            {{ p.pnl >= 0 ? '+' : '' }}{{ formatPct(p.pnlRate) }}
          </span>
        </div>
      </div>
      <div v-if="positions.length > 5" class="more-hint">
        还有 {{ positions.length - 5 }} 只持仓...
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <p>暂无持仓</p>
      <p class="hint">在个股详情页添加买卖记录后会自动统计</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStockStore } from '@/stores/stock'
import type { Stock } from '@/types'

const stockStore = useStockStore()

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
    const avgCost = netQty > 0 ? (totalBuyAmount - totalSellAmount) / netQty : 0
    const totalCost = avgCost * netQty
    const currentPrice = stock.currentPrice || 0
    const pnl = currentPrice > 0 ? (currentPrice - avgCost) * netQty : 0
    const pnlRate = avgCost > 0 && currentPrice > 0 ? (currentPrice - avgCost) / avgCost : 0
    const realizedPnl = totalSellQty > 0 ? (avgSellPrice - avgBuyPrice) * totalSellQty : 0
    const realizedPnlRate = avgBuyPrice > 0 && totalSellQty > 0 ? (avgSellPrice - avgBuyPrice) / avgBuyPrice : 0

    return {
      stock,
      netQty,
      totalBuyQty,
      totalSellQty,
      avgBuyPrice,
      avgSellPrice,
      avgCost,
      totalCost,
      pnl,
      pnlRate,
      realizedPnl,
      realizedPnlRate
    }
  } else if (netQty === 0 && totalBuyQty > 0) {
    // 已平仓
    const realizedPnl = totalSellAmount - totalBuyAmount
    const realizedPnlRate = totalBuyAmount > 0 ? realizedPnl / totalBuyAmount : 0

    return {
      stock,
      netQty: 0,
      totalBuyQty,
      totalSellQty,
      avgBuyPrice,
      avgSellPrice,
      avgCost: avgBuyPrice,
      totalCost: 0,
      pnl: 0,
      pnlRate: 0,
      realizedPnl,
      realizedPnlRate
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

const totalCost = computed(() => positions.value.reduce((sum, p) => sum + p.totalCost, 0))
const totalValue = computed(() =>
  positions.value.reduce((sum, p) => sum + (p.stock.currentPrice || 0) * p.netQty, 0)
)
const totalPnl = computed(() => totalValue.value - totalCost.value)
const totalPnlRate = computed(() => totalCost.value > 0 ? totalPnl.value / totalCost.value : 0)

function formatMoney(val: number): string {
  const absVal = Math.abs(val)
  if (absVal >= 10000) {
    return (val / 10000).toFixed(2) + '万'
  }
  return val.toFixed(2)
}

function formatPct(val: number): string {
  return (val * 100).toFixed(2) + '%'
}
</script>

<style scoped>
.position-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.position-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.position-title {
  font-size: 13px;
  font-weight: 500;
  margin: 0;
}

.link-more {
  font-size: 12px;
  color: var(--color-blue);
  text-decoration: none;
}

.link-more:hover {
  text-decoration: underline;
}

.position-overview {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  margin-bottom: 12px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.overview-value {
  font-size: 14px;
  font-weight: 600;
}

.overview-value.profit {
  color: var(--color-red);
}

.overview-value.loss {
  color: var(--color-green);
}

.pnl-rate {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.8;
}

.position-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.position-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.position-row:last-child {
  border-bottom: none;
}

.pos-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pos-name {
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.pos-name:hover {
  color: var(--color-blue);
}

.pos-code {
  font-size: 11px;
  color: var(--text-tertiary);
}

.pos-data {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pos-qty {
  font-size: 12px;
  color: var(--text-secondary);
}

.pos-pnl {
  font-size: 12px;
  font-weight: 500;
}

.pos-pnl.profit {
  color: var(--color-red);
}

.pos-pnl.loss {
  color: var(--color-green);
}

.more-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  padding-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text-tertiary);
}

.empty-state p {
  margin: 4px 0;
}

.empty-state .hint {
  font-size: 11px;
}
</style>