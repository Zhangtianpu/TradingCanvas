import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { PatternTrade } from '@/types'
import { generateId, loadData, saveData } from '@/composables/useStorage'

export interface PatternStats {
  total: number
  closed: number
  open: number
  wins: number
  losses: number
  winRate: number
  averageReturn: number
  totalReturn: number
  profitLossRatio: number | null
  realizedProfit: number
}

export const usePatternMiningStore = defineStore('patternMining', () => {
  const trades = ref<PatternTrade[]>(loadData().patternTrades || [])

  function persist() {
    const data = loadData()
    data.patternTrades = trades.value
    saveData(data)
  }

  const sortedTrades = computed(() => [...trades.value].sort((a, b) =>
    b.buyDate.localeCompare(a.buyDate) || b.createdAt.localeCompare(a.createdAt)
  ))

  function addTrade(payload: Omit<PatternTrade, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const trade: PatternTrade = { ...payload, id: generateId(), createdAt: now, updatedAt: now }
    trades.value.push(trade)
    persist()
    return trade
  }

  function closeTrade(id: string, sellDate: string, sellPrice: number) {
    const trade = trades.value.find(item => item.id === id)
    if (!trade) return
    trade.sellDate = sellDate
    trade.sellPrice = sellPrice
    trade.updatedAt = new Date().toISOString()
    persist()
  }

  function deleteTrade(id: string) {
    trades.value = trades.value.filter(item => item.id !== id)
    persist()
  }

  function returnRate(trade: PatternTrade) {
    if (!trade.sellPrice || trade.buyPrice <= 0) return null
    return ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100
  }

  function statsForMode(modeId: string): PatternStats {
    const all = trades.value.filter(item => item.modeId === modeId)
    const closed = all.filter(item => item.sellPrice !== undefined && item.sellDate)
    const returns = closed.map(item => returnRate(item) || 0)
    const gains = returns.filter(value => value > 0)
    const losses = returns.filter(value => value < 0)
    const averageGain = gains.length ? gains.reduce((sum, value) => sum + value, 0) / gains.length : 0
    const averageLoss = losses.length ? Math.abs(losses.reduce((sum, value) => sum + value, 0) / losses.length) : 0
    return {
      total: all.length,
      closed: closed.length,
      open: all.length - closed.length,
      wins: gains.length,
      losses: losses.length,
      winRate: closed.length ? (gains.length / closed.length) * 100 : 0,
      averageReturn: closed.length ? returns.reduce((sum, value) => sum + value, 0) / closed.length : 0,
      totalReturn: returns.reduce((sum, value) => sum + value, 0),
      profitLossRatio: averageLoss > 0 ? averageGain / averageLoss : gains.length ? null : 0,
      realizedProfit: closed.reduce((sum, item) => sum + ((item.sellPrice || 0) - item.buyPrice) * item.quantity, 0)
    }
  }

  return { trades, sortedTrades, addTrade, closeTrade, deleteTrade, returnRate, statsForMode }
})
