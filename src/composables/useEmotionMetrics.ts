import type { EmotionDaily } from '@/types'

/** 当天连板家数 ÷ 前一条交易日记录的涨停家数 × 100%。 */
export function buildContinuousBoardPromotionRates(emotions: EmotionDaily[]): Record<string, number> {
  const sorted = [...emotions].sort((a, b) => a.date.localeCompare(b.date))
  const rates: Record<string, number> = {}
  sorted.forEach((emotion, index) => {
    const previous = sorted[index - 1]
    rates[emotion.date] = previous && previous.limitUpCount > 0
      ? emotion.continuousBoardCount / previous.limitUpCount * 100
      : 0
  })
  return rates
}

export interface BoardStructureMetrics {
  firstBoardCounts: Record<string, number>
  firstToSecondRates: Record<string, number>
  secondToThirdRates: Record<string, number>
}

/**
 * 首板家数 = 当日涨停家数 - 当日连板家数。
 * 一进二 = 当日二板家数 ÷ 前一交易日首板家数。
 * 二进三 = 当日三板家数 ÷ 前一交易日二板家数。
 */
export function buildBoardStructureMetrics(emotions: EmotionDaily[]): BoardStructureMetrics {
  const sorted = [...emotions].sort((a, b) => a.date.localeCompare(b.date))
  const firstBoardCounts: Record<string, number> = {}
  const firstToSecondRates: Record<string, number> = {}
  const secondToThirdRates: Record<string, number> = {}

  sorted.forEach((emotion, index) => {
    const firstBoardCount = Math.max(0, (emotion.limitUpCount || 0) - (emotion.continuousBoardCount || 0))
    firstBoardCounts[emotion.date] = firstBoardCount

    const previous = sorted[index - 1]
    const previousFirstBoardCount = previous ? firstBoardCounts[previous.date] : 0
    firstToSecondRates[emotion.date] = previousFirstBoardCount > 0
      ? (emotion.board2Count || 0) / previousFirstBoardCount * 100
      : 0
    secondToThirdRates[emotion.date] = previous && previous.board2Count > 0
      ? (emotion.board3Count || 0) / previous.board2Count * 100
      : 0
  })

  return { firstBoardCounts, firstToSecondRates, secondToThirdRates }
}
