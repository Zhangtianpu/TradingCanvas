// 题材等级
export type ThemeLevel = 'main' | 'sub' | 'rotation'

// 题材状态
export type ThemeStatus = 'burst' | 'ferment' | 'climax' | 'diverge' | 'retreat' | 'rebound' | 'adjust'

// 个股角色
export type StockRole = 'leader' | 'mid' | 'follower' | 'catchup'

// 个股标签
export type StockTag = 'one-word' | 't-shape' | 'turnover' | 'ground-sky' | 'weak-strong' | 'strong-weak'

// 情绪阶段
export type EmotionPhase = 'freeze' | 'repair' | 'warm' | 'climax' | 'retreat'

// 题材事件
export interface ThemeEvent {
  id: string
  date: string
  content: string
}

// 状态变更历史
export interface StatusHistory {
  status: ThemeStatus
  date: string  // 变更日期
}

// 题材
export interface Theme {
  id: string
  name: string
  sector: string
  level: ThemeLevel
  status: ThemeStatus
  parentId?: string        // 父题材ID
  burstDate: string
  endDate?: string         // 结束日期
  events: ThemeEvent[]
  statusHistory?: StatusHistory[]  // 状态变更历史
  createdAt: string
  updatedAt: string
}

// 打板记录
export interface LimitUpRecord {
  id: string
  date: string
  boardCount: number
  limitUpTime: string
  sealAmount: string
  broken: boolean
  resealed: boolean
}

// 交易模式
export interface CustomTradeMode {
  id: string
  name: string
  color: string
  description: string    // 模式说明：买点、卖点等
  createdAt: string
}

// 买卖记录
export interface TradeRecord {
  id: string
  date: string
  direction: 'buy' | 'sell'
  price: number
  quantity: number
  modeId: string             // 交易模式ID
  note: string
}

// 个股
export interface Stock {
  id: string
  code: string
  name: string
  themeId: string
  role: StockRole
  tags: StockTag[]
  startDate?: string         // 开始日期
  endDate?: string           // 结束日期（null/undefined表示进行中）
  limitUpRecords: LimitUpRecord[]
  trades: TradeRecord[]
  currentPrice?: number         // 当前价格（手动输入）
  createdAt: string
  updatedAt: string
}

// 空间板个股
export interface SpaceBoardStock {
  name: string
  height: number
  stockId?: string  // 关联个股ID
}

// 每日情绪
export interface EmotionDaily {
  id: string
  date: string
  // 指数数据
  shIndex: number            // 上证指数
  shChange: number           // 上证涨跌幅 %
  szIndex: number            // 深证成指
  szChange: number           // 深证涨跌幅 %
  cybIndex: number           // 创业板指
  cybChange: number          // 创业板涨跌幅 %
  allAIndex: number          // 全A指数
  allAChange: number         // 全A涨跌幅 %
  allAVolume: number         // 全A成交量（亿）
  // 市场概况
  upCount: number            // 上涨家数
  downCount: number          // 下跌家数
  limitUpCount: number       // 涨停数
  limitDownCount: number     // 跌停数
  brokenRate: number         // 炸板率 %
  sealRate: number           // 封板率 %
  // 接力结构
  board2Count: number        // 2板家数
  board3Count: number        // 3板家数
  board4Count: number        // 4板家数
  board5Count: number        // 5板家数
  board6PlusCount: number    // 6板及以上家数
  continuousBoardCount: number // 连板家数(2板以上合计)
  // 空间板
  maxBoardHeight: number     // 空间板高度
  spaceBoardStocks: SpaceBoardStock[] // 空间板个股列表
  prevHighBoard: number      // 前期高点
  isBreakthrough: boolean    // 是否突破
  isMedian: boolean          // 是否中位
  isIcePoint: boolean        // 是否冰点
  isAnnouncement: boolean    // 是否公告
  isClear: boolean           // 是否出清
  remark: string             // 备注
  // 情绪判断
  phase: EmotionPhase
  leadingThemeId: string
  note: string
}

// 每日复盘
export interface DailyReview {
  id: string
  date: string
  targetStocks: number      // 目标标的数量
  summary: string
  themeAnalysis: string
  reflection: string
  tomorrowPlan: string
  createdAt: string
  updatedAt: string
}

// 应用存储
export interface AppStorage {
  themes: Theme[]
  stocks: Stock[]
  emotions: EmotionDaily[]
  reviews: DailyReview[]
  tradeModes: CustomTradeMode[]
  settings: AppSettings
  appVersion: string
  lastBackupDate: string
}

// 应用设置
export interface AppSettings {
  autoBackup: boolean           // 是否开启自动备份
  autoBackupInterval: number    // 自动备份间隔（分钟）
  lastAutoBackup: string        // 上次自动备份时间
}

// 标签映射
export const STOCK_TAG_LABELS: Record<StockTag, string> = {
  'one-word': '一字板',
  't-shape': 'T字板',
  'turnover': '换手板',
  'ground-sky': '地天板',
  'weak-strong': '弱转强',
  'strong-weak': '强转弱'
}

// 题材等级映射
export const THEME_LEVEL_LABELS: Record<ThemeLevel, string> = {
  'main': '主线',
  'sub': '支线',
  'rotation': '轮动'
}

// 题材状态映射
export const THEME_STATUS_LABELS: Record<ThemeStatus, string> = {
  'burst': '爆发',
  'ferment': '发酵',
  'climax': '高潮',
  'diverge': '分歧',
  'retreat': '退潮',
  'rebound': '反弹',
  'adjust': '调整'
}

// 个股角色映射
export const STOCK_ROLE_LABELS: Record<StockRole, string> = {
  'leader': '龙头',
  'mid': '中军',
  'follower': '跟风',
  'catchup': '补涨'
}

// 情绪阶段映射
export const EMOTION_PHASE_LABELS: Record<EmotionPhase, string> = {
  'freeze': '冰点',
  'repair': '修复',
  'warm': '升温',
  'climax': '高潮',
  'retreat': '退潮'
}
