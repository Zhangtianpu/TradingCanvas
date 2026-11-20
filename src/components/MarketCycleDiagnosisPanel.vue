<template>
  <section class="cycle-diagnosis-panel">
    <header class="diagnosis-header">
      <div>
        <span class="kicker">MARKET CYCLE DIAGNOSIS</span>
        <h2>大周期诊断</h2>
        <p>自动识别负反馈变化，周期阶段由系统建议、人工确认</p>
      </div>
      <button class="setting-button" @click="openEditor">{{ activeCycle ? '设置周期' : '+ 建立大周期' }}</button>
    </header>

    <div v-if="latestDiagnosis" class="diagnosis-grid">
      <div class="cycle-overview">
        <div class="overview-heading">
          <div>
            <small>当前大周期</small>
            <strong>{{ activeCycle?.name || '尚未命名' }}</strong>
          </div>
          <span v-if="activeCycle" class="running-days">第 {{ runningDays }} 个交易日</span>
        </div>

        <div v-if="activeCycle?.carriers.length" class="carrier-list">
          <span>周期载体</span>
          <b v-for="carrier in activeCycle.carriers" :key="carrier">{{ carrier }}</b>
        </div>
        <div v-else class="cycle-empty-tip">设置周期载体和启动日期后，可跟踪大周期运行时间。</div>

        <div class="stage-summary">
          <span>当前阶段</span>
          <strong :class="`stage-${displayStage}`">{{ marketCycleStageLabel(displayStage) }}</strong>
          <em>{{ activeCycle?.confirmedStage ? '人工确认' : '系统建议' }}</em>
        </div>
      </div>

      <div class="risk-metrics">
        <article>
          <span>负反馈强度</span>
          <strong :style="{ color: feedbackColor(latestDiagnosis.feedbackScore) }">{{ Math.round(latestDiagnosis.feedbackScore) }}</strong>
          <small>/ 100</small>
        </article>
        <article>
          <span>负反馈加速度</span>
          <strong :class="accelerationClass">{{ signed(latestDiagnosis.acceleration) }}</strong>
          <small>对比近3日均值</small>
        </article>
        <article>
          <span>风险状态</span>
          <strong class="risk-word">{{ riskLabel }}</strong>
          <small>{{ latestDiagnosis.date }}</small>
        </article>

        <div class="component-bars">
          <div v-for="component in latestDiagnosis.components" :key="component.key" class="component-row">
            <span>{{ component.label }}</span>
            <i><b :style="{ width: component.score + '%', background: feedbackColor(component.score) }"></b></i>
            <strong>{{ Math.round(component.score) }}</strong>
          </div>
        </div>
      </div>

      <div class="risk-reasons">
        <strong>系统判断依据</strong>
        <ul>
          <li v-for="reason in latestDiagnosis.reasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>
    </div>

    <div v-if="latestDiagnosis" class="stage-track-wrap">
      <div class="track-title">
        <strong>周期阶段</strong>
        <span>系统建议不会覆盖人工判断</span>
      </div>
      <div class="stage-track">
        <template v-for="(stage, index) in stages" :key="stage.key">
          <div class="stage-node" :class="{ active: displayStage === stage.key, suggested: suggestedStage === stage.key && displayStage !== stage.key }">
            <i>{{ index + 1 }}</i>
            <span>{{ stage.label }}</span>
            <small v-if="displayStage === stage.key">{{ activeCycle?.confirmedStage ? '已确认' : '当前位置' }}</small>
            <small v-else-if="suggestedStage === stage.key">系统建议</small>
          </div>
          <b v-if="index < stages.length - 1" class="stage-line"></b>
        </template>
      </div>
    </div>

    <div v-if="activeCycle?.smallCycles.length" class="small-cycles">
      <div class="track-title">
        <strong>嵌套小周期</strong>
        <span>观察小周期寿命是否持续缩短</span>
      </div>
      <div class="small-cycle-list">
        <article v-for="cycle in activeCycle.smallCycles" :key="cycle.id">
          <div>
            <strong>{{ cycle.name }}</strong>
            <span>{{ cycle.carrier || '未设置载体' }}</span>
          </div>
          <p>{{ cycle.startDate.slice(5) }} → {{ cycle.endDate?.slice(5) || '进行中' }}</p>
          <b>{{ subCycleDays(cycle.startDate, cycle.endDate) }}天</b>
        </article>
      </div>
    </div>

    <div v-if="trendPoints.length" class="feedback-trend">
      <div class="track-title">
        <strong>近20日负反馈轨迹</strong>
        <span>上穿60进入高风险区，上升速度比绝对值更重要</span>
      </div>
      <svg viewBox="0 0 760 128" preserveAspectRatio="none" role="img" aria-label="近20日负反馈强度">
        <line x1="24" x2="750" :y1="pointY(60)" :y2="pointY(60)" class="risk-threshold" />
        <polyline :points="trendPolyline" class="feedback-line" />
        <g v-for="point in trendCoordinates" :key="point.date">
          <circle :cx="point.x" :cy="point.y" r="3" :fill="feedbackColor(point.feedbackScore)">
            <title>{{ point.date }} · 负反馈{{ point.feedbackScore }} · 加速度{{ signed(point.acceleration) }}</title>
          </circle>
        </g>
      </svg>
    </div>

    <div v-if="!latestDiagnosis" class="diagnosis-empty">暂无每日情绪数据，录入行情后将自动生成周期诊断。</div>

    <div v-if="showEditor" class="editor-mask" @click.self="showEditor = false">
      <div class="cycle-editor">
        <header>
          <div>
            <strong>设置大周期</strong>
            <small>周期判断可随时修改，不影响原始行情记录</small>
          </div>
          <button @click="showEditor = false">×</button>
        </header>

        <div class="editor-body">
          <div class="form-grid">
            <label>
              <span>周期名称</span>
              <input v-model="form.name" placeholder="例如：哈药—九阳周期" />
            </label>
            <label>
              <span>周期载体</span>
              <input v-model="form.carriers" placeholder="多个标的用逗号分隔" />
            </label>
            <label>
              <span>启动日期</span>
              <input v-model="form.startDate" type="date" />
            </label>
            <label>
              <span>人工确认阶段</span>
              <select v-model="form.confirmedStage">
                <option value="">跟随系统建议</option>
                <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
              </select>
            </label>
          </div>

          <div class="subcycle-editor">
            <div class="subcycle-heading">
              <div><strong>嵌套小周期</strong><small>例如青岛小周期、闽发小周期</small></div>
              <button @click="addSmallCycle">+ 添加</button>
            </div>
            <div v-if="!form.smallCycles.length" class="no-subcycle">暂未记录小周期</div>
            <div v-for="(cycle, index) in form.smallCycles" :key="cycle.id" class="subcycle-row">
              <input v-model="cycle.name" placeholder="小周期名称" />
              <input v-model="cycle.carrier" placeholder="载体" />
              <input v-model="cycle.startDate" type="date" />
              <input v-model="cycle.endDate" type="date" />
              <button title="删除" @click="form.smallCycles.splice(index, 1)">×</button>
            </div>
          </div>
        </div>

        <footer>
          <button class="cancel" @click="showEditor = false">取消</button>
          <button class="save" @click="saveCycle">保存周期</button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EmotionDaily, MarketCycleStage, MarketSubCycle } from '@/types'
import { generateId } from '@/composables/useStorage'
import { buildCycleDiagnosis, marketCycleStageLabel } from '@/composables/useCycleDiagnosis'
import { useMarketCycleStore } from '@/stores/marketCycle'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ emotions: EmotionDaily[] }>()
const cycleStore = useMarketCycleStore()
const toast = useToast()
const showEditor = ref(false)

const stages: Array<{ key: MarketCycleStage; label: string }> = [
  { key: 'start', label: '启动' },
  { key: 'main', label: '主升' },
  { key: 'expansion', label: '扩散' },
  { key: 'highDivergence', label: '高位分歧' },
  { key: 'retreat', label: '退潮' },
  { key: 'iceRepair', label: '冰点修复' }
]

const diagnosisPoints = computed(() => buildCycleDiagnosis(props.emotions))
const latestDiagnosis = computed(() => diagnosisPoints.value[diagnosisPoints.value.length - 1] || null)
const activeCycle = computed(() => cycleStore.activeCycle)
const suggestedStage = computed<MarketCycleStage>(() => latestDiagnosis.value?.suggestedStage || 'start')
const displayStage = computed<MarketCycleStage>(() => activeCycle.value?.confirmedStage || suggestedStage.value)
const trendPoints = computed(() => diagnosisPoints.value.slice(-20))

const runningDays = computed(() => {
  if (!activeCycle.value) return 0
  const end = activeCycle.value.endDate || latestDiagnosis.value?.date || new Date().toISOString().slice(0, 10)
  const recorded = props.emotions.filter(item => item.date >= activeCycle.value!.startDate && item.date <= end).length
  return recorded || countWeekdays(activeCycle.value.startDate, end)
})

const riskLabel = computed(() => {
  const score = latestDiagnosis.value?.feedbackScore || 0
  const acceleration = latestDiagnosis.value?.acceleration || 0
  if (score >= 72 && acceleration >= 6) return '剧烈加速'
  if (score >= 60) return acceleration > 0 ? '高位上升' : '高位缓解'
  if (acceleration >= 10) return '快速升温'
  if (acceleration <= -8) return '明显缓解'
  return '正常波动'
})

const accelerationClass = computed(() => {
  const value = latestDiagnosis.value?.acceleration || 0
  return value >= 8 ? 'acceleration-danger' : value > 0 ? 'acceleration-warning' : value < 0 ? 'acceleration-safe' : ''
})

const form = ref({
  id: '',
  name: '',
  carriers: '',
  startDate: '',
  confirmedStage: '' as '' | MarketCycleStage,
  smallCycles: [] as Array<MarketSubCycle & { endDate: string }>
})

function openEditor() {
  const cycle = activeCycle.value
  form.value = cycle ? {
    id: cycle.id,
    name: cycle.name,
    carriers: cycle.carriers.join('、'),
    startDate: cycle.startDate,
    confirmedStage: cycle.confirmedStage || '',
    smallCycles: cycle.smallCycles.map(item => ({ ...item, endDate: item.endDate || '' }))
  } : {
    id: '',
    name: '',
    carriers: '',
    startDate: latestDiagnosis.value?.date || new Date().toISOString().slice(0, 10),
    confirmedStage: '',
    smallCycles: []
  }
  showEditor.value = true
}

function addSmallCycle() {
  form.value.smallCycles.push({
    id: generateId(),
    name: '',
    carrier: '',
    startDate: form.value.startDate,
    endDate: ''
  })
}

function saveCycle() {
  if (!form.value.name.trim()) {
    toast.error('请输入大周期名称')
    return
  }
  if (!form.value.startDate) {
    toast.error('请选择周期启动日期')
    return
  }
  cycleStore.saveCycle({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    carriers: form.value.carriers.split(/[、,，]/).map(item => item.trim()).filter(Boolean),
    startDate: form.value.startDate,
    confirmedStage: form.value.confirmedStage || undefined,
    smallCycles: form.value.smallCycles
      .filter(item => item.name.trim())
      .map(item => ({ ...item, name: item.name.trim(), carrier: item.carrier.trim(), endDate: item.endDate || undefined }))
  })
  showEditor.value = false
  toast.success('大周期诊断设置已保存')
}

function countWeekdays(startDate: string, endDate: string) {
  if (!startDate || !endDate || startDate > endDate) return 0
  let count = 0
  const current = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) count += 1
    current.setDate(current.getDate() + 1)
  }
  return count
}

function subCycleDays(start: string, end?: string) {
  return countWeekdays(start, end || latestDiagnosis.value?.date || new Date().toISOString().slice(0, 10))
}

function feedbackColor(score: number) {
  if (score >= 72) return '#f85149'
  if (score >= 58) return '#f0883e'
  if (score >= 42) return '#d29922'
  return '#3fb950'
}

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

const chartLeft = 24
const chartRight = 750
const chartTop = 8
const chartBottom = 112
function pointY(score: number) {
  return chartBottom - Math.max(0, Math.min(100, score)) / 100 * (chartBottom - chartTop)
}
const trendCoordinates = computed(() => trendPoints.value.map((point, index, points) => ({
  ...point,
  x: points.length <= 1 ? (chartLeft + chartRight) / 2 : chartLeft + index / (points.length - 1) * (chartRight - chartLeft),
  y: pointY(point.feedbackScore)
})))
const trendPolyline = computed(() => trendCoordinates.value.map(point => `${point.x},${point.y}`).join(' '))
</script>

<style scoped>
.cycle-diagnosis-panel {
  padding: 18px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.diagnosis-header,
.overview-heading,
.stage-summary,
.track-title,
.subcycle-heading,
.cycle-editor header,
.cycle-editor footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diagnosis-header { gap: 18px; margin-bottom: 16px; }
.kicker { color: var(--color-purple); font-size: 9px; font-weight: 700; letter-spacing: 1.2px; }
.diagnosis-header h2 { margin: 3px 0 2px; font-size: 18px; }
.diagnosis-header p { margin: 0; color: var(--text-tertiary); font-size: 10px; }
.setting-button,
.subcycle-heading button {
  padding: 6px 12px;
  color: var(--color-blue);
  background: rgba(88, 166, 255, .08);
  border: 1px solid rgba(88, 166, 255, .35);
  border-radius: 6px;
  cursor: pointer;
}

.diagnosis-grid { display: grid; grid-template-columns: 1.05fr 1.5fr 1.1fr; gap: 12px; }
.cycle-overview,
.risk-metrics,
.risk-reasons {
  min-width: 0;
  padding: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.overview-heading small { display: block; margin-bottom: 4px; color: var(--text-tertiary); font-size: 10px; }
.overview-heading strong { font-size: 16px; }
.running-days { padding: 4px 8px; color: var(--color-purple); background: rgba(163, 113, 247, .1); border-radius: 12px; font-size: 10px; }
.carrier-list { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 14px 0; }
.carrier-list > span { color: var(--text-tertiary); font-size: 10px; }
.carrier-list b { padding: 4px 8px; color: var(--color-gold); background: rgba(210, 153, 34, .09); border: 1px solid rgba(210, 153, 34, .25); border-radius: 4px; font-size: 11px; }
.cycle-empty-tip { margin: 14px 0; color: var(--text-tertiary); font-size: 10px; line-height: 1.5; }
.stage-summary { justify-content: flex-start; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.stage-summary > span { color: var(--text-tertiary); font-size: 10px; }
.stage-summary strong { font-size: 14px; }
.stage-summary em { margin-left: auto; color: var(--text-tertiary); font-size: 9px; font-style: normal; }
.stage-start { color: #3fb950; } .stage-main { color: #f85149; } .stage-expansion { color: #d29922; }
.stage-highDivergence { color: #f0883e; } .stage-retreat { color: #8b949e; } .stage-iceRepair { color: #58a6ff; }

.risk-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.risk-metrics article { padding-right: 8px; border-right: 1px solid var(--border-color); }
.risk-metrics article:nth-child(3) { border-right: 0; }
.risk-metrics article span,
.risk-metrics article small { display: block; color: var(--text-tertiary); font-size: 9px; }
.risk-metrics article strong { display: inline-block; margin: 4px 3px 2px 0; font-size: 24px; }
.risk-metrics article .risk-word { font-size: 15px; }
.acceleration-danger { color: #f85149; } .acceleration-warning { color: #f0883e; } .acceleration-safe { color: #3fb950; }
.component-bars { grid-column: 1 / -1; display: grid; gap: 6px; padding-top: 8px; border-top: 1px solid var(--border-color); }
.component-row { display: grid; grid-template-columns: 56px 1fr 24px; align-items: center; gap: 7px; font-size: 9px; }
.component-row > span { color: var(--text-secondary); }
.component-row > i { height: 4px; overflow: hidden; background: var(--bg-tertiary); border-radius: 4px; }
.component-row > i b { display: block; height: 100%; border-radius: inherit; }
.component-row > strong { color: var(--text-secondary); text-align: right; }
.risk-reasons > strong { font-size: 11px; }
.risk-reasons ul { display: grid; gap: 9px; margin: 12px 0 0; padding: 0; list-style: none; }
.risk-reasons li { position: relative; padding-left: 12px; color: var(--text-secondary); font-size: 10px; line-height: 1.5; }
.risk-reasons li::before { content: ''; position: absolute; left: 0; top: 6px; width: 4px; height: 4px; background: #f0883e; border-radius: 50%; }

.stage-track-wrap,
.small-cycles,
.feedback-trend { margin-top: 14px; padding-top: 13px; border-top: 1px solid var(--border-color); }
.track-title strong { font-size: 11px; }
.track-title span { color: var(--text-tertiary); font-size: 9px; }
.stage-track { display: flex; align-items: flex-start; margin-top: 13px; }
.stage-node { min-width: 68px; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-tertiary); }
.stage-node i { width: 24px; height: 24px; display: grid; place-items: center; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 50%; font-size: 9px; font-style: normal; }
.stage-node span { font-size: 10px; }
.stage-node small { font-size: 8px; }
.stage-node.active { color: var(--color-blue); font-weight: 600; }
.stage-node.active i { color: #fff; background: var(--color-blue); border-color: var(--color-blue); box-shadow: 0 0 12px rgba(88, 166, 255, .35); }
.stage-node.suggested { color: var(--color-purple); }
.stage-node.suggested i { border-color: var(--color-purple); }
.stage-line { height: 1px; flex: 1; min-width: 20px; margin-top: 12px; background: var(--border-color); }

.small-cycle-list { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 3px; }
.small-cycle-list article { min-width: 170px; display: grid; grid-template-columns: 1fr auto; gap: 5px 10px; padding: 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 7px; }
.small-cycle-list article div { display: flex; flex-direction: column; gap: 3px; }
.small-cycle-list article strong { font-size: 11px; }
.small-cycle-list article span,
.small-cycle-list article p { margin: 0; color: var(--text-tertiary); font-size: 9px; }
.small-cycle-list article > b { grid-row: 1 / 3; grid-column: 2; align-self: center; color: var(--color-purple); font-size: 12px; }
.feedback-trend svg { width: 100%; height: 128px; margin-top: 8px; overflow: visible; }
.risk-threshold { stroke: rgba(248, 81, 73, .35); stroke-width: 1; stroke-dasharray: 6 5; }
.feedback-line { fill: none; stroke: #f0883e; stroke-width: 2; vector-effect: non-scaling-stroke; }
.diagnosis-empty { padding: 26px; color: var(--text-tertiary); text-align: center; font-size: 12px; }

.editor-mask { position: fixed; z-index: 1200; inset: 0; display: grid; place-items: center; padding: 18px; background: rgba(1, 4, 9, .72); }
.cycle-editor { width: min(780px, 96vw); max-height: 90vh; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 11px; box-shadow: 0 20px 60px rgba(0, 0, 0, .45); }
.cycle-editor header { padding: 16px 18px; border-bottom: 1px solid var(--border-color); }
.cycle-editor header div { display: flex; flex-direction: column; gap: 3px; }
.cycle-editor header strong { font-size: 15px; }
.cycle-editor header small { color: var(--text-tertiary); font-size: 9px; }
.cycle-editor header > button { color: var(--text-tertiary); background: none; border: 0; font-size: 22px; cursor: pointer; }
.editor-body { max-height: calc(90vh - 126px); overflow: auto; padding: 18px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid label { display: grid; gap: 6px; }
.form-grid label span { color: var(--text-secondary); font-size: 10px; }
.form-grid input,
.form-grid select,
.subcycle-row input { min-width: 0; padding: 9px 10px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; outline: 0; }
.form-grid input:focus,
.form-grid select:focus,
.subcycle-row input:focus { border-color: var(--color-blue); }
.subcycle-editor { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.subcycle-heading div { display: flex; flex-direction: column; gap: 3px; }
.subcycle-heading strong { font-size: 12px; }
.subcycle-heading small { color: var(--text-tertiary); font-size: 9px; }
.no-subcycle { margin-top: 12px; padding: 18px; color: var(--text-tertiary); background: var(--bg-primary); border: 1px dashed var(--border-color); border-radius: 6px; text-align: center; font-size: 10px; }
.subcycle-row { display: grid; grid-template-columns: 1fr 1fr 145px 145px 30px; gap: 7px; margin-top: 9px; }
.subcycle-row button { color: #f85149; background: rgba(248, 81, 73, .08); border: 1px solid rgba(248, 81, 73, .2); border-radius: 5px; cursor: pointer; }
.cycle-editor footer { justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--border-color); }
.cycle-editor footer button { padding: 7px 16px; border-radius: 6px; cursor: pointer; }
.cycle-editor footer .cancel { color: var(--text-secondary); background: transparent; border: 1px solid var(--border-color); }
.cycle-editor footer .save { color: #fff; background: var(--color-blue); border: 1px solid var(--color-blue); }

@media (max-width: 900px) {
  .diagnosis-grid { grid-template-columns: 1fr; }
  .stage-track { overflow-x: auto; padding-bottom: 5px; }
  .stage-line { min-width: 24px; }
  .subcycle-row { grid-template-columns: 1fr 1fr; }
  .subcycle-row button { min-height: 34px; }
}

@media (max-width: 560px) {
  .diagnosis-header { align-items: flex-start; }
  .form-grid { grid-template-columns: 1fr; }
  .risk-metrics { grid-template-columns: repeat(2, 1fr); }
  .risk-metrics article:nth-child(3) { grid-column: 1 / -1; }
}
</style>
