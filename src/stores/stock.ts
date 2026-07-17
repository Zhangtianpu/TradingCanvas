import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stock, LimitUpRecord, TradeRecord } from '@/types'
import { loadData, saveData, generateId } from '@/composables/useStorage'

export const useStockStore = defineStore('stock', () => {
  const stocks = ref<Stock[]>(loadData().stocks)

  function persist() {
    const data = loadData()
    data.stocks = stocks.value
    saveData(data)
  }

  function stocksByTheme(themeId: string) {
    return computed(() => stocks.value.filter(s => s.themeId === themeId))
  }

  function addStock(stock: Omit<Stock, 'id' | 'limitUpRecords' | 'trades' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    stocks.value.push({
      ...stock,
      id: generateId(),
      limitUpRecords: [],
      trades: [],
      createdAt: now,
      updatedAt: now
    })
    persist()
  }

  function updateStock(id: string, updates: Partial<Stock>) {
    const idx = stocks.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      stocks.value[idx] = { ...stocks.value[idx], ...updates, updatedAt: new Date().toISOString() }
      persist()
    }
  }

  function deleteStock(id: string) {
    stocks.value = stocks.value.filter(s => s.id !== id)
    persist()
  }

  function getStock(id: string) {
    return stocks.value.find(s => s.id === id)
  }

  function addLimitUpRecord(stockId: string, record: Omit<LimitUpRecord, 'id'>) {
    const stock = stocks.value.find(s => s.id === stockId)
    if (stock) {
      stock.limitUpRecords.push({ ...record, id: generateId() })
      stock.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function deleteLimitUpRecord(stockId: string, recordId: string) {
    const stock = stocks.value.find(s => s.id === stockId)
    if (stock) {
      stock.limitUpRecords = stock.limitUpRecords.filter(r => r.id !== recordId)
      stock.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function addTradeRecord(stockId: string, record: Omit<TradeRecord, 'id'>) {
    const stock = stocks.value.find(s => s.id === stockId)
    if (stock) {
      stock.trades.push({ ...record, id: generateId() })
      stock.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function updateTradeRecord(stockId: string, recordId: string, updates: Partial<TradeRecord>) {
    const stock = stocks.value.find(s => s.id === stockId)
    if (stock) {
      const idx = stock.trades.findIndex(r => r.id === recordId)
      if (idx !== -1) {
        stock.trades[idx] = { ...stock.trades[idx], ...updates }
        stock.updatedAt = new Date().toISOString()
        persist()
      }
    }
  }

  function deleteTradeRecord(stockId: string, recordId: string) {
    const stock = stocks.value.find(s => s.id === stockId)
    if (stock) {
      stock.trades = stock.trades.filter(r => r.id !== recordId)
      stock.updatedAt = new Date().toISOString()
      persist()
    }
  }

  function deleteStocksByTheme(themeId: string) {
    stocks.value = stocks.value.filter(s => s.themeId !== themeId)
    persist()
  }

  function reload() {
    stocks.value = loadData().stocks
  }

  return {
    stocks, stocksByTheme, addStock, updateStock, deleteStock, getStock,
    addLimitUpRecord, deleteLimitUpRecord, addTradeRecord, updateTradeRecord, deleteTradeRecord,
    deleteStocksByTheme, reload
  }
})
