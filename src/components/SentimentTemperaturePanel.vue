<template>
  <section class="sentiment-temperature-panel">
    <header class="temperature-header">
      <div>
        <span class="temperature-kicker">MARKET SENTIMENT TEMPERATURE</span>
        <h2>市场情绪温度</h2>
        <p>基于近60个交易日历史分位动态计算</p>
      </div>
      <span v-if="latest" class="confidence-badge" :title="'历史样本完整度 ' + latest.confidence + '%'">
        样本置信度 {{ latest.confidence }}%
      </span>
    </header>

    <div v-if="latest" class="temperature-content">
      <div class="temperature-summary">
        <div class="score-ring" :style="scoreRingStyle">
          <div class="score-ring-inner">
            <strong>{{ Math.round(latest.score) }}</strong>
            <span>/ 100</span>
          </div>
        </div>
        <div class="state-summary">
          <span class="state-label" :class="`state-${latest.stateKey}`">{{ latest.state }}</span>
          <strong :class="latest.delta > 0 ? 'delta-up' : latest.delta < 0 ? 'delta-down' : 'delta-flat'">
            {{ latest.delta > 0 ? '+' : '' }}{{ latest.delta }}
          </strong>
          <small>较上一交易日</small>
          <time>{{ latest.date }}</time>
        </div>
      </div>

      <div class="dimension-panel">
        <div v-for="dimension in latest.dimensions" :key="dimension.key" class="dimension-row">
          <div class="dimension-meta">
            <span>{{ dimension.label }}</span>
            <small>权重 {{ dimension.weight }}%</small>
            <strong>{{ Math.round(dimension.score) }}</strong>
          </div>
          <div class="dimension-track">
            <i :style="{ width: dimension.score + '%', background: dimensionColor(dimension.score) }"></i>
          </div>
        </div>
      </div>

      <div class="temperature-reasons">
        <strong>今日归因</strong>
        <ul>
          <li v-for="reason in latest.reasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>
    </div>

    <div v-if="latest && trendPoints.length" class="temperature-trend">
      <div class="trend-heading">
        <div>
          <strong>最近{{ trendPoints.length }}日情绪轨迹</strong>
          <small>低于30为冰点区域，高于75为高潮区域</small>
        </div>
        <div class="trend-legend">
          <span><i class="ice"></i>冰点线 30</span>
          <span><i class="climax"></i>高潮线 75</span>
        </div>
      </div>
      <div class="trend-chart-wrap">
        <svg class="trend-chart" viewBox="0 0 720 180" preserveAspectRatio="none" role="img" aria-label="市场情绪温度最近20日趋势">
          <defs>
            <linearGradient id="sentimentAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#58a6ff" stop-opacity=".28" />
              <stop offset="100%" stop-color="#58a6ff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line x1="34" x2="710" :y1="scoreY(75)" :y2="scoreY(75)" class="threshold climax" />
          <line x1="34" x2="710" :y1="scoreY(30)" :y2="scoreY(30)" class="threshold ice" />
          <text x="4" :y="scoreY(75) + 3" class="threshold-label">75</text>
          <text x="4" :y="scoreY(30) + 3" class="threshold-label">30</text>
          <path :d="trendAreaPath" fill="url(#sentimentAreaGradient)" />
          <polyline :points="trendPolyline" class="trend-line" />
          <g v-for="point in trendCoordinates" :key="point.date">
            <circle :cx="point.x" :cy="point.y" r="3.5" :fill="stateColor(point.stateKey)">
              <title>{{ point.date }} · {{ point.score }}分 · {{ point.state }}</title>
            </circle>
          </g>
        </svg>
        <div class="trend-dates">
          <span>{{ trendPoints[0]?.date.slice(5) }}</span>
          <span>{{ trendPoints[Math.floor((trendPoints.length - 1) / 2)]?.date.slice(5) }}</span>
          <span>{{ trendPoints[trendPoints.length - 1]?.date.slice(5) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="temperature-empty">暂无足够的行情记录，录入每日复盘数据后将自动生成情绪温度。</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EmotionDaily } from '@/types'
import { buildSentimentTemperature, type SentimentTemperaturePoint } from '@/composables/useSentimentTemperature'

const props = defineProps<{ emotions: EmotionDaily[] }>()

const temperaturePoints = computed(() => buildSentimentTemperature(props.emotions))
const latest = computed(() => temperaturePoints.value[temperaturePoints.value.length - 1] || null)
const trendPoints = computed(() => temperaturePoints.value.slice(-20))

const chartLeft = 34
const chartRight = 710
const chartTop = 12
const chartBottom = 158

function scoreY(score: number) {
  return chartBottom - Math.max(0, Math.min(100, score)) / 100 * (chartBottom - chartTop)
}

const trendCoordinates = computed(() => trendPoints.value.map((point, index, points) => ({
  ...point,
  x: points.length <= 1 ? (chartLeft + chartRight) / 2 : chartLeft + index / (points.length - 1) * (chartRight - chartLeft),
  y: scoreY(point.score)
})))

const trendPolyline = computed(() => trendCoordinates.value.map(point => `${point.x},${point.y}`).join(' '))
const trendAreaPath = computed(() => {
  if (!trendCoordinates.value.length) return ''
  const first = trendCoordinates.value[0]
  const last = trendCoordinates.value[trendCoordinates.value.length - 1]
  return `M ${first.x} ${chartBottom} L ${trendCoordinates.value.map(point => `${point.x} ${point.y}`).join(' L ')} L ${last.x} ${chartBottom} Z`
})

function stateColor(stateKey: SentimentTemperaturePoint['stateKey']) {
  return {
    extremeIce: '#58a6ff',
    ice: '#79c0ff',
    weak: '#8b949e',
    mixed: '#d2a8ff',
    warming: '#e3b341',
    climax: '#ff7b72',
    extremeClimax: '#f85149'
  }[stateKey]
}

function dimensionColor(score: number) {
  if (score <= 30) return '#58a6ff'
  if (score <= 45) return '#8b949e'
  if (score <= 60) return '#a371f7'
  if (score <= 75) return '#d29922'
  return '#f85149'
}

const scoreRingStyle = computed(() => {
  const score = latest.value?.score || 0
  const color = latest.value ? stateColor(latest.value.stateKey) : '#8b949e'
  return { background: `conic-gradient(${color} ${score * 3.6}deg, rgba(110, 118, 129, .16) 0deg)` }
})
</script>

<style scoped>
.sentiment-temperature-panel {
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.temperature-header,
.temperature-content,
.trend-heading,
.dimension-meta,
.trend-legend,
.trend-dates {
  display: flex;
  align-items: center;
}

.temperature-header {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.temperature-kicker {
  color: var(--color-blue);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.temperature-header h2 {
  margin: 3px 0 2px;
  color: var(--text-primary);
  font-size: 18px;
}

.temperature-header p,
.trend-heading small {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 10px;
}

.confidence-badge {
  flex-shrink: 0;
  padding: 5px 9px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 10px;
}

.temperature-content {
  align-items: stretch;
  gap: 20px;
}

.temperature-summary {
  min-width: 210px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding-right: 18px;
  border-right: 1px solid var(--border-color);
}

.score-ring {
  width: 104px;
  height: 104px;
  flex: 0 0 104px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.score-ring-inner {
  width: 78px;
  height: 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
}

.score-ring-inner strong {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1;
}

.score-ring-inner span,
.state-summary small,
.state-summary time {
  color: var(--text-tertiary);
  font-size: 9px;
}

.state-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.state-label {
  padding: 4px 8px;
  border: 1px solid currentColor;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
}

.state-extremeIce, .state-ice { color: #79c0ff; }
.state-weak { color: #8b949e; }
.state-mixed { color: #d2a8ff; }
.state-warming { color: #e3b341; }
.state-climax, .state-extremeClimax { color: #ff7b72; }
.state-summary > strong { font-size: 18px; }
.delta-up { color: #f85149; }
.delta-down { color: #3fb950; }
.delta-flat { color: var(--text-tertiary); }

.dimension-panel {
  flex: 1 1 420px;
  display: grid;
  gap: 9px;
}

.dimension-meta {
  gap: 7px;
  margin-bottom: 4px;
  font-size: 10px;
}

.dimension-meta span { color: var(--text-secondary); }
.dimension-meta small { color: var(--text-tertiary); }
.dimension-meta strong { margin-left: auto; color: var(--text-primary); font-size: 11px; }

.dimension-track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(110, 118, 129, .14);
}

.dimension-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width .25s ease;
}

.temperature-reasons {
  flex: 1 1 340px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: rgba(110, 118, 129, .04);
}

.temperature-reasons > strong,
.trend-heading strong {
  color: var(--text-primary);
  font-size: 11px;
}

.temperature-reasons ul {
  margin: 8px 0 0;
  padding-left: 16px;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.7;
}

.temperature-trend {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.trend-heading {
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
}

.trend-heading > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.trend-legend {
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 9px;
}

.trend-legend span { display: flex; align-items: center; gap: 4px; }
.trend-legend i { width: 14px; height: 2px; display: inline-block; }
.trend-legend .ice { background: #58a6ff; }
.trend-legend .climax { background: #f85149; }

.trend-chart-wrap {
  padding: 4px 8px 0;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: rgba(13, 17, 23, .26);
}

.trend-chart {
  width: 100%;
  height: 180px;
  overflow: visible;
}

.threshold { stroke-width: 1; stroke-dasharray: 5 5; opacity: .6; }
.threshold.ice { stroke: #58a6ff; }
.threshold.climax { stroke: #f85149; }
.threshold-label { fill: #8b949e; font-size: 9px; }
.trend-line { fill: none; stroke: #58a6ff; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }

.trend-dates {
  justify-content: space-between;
  padding: 0 8px 7px 34px;
  color: var(--text-tertiary);
  font-size: 9px;
}

.temperature-empty {
  padding: 28px;
  border: 1px dashed var(--border-color);
  border-radius: 7px;
  color: var(--text-tertiary);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 900px) {
  .temperature-content { flex-wrap: wrap; }
  .temperature-summary { flex: 1 1 100%; border-right: 0; border-bottom: 1px solid var(--border-color); padding: 0 0 14px; }
  .dimension-panel, .temperature-reasons { flex-basis: 100%; }
}

@media (max-width: 560px) {
  .sentiment-temperature-panel { padding: 12px; }
  .temperature-header, .trend-heading { align-items: flex-start; flex-direction: column; }
  .trend-legend { flex-wrap: wrap; }
}
</style>
