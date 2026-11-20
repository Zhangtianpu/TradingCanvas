import type { EmotionDaily, MarketCycleStage } from '@/types'
import { buildBoardStructureMetrics, buildContinuousBoardPromotionRates } from './useEmotionMetrics'
import { buildSentimentTemperature } from './useSentimentTemperature'

export interface CycleDiagnosisPoint {
  date: string
  feedbackScore: number
  acceleration: number
  suggestedStage: MarketCycleStage
  reasons: string[]
  components: Array<{ key: string; label: string; score: number; weight: number }>
}

const STAGE_LABELS: Record<MarketCycleStage, string> = {
  start: '启动',
  main: '主升',
  expansion: '扩散',
  highDivergence: '高位分歧',
  retreat: '退潮',
  iceRepair: '冰点修复'
}

function round(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function percentile(value: number, values: number[], reverse = false) {
  if (!values.length) return 50
  const lower = values.filter(item => item < value).length
  const equal = values.filter(item => item === value).length
  const raw = (lower + equal * 0.5) / values.length * 100
  const reliability = Math.min(1, values.length / 5)
  const stabilized = 50 + (raw - 50) * reliability
  return round(reverse ? 100 - stabilized : stabilized)
}

function suggestStage(feedback: number, acceleration: number, temperature: number, temperatureDelta: number): MarketCycleStage {
  if (feedback >= 72 && acceleration >= 6) return 'retreat'
  if (feedback >= 58 || acceleration >= 12) return 'highDivergence'
  if (temperature <= 35 && temperatureDelta >= 4) return 'iceRepair'
  if (temperature >= 72 && feedback <= 48) return 'expansion'
  if (temperature >= 56 && feedback <= 55) return 'main'
  return 'start'
}

export function buildCycleDiagnosis(emotions: EmotionDaily[]): CycleDiagnosisPoint[] {
  const sorted = [...emotions].sort((a, b) => a.date.localeCompare(b.date))
  const promotionRates = buildContinuousBoardPromotionRates(sorted)
  const boardMetrics = buildBoardStructureMetrics(sorted)
  const temperatures = buildSentimentTemperature(sorted)
  const points: CycleDiagnosisPoint[] = []

  sorted.forEach((emotion, index) => {
    const window = sorted.slice(Math.max(0, index - 59), index + 1)
    const values = (getter: (item: EmotionDaily) => number) => window.map(getter)
    const promotion = promotionRates[emotion.date] || 0
    const firstToSecond = boardMetrics.firstToSecondRates[emotion.date] || 0
    const secondToThird = boardMetrics.secondToThirdRates[emotion.date] || 0

    const components = [
      { key: 'broken', label: '炸板压力', score: percentile(emotion.brokenRate || 0, values(item => item.brokenRate || 0)), weight: 25 },
      { key: 'limitDown', label: '跌停压力', score: percentile(emotion.limitDownCount || 0, values(item => item.limitDownCount || 0)), weight: 20 },
      { key: 'seal', label: '封板弱化', score: percentile(emotion.sealRate || 0, values(item => item.sealRate || 0), true), weight: 15 },
      {
        key: 'promotion',
        label: '晋级弱化',
        score: percentile(promotion, window.map(item => promotionRates[item.date] || 0), true),
        weight: 20
      },
      {
        key: 'relay',
        label: '梯队衰减',
        score: round(average([
          percentile(firstToSecond, window.map(item => boardMetrics.firstToSecondRates[item.date] || 0), true),
          percentile(secondToThird, window.map(item => boardMetrics.secondToThirdRates[item.date] || 0), true)
        ])),
        weight: 20
      }
    ]

    let feedbackScore = components.reduce((sum, component) => sum + component.score * component.weight / 100, 0)
    const tags = new Set(emotion.stairDateTags || [])
    if (emotion.isClear || tags.has('isClear')) feedbackScore += 6
    if (emotion.isLeaderBreak || tags.has('isLeaderBreak')) feedbackScore += 8
    feedbackScore = round(feedbackScore)

    const baseline = average(points.slice(-3).map(point => point.feedbackScore))
    const acceleration = Math.round((feedbackScore - (points.length ? baseline : feedbackScore)) * 10) / 10
    const temperature = temperatures[index]
    const suggestedStage = suggestStage(feedbackScore, acceleration, temperature?.score || 50, temperature?.delta || 0)
    const reasons: string[] = []

    if (acceleration >= 12) reasons.push(`负反馈较近3日均值加速${acceleration.toFixed(1)}分`)
    else if (acceleration >= 5) reasons.push(`负反馈正在上升，增幅${acceleration.toFixed(1)}分`)
    else if (acceleration <= -8) reasons.push(`负反馈明显缓解${Math.abs(acceleration).toFixed(1)}分`)
    if (components[0].score >= 70) reasons.push('炸板率处于近期高位，承接稳定性下降')
    if (components[3].score >= 70) reasons.push('连板晋级率偏弱，接力意愿不足')
    if (components[4].score >= 70) reasons.push('一进二、二进三梯队出现衰减')
    if (tags.has('isLeaderBreak') || emotion.isLeaderBreak) reasons.push('当日出现龙头断板标记')
    if (tags.has('isClear') || emotion.isClear) reasons.push('当日出现中位出清标记')
    if (!reasons.length) reasons.push('主要负反馈指标处于正常波动区间')

    points.push({ date: emotion.date, feedbackScore, acceleration, suggestedStage, reasons: reasons.slice(0, 3), components })
  })

  return points
}

export function marketCycleStageLabel(stage: MarketCycleStage) {
  return STAGE_LABELS[stage]
}
