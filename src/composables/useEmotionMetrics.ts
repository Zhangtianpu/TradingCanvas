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
