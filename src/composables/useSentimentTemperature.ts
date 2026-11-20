import type { EmotionDaily } from '@/types'
import { buildBoardStructureMetrics, buildContinuousBoardPromotionRates } from './useEmotionMetrics'

export type SentimentDimensionKey = 'breadth' | 'profit' | 'relay' | 'risk' | 'trend'

export interface SentimentDimension {
  key: SentimentDimensionKey
  label: string
  score: number
  weight: number
}

export interface SentimentTemperaturePoint {
  date: string
  score: number
  delta: number
  state: string
  stateKey: 'extremeIce' | 'ice' | 'weak' | 'mixed' | 'warming' | 'climax' | 'extremeClimax'
  dimensions: SentimentDimension[]
  reasons: string[]
  confidence: number
}

interface DerivedEmotion {
  emotion: EmotionDaily
  breadthBalance: number
  allAChange: number
  limitUp: number
  limitDown: number
  firstBoard: number
  sealRate: number
  brokenRate: number
  continuousBoard: number
  promotionRate: number
  firstToSecondRate: number
  secondToThirdRate: number
  maxBoardHeight: number
  downShare: number
  priceVolumeImpulse: number
}

const WINDOW_SIZE = 60

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 50
}

function roundScore(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10
}

function roundSigned(value: number) {
  return Math.round(value * 10) / 10
}

function percentile(value: number, values: number[], positive = true) {
  const valid = values.filter(Number.isFinite)
  if (!valid.length) return 50
  const lower = valid.filter(item => item < value).length
  const equal = valid.filter(item => item === value).length
  const raw = (lower + equal * 0.5) / valid.length * 100
  // 样本很少时向中性值收缩，避免前几天出现极端评分。
  const reliability = Math.min(1, valid.length / 5)
  const stabilized = 50 + (raw - 50) * reliability
  return positive ? stabilized : 100 - stabilized
}

function classifyState(score: number, delta: number) {
  if (score <= 15) {
    return { state: delta >= 5 ? '极致冰点修复' : '极致冰点', stateKey: 'extremeIce' as const }
  }
  if (score <= 30) {
    return { state: delta >= 5 ? '冰点修复' : delta <= -5 ? '冰点加速' : '冰点', stateKey: 'ice' as const }
  }
  if (score <= 45) return { state: delta >= 5 ? '弱势修复' : '弱势', stateKey: 'weak' as const }
  if (score <= 60) return { state: delta >= 5 ? '混沌转强' : delta <= -5 ? '混沌转弱' : '混沌', stateKey: 'mixed' as const }
  if (score <= 75) return { state: delta <= -5 ? '回暖分歧' : '回暖', stateKey: 'warming' as const }
  if (score <= 88) {
    return { state: delta <= -5 ? '高潮分歧' : delta >= 5 ? '高潮加速' : '高潮', stateKey: 'climax' as const }
  }
  return { state: delta <= -5 ? '极致高潮分歧' : '极致高潮', stateKey: 'extremeClimax' as const }
}

function buildDerived(emotions: EmotionDaily[]): DerivedEmotion[] {
  const sorted = [...emotions].sort((a, b) => a.date.localeCompare(b.date))
  const promotionRates = buildContinuousBoardPromotionRates(sorted)
  const boardMetrics = buildBoardStructureMetrics(sorted)

  return sorted.map((emotion, index) => {
    const totalBreadth = Math.max(1, (emotion.upCount || 0) + (emotion.downCount || 0))
    const previousVolumes = sorted
      .slice(Math.max(0, index - 5), index)
      .map(item => item.allAVolume || 0)
      .filter(value => value > 0)
    const volumeAverage = previousVolumes.length
      ? previousVolumes.reduce((sum, value) => sum + value, 0) / previousVolumes.length
      : emotion.allAVolume || 1
    const volumeRatio = volumeAverage > 0 ? (emotion.allAVolume || 0) / volumeAverage : 1

    return {
      emotion,
      breadthBalance: ((emotion.upCount || 0) - (emotion.downCount || 0)) / totalBreadth * 100,
      allAChange: emotion.allAChange || 0,
      limitUp: emotion.limitUpCount || 0,
      limitDown: emotion.limitDownCount || 0,
      firstBoard: boardMetrics.firstBoardCounts[emotion.date] || 0,
      sealRate: emotion.sealRate || 0,
      brokenRate: emotion.brokenRate || 0,
      continuousBoard: emotion.continuousBoardCount || 0,
      promotionRate: promotionRates[emotion.date] || 0,
      firstToSecondRate: boardMetrics.firstToSecondRates[emotion.date] || 0,
      secondToThirdRate: boardMetrics.secondToThirdRates[emotion.date] || 0,
      maxBoardHeight: emotion.maxBoardHeight || 0,
      downShare: (emotion.downCount || 0) / totalBreadth * 100,
      priceVolumeImpulse: (emotion.allAChange || 0) * Math.max(0.5, Math.min(2, volumeRatio))
    }
  })
}

export function buildSentimentTemperature(emotions: EmotionDaily[]): SentimentTemperaturePoint[] {
  const derived = buildDerived(emotions)
  const points: SentimentTemperaturePoint[] = []

  derived.forEach((current, index) => {
    const window = derived.slice(Math.max(0, index - WINDOW_SIZE + 1), index + 1)
    const rank = (key: keyof DerivedEmotion, positive = true) => percentile(
      Number(current[key]) || 0,
      window.map(item => Number(item[key]) || 0),
      positive
    )

    const dimensions: SentimentDimension[] = [
      {
        key: 'breadth',
        label: '市场广度',
        score: roundScore(average([rank('breadthBalance'), rank('allAChange')])),
        weight: 25
      },
      {
        key: 'profit',
        label: '赚钱效应',
        score: roundScore(average([rank('limitUp'), rank('firstBoard'), rank('sealRate'), rank('brokenRate', false)])),
        weight: 25
      },
      {
        key: 'relay',
        label: '接力能力',
        score: roundScore(average([
          rank('continuousBoard'),
          rank('promotionRate'),
          rank('firstToSecondRate'),
          rank('secondToThirdRate'),
          rank('maxBoardHeight')
        ])),
        weight: 25
      },
      {
        key: 'risk',
        label: '风险承受',
        score: roundScore(average([rank('limitDown', false), rank('downShare', false)])),
        weight: 15
      },
      {
        key: 'trend',
        label: '量价确认',
        score: roundScore(average([rank('allAChange'), rank('priceVolumeImpulse')])),
        weight: 10
      }
    ]

    const score = roundScore(dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight / 100, 0))
    const previousScore = points[index - 1]?.score ?? score
    const delta = roundSigned(score - previousScore)
    const classification = classifyState(score, delta)
    const sortedDimensions = [...dimensions].sort((a, b) => a.score - b.score)
    const reasons: string[] = []

    if (rank('limitDown') >= 80) reasons.push('跌停家数处于近60日高位，亏钱压力偏大')
    if (rank('limitUp') >= 80) reasons.push('涨停家数处于近60日高位，赚钱效应活跃')
    if (rank('promotionRate') >= 75) reasons.push('连板晋级率位于历史高位，接力意愿较强')
    if (rank('promotionRate') <= 25) reasons.push('连板晋级率位于历史低位，接力意愿不足')
    if (rank('sealRate') <= 25) reasons.push('封板率偏低，资金一致性不足')
    if (rank('breadthBalance') <= 20) reasons.push('下跌家数明显占优，市场广度较弱')
    if (rank('breadthBalance') >= 80) reasons.push('上涨家数明显占优，市场广度较强')
    if (reasons.length < 3) reasons.push(`${sortedDimensions[0].label}仅${Math.round(sortedDimensions[0].score)}分，是主要拖累项`)
    const strongestDimension = sortedDimensions[sortedDimensions.length - 1]
    if (reasons.length < 3) reasons.push(`${strongestDimension?.label || '综合强度'}${Math.round(strongestDimension?.score || 0)}分，提供主要支撑`)

    points.push({
      date: current.emotion.date,
      score,
      delta,
      ...classification,
      dimensions,
      reasons: reasons.slice(0, 3),
      confidence: Math.round(Math.min(1, window.length / WINDOW_SIZE) * 100)
    })
  })

  return points
}
