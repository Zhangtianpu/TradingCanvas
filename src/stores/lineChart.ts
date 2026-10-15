import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type LineChartKey =
  | 'sh'
  | 'sz'
  | 'cyb'
  | 'allA'
  | 'up'
  | 'limitUp'
  | 'limitDown'
  | 'continuousBoard'
  | 'promotionRate'
  | 'sealRate'
  | 'height'
  | 'targetStocks'

export interface LineChartDefinition {
  key: LineChartKey
  title: string
  group: '宏观指数' | '涨跌概况' | '连板情绪'
  color: string
  fill: boolean
  special?: true | 'review'
}

export interface MovingAverageConfig {
  id: string
  type: 'rolling' | 'cumulative'
  period?: number
  color: string
}

export interface LineChartPreference {
  enabled: boolean
  averages: MovingAverageConfig[]
}

export const LINE_CHART_DEFINITIONS: LineChartDefinition[] = [
  { key: 'sh', title: '上证指数', group: '宏观指数', color: '#f85149', fill: false },
  { key: 'sz', title: '深证指数', group: '宏观指数', color: '#58a6ff', fill: false },
  { key: 'cyb', title: '创业板指数', group: '宏观指数', color: '#3fb950', fill: false },
  { key: 'allA', title: '全A指数', group: '宏观指数', color: '#a371f7', fill: false },
  { key: 'up', title: '上涨家数', group: '涨跌概况', color: '#f85149', fill: true },
  { key: 'limitUp', title: '涨停家数', group: '涨跌概况', color: '#f0c040', fill: true },
  { key: 'limitDown', title: '跌停家数', group: '涨跌概况', color: '#3fb950', fill: true },
  { key: 'continuousBoard', title: '连板家数', group: '连板情绪', color: '#f0c040', fill: true },
  { key: 'promotionRate', title: '连板晋级率', group: '连板情绪', color: '#bc8cff', fill: true },
  { key: 'sealRate', title: '封板率', group: '连板情绪', color: '#58a6ff', fill: true },
  { key: 'height', title: '空间板高度', group: '连板情绪', color: '#f0c040', fill: true, special: true },
  { key: 'targetStocks', title: '目标标的', group: '连板情绪', color: '#a371f7', fill: true, special: 'review' }
]

const STORAGE_KEY = 'trading-canvas-line-chart-settings'
const averageColors = ['#ff7b72', '#79c0ff', '#7ee787', '#d2a8ff', '#ffa657', '#39c5cf']

function defaults(): Record<LineChartKey, LineChartPreference> {
  return LINE_CHART_DEFINITIONS.reduce((result, item) => {
    result[item.key] = { enabled: true, averages: [] }
    return result
  }, {} as Record<LineChartKey, LineChartPreference>)
}

function loadPreferences() {
  const fallback = defaults()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<Record<LineChartKey, LineChartPreference>>
    LINE_CHART_DEFINITIONS.forEach(item => {
      const value = saved[item.key]
      if (!value) return
      fallback[item.key] = {
        enabled: value.enabled !== false,
        averages: Array.isArray(value.averages) ? value.averages.filter(average =>
          average?.type === 'cumulative' || (average?.type === 'rolling' && Number(average.period) >= 2)
        ) : []
      }
    })
  } catch {
    // 损坏的旧配置直接回退到默认值。
  }
  return fallback
}

export function movingAverageLabel(average: MovingAverageConfig) {
  return average.type === 'cumulative' ? '开始至今均线' : `${average.period}日均线`
}

export const useLineChartStore = defineStore('lineChart', () => {
  const preferences = ref(loadPreferences())

  const enabledDefinitions = computed(() => LINE_CHART_DEFINITIONS.filter(item => preferences.value[item.key].enabled))

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.value))
  }

  function setEnabled(key: LineChartKey, enabled: boolean) {
    preferences.value[key].enabled = enabled
    persist()
  }

  function addRollingAverage(key: LineChartKey, period: number) {
    const normalized = Math.floor(Number(period))
    if (normalized < 2 || normalized > 365) return false
    const list = preferences.value[key].averages
    if (list.some(item => item.type === 'rolling' && item.period === normalized)) return false
    list.push({
      id: `rolling-${normalized}`,
      type: 'rolling',
      period: normalized,
      color: averageColors[list.length % averageColors.length]
    })
    persist()
    return true
  }

  function addCumulativeAverage(key: LineChartKey) {
    const list = preferences.value[key].averages
    if (list.some(item => item.type === 'cumulative')) return false
    list.push({
      id: 'cumulative',
      type: 'cumulative',
      color: averageColors[list.length % averageColors.length]
    })
    persist()
    return true
  }

  function removeAverage(key: LineChartKey, id: string) {
    preferences.value[key].averages = preferences.value[key].averages.filter(item => item.id !== id)
    persist()
  }

  function reset() {
    preferences.value = defaults()
    persist()
  }

  return { preferences, enabledDefinitions, setEnabled, addRollingAverage, addCumulativeAverage, removeAverage, reset }
})
