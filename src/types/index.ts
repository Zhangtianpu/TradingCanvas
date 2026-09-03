// 题材等级
export type ThemeLevel = 'main' | 'sub' | 'rotation'

// 题材状态
export type ThemeStatus = 'burst' | 'ferment' | 'climax' | 'diverge' | 'retreat' | 'rebound' | 'adjust' | 'repair'

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
  closeNote?: string            // 平仓备注
  createdAt: string
  updatedAt: string
}

// 空间板个股
export interface SpaceBoardStock {
  name: string
  height: number
  stockId?: string  // 关联个股ID
  isBreakthrough?: boolean  // 高度突破
  isMedian?: boolean        // 中位
  isIcePoint?: boolean      // 冰点
  isAnnouncement?: boolean  // 公告
  isSpaceFirst?: boolean    // 空间板先手
  isSpace?: boolean         // 空间板
  isNextDayBroken?: boolean // 次日炸板
  isNextDayNoPremium?: boolean // 次日无溢价
  isNextDayPremium?: boolean   // 次日有溢价
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
  heightCalc?: string        // 高度计算结果（如"4进5"，独立于表格，用户手动输入）
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

// 交易风格
export type TradeStyle = 'trend' | 'board'  // 趋势 | 连板

// 自定义交易风格（用户可创建新的风格）
export interface CustomTradeStyle {
  id: string
  key: string              // 唯一标识，如 'trend'、'custom_xxx'
  name: string             // 显示名称，如"趋势"
  color: string            // 颜色
  description?: string    // 说明
  isDefault?: boolean      // 是否为默认项（不可删除）
  createdAt: string
}

// 交易风格历史记录
export interface TradeStyleHistory {
  id: string
  style: string             // 风格 key（对应 CustomTradeStyle.key 或默认项）
  date: string              // 发生日期
}

// 情绪周期阶段
export type CyclePhase = 'start' | 'main' | 'diverge' | 'retreat'  // 启动 | 主升 | 分歧 | 退潮

// 自定义情绪阶段（用户可创建新的阶段）
export interface CustomCyclePhase {
  id: string
  key: string              // 唯一标识，如 'start'、'custom_xxx'
  name: string             // 显示名称，如"启动"
  color: string            // 颜色
  description?: string    // 说明
  isDefault?: boolean      // 是否为默认项（不可删除）
  createdAt: string
}

// 情绪周期历史记录
export interface CyclePhaseHistory {
  id: string
  phase: CyclePhase
  date: string              // 发生日期
}

// 周期总结（保存的周期快照）
// 独立行情标的（不以题材/涨停为主线的个股分析）
export type IndependentPosition = 'leader' | 'catchup'
export type IndependentStatus = 'board' | 'breakRebound' | 'divergence' | 'limitRepair' | 'avoidAlert' | 'end'
export type IndependentFundTag = 'independent' | 'theme' | 'switch' | 'recognition'
export type IndependentFlowKind = 'breakout' | 'rebound' | 'custom'

export interface IndependentFlowEvent {
  id: string
  date: string
  kind: IndependentFlowKind
  content: string
}

export interface IndependentStage {
  id: string
  date: string
  status: IndependentStatus
}

export interface IndependentTarget {
  id: string
  name: string
  code?: string
  position: IndependentPosition
  status: IndependentStatus
  fundTags: IndependentFundTag[]
  startDate: string
  endDate?: string
  events: IndependentFlowEvent[]
  stages?: IndependentStage[]
  createdAt: string
  updatedAt: string
}

export interface CycleSummary {
  id: string
  name: string                 // 周期名称，如"周期1"
  startDate: string            // 周期开始日期
  endDate: string              // 周期结束日期
  description: string           // 周期说明（创建时的简短说明）
  summary: string              // 周期总结（用户录入的对该周期的总结文字）
  // 周期内情绪阶段快照（锁定保存时的状态）
  cyclePhaseSnapshot: CyclePhaseHistory[]
  // 周期内交易风格快照
  tradeStyleSnapshot: TradeStyleHistory[]
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
  customTradeStyles: CustomTradeStyle[]
  customCyclePhases: CustomCyclePhase[]
  tradeStyleHistory: TradeStyleHistory[]
  cyclePhaseHistory: CyclePhaseHistory[]
  cycleSummaries: CycleSummary[]
  independentTargets: IndependentTarget[]
  settings: AppSettings
  appVersion: string
  lastBackupDate: string
}

// 应用设置
export interface AppSettings {
  autoBackup: boolean           // 是否开启自动备份
  autoBackupInterval: number    // 自动备份间隔（分钟）
  lastAutoBackup: string        // 上次自动备份时间
  commissionRate?: number       // 手续费率（默认0.0003，即万三）
  stampDutyRate?: number        // 印花税率（默认0.001，即千一，仅卖出时收取）
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
  'adjust': '调整',
  'repair': '修复'
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

// 交易风格映射
export const TRADE_STYLE_LABELS: Record<TradeStyle, string> = {
  'trend': '趋势',
  'board': '连板'
}

// 情绪周期阶段映射
export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> = {
  'start': '启动',
  'main': '主升',
  'diverge': '分歧',
  'retreat': '退潮'
}
