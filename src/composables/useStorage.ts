import type { AppStorage, EmotionDaily, Theme, Stock, CustomTradeMode, AppSettings } from '@/types'

const STORAGE_KEY = 'trading-canvas-data'
const APP_VERSION = '1.0.0'

// 默认设置
function getDefaultSettings(): AppSettings {
  return {
    autoBackup: false,
    autoBackupInterval: 60,
    lastAutoBackup: ''
  }
}

// 默认交易模式
function getDefaultTradeModes(): CustomTradeMode[] {
  return [
    { id: 'mode-limit-up', name: '打板', color: '#f85149', description: '涨停价买入，次日冲高卖出', createdAt: new Date().toISOString() },
    { id: 'mode-low-suck', name: '低吸', color: '#3fb950', description: '低位分批买入，反弹卖出', createdAt: new Date().toISOString() },
    { id: 'mode-half-way', name: '半路', color: '#58a6ff', description: '涨势中段介入，涨停或冲高卖出', createdAt: new Date().toISOString() },
    { id: 'mode-follow', name: '跟随', color: '#a371f5', description: '龙头上板后跟随买入，次日溢价卖出', createdAt: new Date().toISOString() },
    { id: 'mode-reversal', name: '反核', color: '#f0883e', description: '深水区反核买入，地天板或冲高卖出', createdAt: new Date().toISOString() },
    { id: 'mode-other', name: '其他', color: '#8b949e', description: '', createdAt: new Date().toISOString() }
  ]
}

function createDefaultData(): AppStorage {
  return {
    themes: [],
    stocks: [],
    emotions: [],
    reviews: [],
    tradeModes: getDefaultTradeModes(),
    settings: getDefaultSettings(),
    appVersion: APP_VERSION,
    lastBackupDate: ''
  }
}

// 获取日期字符串
function getDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}

// 生成测试数据
export function generateTestData(): AppStorage {
  const emotions: EmotionDaily[] = []
  const themes: Theme[] = []
  const stocks: Stock[] = []

  // 主题材1：人工智能
  const aiThemeId = generateId()
  themes.push({
    id: aiThemeId,
    name: '人工智能',
    sector: '科技',
    level: 'main',
    status: 'climax',
    burstDate: getDateStr(-10),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 分支题材：算力
  themes.push({
    id: generateId(),
    name: '算力',
    sector: '科技',
    level: 'sub',
    status: 'ferment',
    parentId: aiThemeId,
    burstDate: getDateStr(-5),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 分支题材：CPO
  themes.push({
    id: generateId(),
    name: 'CPO',
    sector: '科技',
    level: 'sub',
    status: 'burst',
    parentId: aiThemeId,
    burstDate: getDateStr(-3),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 主题材2：新能源汽车
  const carThemeId = generateId()
  themes.push({
    id: carThemeId,
    name: '新能源汽车',
    sector: '汽车',
    level: 'main',
    status: 'ferment',
    burstDate: getDateStr(-7),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 分支题材：锂电池
  themes.push({
    id: generateId(),
    name: '锂电池',
    sector: '新能源',
    level: 'sub',
    status: 'climax',
    parentId: carThemeId,
    burstDate: getDateStr(-4),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 生成个股数据
  stocks.push({
    id: generateId(),
    code: '300059',
    name: '东方财富',
    themeId: aiThemeId,
    role: 'leader',
    tags: ['turnover'],
    limitUpRecords: [],
    trades: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  stocks.push({
    id: generateId(),
    code: '002594',
    name: '比亚迪',
    themeId: carThemeId,
    role: 'leader',
    tags: ['turnover'],
    limitUpRecords: [],
    trades: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  stocks.push({
    id: generateId(),
    code: '601012',
    name: '隆基绿能',
    themeId: themes[3].id,
    role: 'leader',
    tags: ['turnover'],
    limitUpRecords: [],
    trades: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 生成空间板个股（关联个股ID）
  function generateSpaceBoardStocks(maxHeight: number): { name: string; height: number; stockId?: string }[] {
    const result = []
    const count = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 1
    for (let i = 0; i < count; i++) {
      const stock = stocks[Math.floor(Math.random() * stocks.length)]
      result.push({
        name: stock.name,
        height: maxHeight,
        stockId: stock.id
      })
    }
    return result
  }

  // 生成最近10天的情绪数据
  const today = new Date()
  const phases = ['freeze', 'repair', 'warm', 'climax', 'retreat'] as const

  for (let i = 9; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)

    // 随机生成数据
    const shChange = (Math.random() - 0.5) * 4
    const szChange = (Math.random() - 0.5) * 5
    const cybChange = (Math.random() - 0.5) * 6

    const upCount = Math.floor(Math.random() * 2000) + 1000
    const downCount = Math.floor(Math.random() * 2000) + 1000

    const limitUpCount = Math.floor(Math.random() * 80) + 20
    const limitDownCount = Math.floor(Math.random() * 30) + 5

    const board2Count = Math.floor(Math.random() * 30) + 10
    const board3Count = Math.floor(Math.random() * 15) + 5
    const board4Count = Math.floor(Math.random() * 8) + 2
    const board5Count = Math.floor(Math.random() * 5) + 1
    const board6PlusCount = Math.floor(Math.random() * 3)

    const maxBoardHeight = Math.floor(Math.random() * 8) + 3
    const isBreakthrough = Math.random() > 0.8
    const isMedian = !isBreakthrough && Math.random() > 0.7
    const isIcePoint = !isBreakthrough && !isMedian && Math.random() > 0.85
    const isAnnouncement = Math.random() > 0.95
    const isClear = Math.random() > 0.9

    emotions.push({
      id: generateId(),
      date: dateStr,
      // 指数
      shIndex: 3100 + Math.random() * 200,
      shChange,
      szIndex: 9500 + Math.random() * 500,
      szChange,
      cybIndex: 1800 + Math.random() * 200,
      cybChange,
      allAIndex: 4500 + Math.random() * 300,
      allAChange: (Math.random() - 0.5) * 4,
      allAVolume: Math.floor(8000 + Math.random() * 4000),
      // 市场概况
      upCount,
      downCount,
      limitUpCount,
      limitDownCount,
      brokenRate: Math.floor(Math.random() * 30) + 10,
      sealRate: Math.floor(Math.random() * 30) + 60,
      // 接力结构
      board2Count,
      board3Count,
      board4Count,
      board5Count,
      board6PlusCount,
      continuousBoardCount: board2Count + board3Count + board4Count + board5Count + board6PlusCount,
      // 空间板
      maxBoardHeight,
      spaceBoardStocks: generateSpaceBoardStocks(maxBoardHeight),
      prevHighBoard: 7,
      isBreakthrough,
      isMedian,
      isIcePoint,
      isAnnouncement,
      isClear,
      remark: '',
      // 情绪
      phase: phases[Math.floor(Math.random() * 5)],
      leadingThemeId: '',
      note: ''
    })
  }

  return {
    themes,
    stocks,
    emotions,
    reviews: [],
    tradeModes: getDefaultTradeModes(),
    settings: getDefaultSettings(),
    appVersion: APP_VERSION,
    lastBackupDate: ''
  }
}

export function loadData(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultData()
    const data = JSON.parse(raw) as AppStorage
    // 兼容性处理：确保所有字段存在
    return {
      ...createDefaultData(),
      ...data,
      appVersion: APP_VERSION
    }
  } catch {
    return createDefaultData()
  }
}

export function saveData(data: AppStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

export function exportData(): void {
  const data = loadData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trading-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  // 更新最后备份时间
  data.lastBackupDate = new Date().toISOString()
  saveData(data)
}

// 自动备份（如果开启了自动备份且到达间隔）
export function autoBackupIfNeeded(): void {
  const data = loadData()
  const settings = data.settings

  if (!settings.autoBackup) return

  const now = new Date()
  const lastBackup = settings.lastAutoBackup ? new Date(settings.lastAutoBackup) : new Date(0)
  const intervalMs = settings.autoBackupInterval * 60 * 1000

  if (now.getTime() - lastBackup.getTime() >= intervalMs) {
    // 执行自动备份
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trading-canvas-auto-${now.toISOString().slice(0, 16).replace('T', '_')}.json`
    a.click()
    URL.revokeObjectURL(url)

    // 更新最后自动备份时间
    data.settings.lastAutoBackup = now.toISOString()
    data.lastBackupDate = now.toISOString()
    saveData(data)
  }
}

// 更新设置
export function updateSettings(updates: Partial<AppSettings>): void {
  const data = loadData()
  data.settings = { ...data.settings, ...updates }
  saveData(data)
}

export function importData(file: File): Promise<AppStorage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppStorage
        if (!data.themes || !data.stocks) {
          reject(new Error('数据格式不正确'))
          return
        }
        const merged = {
          ...createDefaultData(),
          ...data,
          appVersion: APP_VERSION
        }
        saveData(merged)
        resolve(merged)
      } catch {
        reject(new Error('解析文件失败'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
