<template>
  <section class="cycle-ladder">
    <header class="cycle-ladder-header">
      <div>
        <strong>周期天梯图</strong>
        <small>与连板天梯图共用日期轴 · 大周期中可嵌套多个小周期</small>
      </div>
      <div class="cycle-actions">
        <span class="legend"><i class="big"></i>大周期</span>
        <span class="legend"><i class="small"></i>小周期</span>
        <span class="legend"><i class="risk"></i>负反馈</span>
        <button type="button" @click="openNewBig()">+ 大周期</button>
        <button type="button" :disabled="!cycleStore.cycles.length" @click="openNewSmall()">+ 小周期</button>
      </div>
    </header>

    <div v-if="emotions.length" class="cycle-matrix">
      <div class="cycle-labels">
        <div class="date-corner">周期 / 日期</div>
        <button type="button" class="risk-label" title="点击查看负反馈计算方式" @click="openRiskFormula()">
          <strong>负反馈</strong>
          <span>强度 / 加速度 · 查看公式</span>
        </button>
        <template v-if="timelineRows.length">
          <button
            v-for="row in timelineRows"
            :key="`label-${row.key}`"
            type="button"
            class="cycle-row-label"
            :class="row.type"
            :title="row.type === 'big' ? '点击编辑大周期' : '点击编辑小周期'"
            @click="editRow(row)"
          >
            <span>{{ row.type === 'big' ? '大' : '小' }}</span>
            <div>
              <strong>{{ row.name }}</strong>
              <small>{{ row.carrier || '未设置载体' }}</small>
            </div>
          </button>
        </template>
        <button v-else type="button" class="cycle-row-label empty" @click="openNewBig(emotions[0]?.date)">
          <span>+</span>
          <div><strong>添加第一个大周期</strong><small>点击后设置起止日期</small></div>
        </button>
      </div>

      <div ref="scrollRef" class="cycle-scroll" @scroll="emitScroll">
        <div class="cycle-grid" :style="gridStyle">
          <div class="cycle-date-row">
            <div
              v-for="emotion in emotions"
              :key="`cycle-date-${emotion.id}`"
              class="cycle-date-cell"
              :style="cellStyle"
            >{{ emotion.date.slice(5) }}</div>
          </div>

          <div class="risk-row">
            <button
              v-for="emotion in emotions"
              :key="`cycle-risk-${emotion.id}`"
              type="button"
              class="risk-cell"
              :style="cellStyle"
              :title="riskTitle(emotion.date)"
              @click="openRiskFormula(emotion.date)"
            >
              <b :style="{ color: riskColor(diagnosisByDate[emotion.date]?.feedbackScore || 0) }">
                {{ Math.round(diagnosisByDate[emotion.date]?.feedbackScore || 0) }}
              </b>
              <span :class="accelerationClass(diagnosisByDate[emotion.date]?.acceleration || 0)">
                {{ signed(diagnosisByDate[emotion.date]?.acceleration || 0) }}
              </span>
            </button>
          </div>

          <template v-if="timelineRows.length">
            <div v-for="row in timelineRows" :key="row.key" class="timeline-row" :class="row.type">
              <button
                v-for="emotion in emotions"
                :key="`${row.key}-${emotion.date}`"
                type="button"
                class="timeline-cell"
                :class="{
                  active: isDateInRow(emotion.date, row),
                  start: isFirstVisibleDate(emotion.date, row),
                  end: isLastVisibleDate(emotion.date, row)
                }"
                :style="[
                  cellStyle,
                  isDateInRow(emotion.date, row) ? { '--cycle-color': row.color } : undefined
                ]"
                :title="rowTitle(row, emotion.date)"
                @click="isDateInRow(emotion.date, row) ? openTrendEditor(row, emotion.date) : undefined"
              >
                <span v-if="isFirstVisibleDate(emotion.date, row)" class="period-name">
                  {{ row.name }}
                  <small v-if="row.type === 'big'">{{ stageLabel(row.stage) }}</small>
                </span>
                <span v-if="getDailyTrend(row, emotion.date)?.status" class="daily-trend-status">
                  {{ getDailyTrend(row, emotion.date)?.status }}
                </span>
                <i v-if="getDailyTrend(row, emotion.date)?.note" class="daily-trend-note" title="已填写走势备注"></i>
              </button>
            </div>
          </template>
          <div v-else class="timeline-row empty-row">
            <button
              v-for="emotion in emotions"
              :key="`empty-cycle-${emotion.id}`"
              type="button"
              class="timeline-cell empty-cell"
              :style="cellStyle"
              title="从该日期开始建立大周期"
              @click="openNewBig(emotion.date)"
            >+</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="cycle-empty">暂无交易日数据</div>

    <div v-if="editor" class="cycle-editor-mask" @click.self="closeEditor">
      <div class="cycle-editor-card">
        <header>
          <div>
            <strong>{{ editor.kind === 'big' ? (editor.id ? '编辑大周期' : '新增大周期') : (editor.id ? '编辑小周期' : '新增小周期') }}</strong>
            <small>日期会按交易日列直接显示在周期天梯图中</small>
          </div>
          <button type="button" @click="closeEditor">×</button>
        </header>

        <div class="cycle-editor-body">
          <label v-if="editor.kind === 'small'" class="wide-field">
            <span>所属大周期</span>
            <select v-model="editor.parentId">
              <option v-for="cycle in cycleStore.sortedCycles" :key="cycle.id" :value="cycle.id">{{ cycle.name }}</option>
            </select>
          </label>
          <label>
            <span>周期名称</span>
            <input v-model="editor.name" :placeholder="editor.kind === 'big' ? '例如：哈药—九阳周期' : '例如：青岛小周期'" />
          </label>
          <label>
            <span>周期载体</span>
            <input v-model="editor.carrier" placeholder="多个载体可用顿号分隔" />
          </label>
          <label>
            <span>开始日期</span>
            <input v-model="editor.startDate" type="date" />
          </label>
          <label>
            <span>结束日期</span>
            <input v-model="editor.endDate" type="date" />
            <small class="field-tip">留空代表仍在运行</small>
          </label>
          <label v-if="editor.kind === 'big'" class="wide-field">
            <span>当前阶段</span>
            <select v-model="editor.stage">
              <option value="">跟随系统建议</option>
              <option v-for="stage in stages" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
            </select>
          </label>
        </div>

        <footer>
          <button v-if="editor.id" type="button" class="delete" @click="deleteCurrent">删除</button>
          <button type="button" class="cancel" @click="closeEditor">取消</button>
          <button type="button" class="save" @click="saveCurrent">保存</button>
        </footer>
      </div>
    </div>

    <div v-if="riskDialog" class="cycle-editor-mask" @click.self="riskDialog = null">
      <div class="cycle-editor-card risk-explain-card">
        <header>
          <div>
            <strong>负反馈计算方式</strong>
            <small>{{ riskDialog.date ? `${riskDialog.date} · 当日计算明细` : '基于近60个交易日历史分位动态计算' }}</small>
          </div>
          <button type="button" @click="riskDialog = null">×</button>
        </header>
        <div class="risk-explain-body">
          <div class="formula-box">
            负反馈强度 = 炸板压力 × 25% + 跌停压力 × 20% + 封板弱化 × 15% + 晋级弱化 × 20% + 梯队衰减 × 20%
          </div>
          <div class="formula-box secondary">
            负反馈加速度 = 今日负反馈强度 − 前3日负反馈强度均值
          </div>
          <div class="risk-factor-table">
            <div class="risk-factor-head"><span>计算项目</span><span>权重</span><span>{{ riskDialog.date ? '当日分位分' : '含义' }}</span></div>
            <div v-for="factor in riskFactors" :key="factor.key" class="risk-factor-row">
              <span>{{ factor.label }}</span>
              <b>{{ factor.weight }}%</b>
              <strong v-if="riskDialog.date" :style="{ color: riskColor(factor.score) }">{{ Math.round(factor.score) }}</strong>
              <small v-else>{{ factor.description }}</small>
            </div>
          </div>
          <div v-if="riskDialog.date && selectedRiskPoint" class="risk-result">
            <div><span>基础加权分</span><strong>{{ selectedRiskBaseScore }}</strong></div>
            <div><span>事件加分</span><strong>+{{ selectedRiskBonus }}</strong></div>
            <div><span>最终强度</span><strong :style="{ color: riskColor(selectedRiskPoint.feedbackScore) }">{{ selectedRiskPoint.feedbackScore }}</strong></div>
            <div><span>加速度</span><strong :class="accelerationClass(selectedRiskPoint.acceleration)">{{ signed(selectedRiskPoint.acceleration) }}</strong></div>
          </div>
          <p class="risk-event-help">中位出清加6分，龙头断板加8分，最终分数限制在0～100。该指标用于复盘辅助，不直接构成买卖信号。</p>
        </div>
        <footer><button type="button" class="save" @click="riskDialog = null">知道了</button></footer>
      </div>
    </div>

    <div v-if="trendEditor" class="cycle-editor-mask" @click.self="trendEditor = null">
      <div class="cycle-editor-card trend-editor-card">
        <header>
          <div>
            <strong>{{ trendEditor.name }} · {{ trendEditor.date }}</strong>
            <small>记录该周期在当天的走势情况</small>
          </div>
          <button type="button" @click="trendEditor = null">×</button>
        </header>
        <div class="trend-editor-body">
          <span class="trend-field-label">快速选择</span>
          <div class="trend-presets">
            <button
              v-for="preset in trendPresets"
              :key="preset"
              type="button"
              :class="{ active: trendEditor.status === preset }"
              @click="trendEditor.status = preset"
            >{{ preset }}</button>
          </div>
          <label>
            <span>走势情况</span>
            <input v-model="trendEditor.status" maxlength="20" placeholder="例如：加速、分歧转一致、弱修复" />
          </label>
          <label>
            <span>走势备注</span>
            <textarea v-model="trendEditor.note" rows="4" placeholder="记录载体表现、承接、梯队变化和次日观察点"></textarea>
          </label>
        </div>
        <footer>
          <button type="button" class="delete" @click="clearTrend">清空当天</button>
          <button type="button" class="cancel" @click="trendEditor = null">取消</button>
          <button type="button" class="save" @click="saveTrend">保存走势</button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { EmotionDaily, MarketCycleDailyTrend, MarketCycleRecord, MarketCycleStage, MarketSubCycle } from '@/types'
import { buildCycleDiagnosis, marketCycleStageLabel } from '@/composables/useCycleDiagnosis'
import { useMarketCycleStore } from '@/stores/marketCycle'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  emotions: EmotionDaily[]
  allEmotions: EmotionDaily[]
  cellWidth: number
}>()

const emit = defineEmits<{ scroll: [left: number] }>()
const cycleStore = useMarketCycleStore()
const toast = useToast()
const scrollRef = ref<HTMLElement | null>(null)

const stages: Array<{ key: MarketCycleStage; label: string }> = [
  { key: 'start', label: '启动' },
  { key: 'main', label: '主升' },
  { key: 'expansion', label: '扩散' },
  { key: 'highDivergence', label: '高位分歧' },
  { key: 'retreat', label: '退潮' },
  { key: 'iceRepair', label: '冰点修复' }
]

const colors = ['#58a6ff', '#a371f7', '#d29922', '#3fb950', '#f0883e', '#bc8cff']
const diagnosis = computed(() => buildCycleDiagnosis(props.allEmotions))
const diagnosisByDate = computed(() => Object.fromEntries(diagnosis.value.map(point => [point.date, point])))
const firstDate = computed(() => props.emotions[0]?.date || '')
const lastDate = computed(() => props.emotions[props.emotions.length - 1]?.date || '')
const gridStyle = computed<CSSProperties>(() => ({ width: `${props.emotions.length * props.cellWidth}px` }))
const cellStyle = computed<CSSProperties>(() => ({ width: `${props.cellWidth}px` }))

type TimelineRow = {
  key: string
  type: 'big' | 'small'
  cycleId: string
  subCycleId?: string
  name: string
  carrier: string
  startDate: string
  endDate?: string
  stage?: MarketCycleStage
  dailyTrends?: Record<string, MarketCycleDailyTrend>
  color: string
}

const visibleCycles = computed(() => cycleStore.sortedCycles
  .filter(cycle => rangesOverlap(cycle.startDate, cycle.endDate, firstDate.value, lastDate.value))
  .sort((a, b) => a.startDate.localeCompare(b.startDate)))

const timelineRows = computed<TimelineRow[]>(() => {
  const rows: TimelineRow[] = []
  visibleCycles.value.forEach((cycle, index) => {
    const color = colors[index % colors.length]
    rows.push({
      key: `big-${cycle.id}`,
      type: 'big',
      cycleId: cycle.id,
      name: cycle.name,
      carrier: cycle.carriers.join('、'),
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      stage: cycle.confirmedStage || suggestedStageForCycle(cycle),
      dailyTrends: cycle.dailyTrends,
      color
    })
    cycle.smallCycles
      .filter(item => rangesOverlap(item.startDate, item.endDate, firstDate.value, lastDate.value))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .forEach(item => rows.push({
        key: `small-${cycle.id}-${item.id}`,
        type: 'small',
        cycleId: cycle.id,
        subCycleId: item.id,
        name: item.name,
        carrier: item.carrier,
        startDate: item.startDate,
        endDate: item.endDate,
        dailyTrends: item.dailyTrends,
        color
      }))
  })
  return rows
})

const editor = ref<null | {
  kind: 'big' | 'small'
  id: string
  parentId: string
  name: string
  carrier: string
  startDate: string
  endDate: string
  stage: '' | MarketCycleStage
}>(null)

const riskDialog = ref<null | { date?: string }>(null)
const trendPresets = ['启动', '主升', '加速', '分歧', '弱修复', '强修复', '震荡', '退潮']
const trendEditor = ref<null | {
  cycleId: string
  subCycleId?: string
  name: string
  date: string
  status: string
  note: string
}>(null)

const selectedRiskPoint = computed(() => riskDialog.value?.date ? diagnosisByDate.value[riskDialog.value.date] : null)
const selectedRiskEmotion = computed(() => riskDialog.value?.date
  ? props.allEmotions.find(item => item.date === riskDialog.value?.date)
  : undefined)
const selectedRiskBonus = computed(() => {
  const emotion = selectedRiskEmotion.value
  if (!emotion) return 0
  const tags = new Set(emotion.stairDateTags || [])
  return (emotion.isClear || tags.has('isClear') ? 6 : 0) + (emotion.isLeaderBreak || tags.has('isLeaderBreak') ? 8 : 0)
})
const selectedRiskBaseScore = computed(() => {
  const point = selectedRiskPoint.value
  if (!point) return 0
  return Math.round(point.components.reduce((sum, item) => sum + item.score * item.weight / 100, 0) * 10) / 10
})
const riskFactors = computed(() => {
  const descriptions: Record<string, string> = {
    broken: '炸板率越高，承接稳定性越弱',
    limitDown: '跌停家数越多，亏钱效应越强',
    seal: '封板率越低，资金一致性越弱',
    promotion: '连板晋级率越低，接力意愿越弱',
    relay: '一进二和二进三越弱，梯队衰减越明显'
  }
  const components = selectedRiskPoint.value?.components || [
    { key: 'broken', label: '炸板压力', score: 0, weight: 25 },
    { key: 'limitDown', label: '跌停压力', score: 0, weight: 20 },
    { key: 'seal', label: '封板弱化', score: 0, weight: 15 },
    { key: 'promotion', label: '晋级弱化', score: 0, weight: 20 },
    { key: 'relay', label: '梯队衰减', score: 0, weight: 20 }
  ]
  return components.map(item => ({ ...item, description: descriptions[item.key] || '' }))
})

function rangesOverlap(start: string, end: string | undefined, visibleStart: string, visibleEnd: string) {
  if (!visibleStart || !visibleEnd) return true
  return start <= visibleEnd && (!end || end >= visibleStart)
}

function suggestedStageForCycle(cycle: MarketCycleRecord) {
  const end = cycle.endDate || lastDate.value
  const point = [...diagnosis.value].reverse().find(item => item.date >= cycle.startDate && item.date <= end)
  return point?.suggestedStage || 'start'
}

function isDateInRow(date: string, row: TimelineRow) {
  return date >= row.startDate && (!row.endDate || date <= row.endDate)
}

function activeDates(row: TimelineRow) {
  return props.emotions.filter(item => isDateInRow(item.date, row)).map(item => item.date)
}

function isFirstVisibleDate(date: string, row: TimelineRow) {
  return activeDates(row)[0] === date
}

function isLastVisibleDate(date: string, row: TimelineRow) {
  const dates = activeDates(row)
  return dates[dates.length - 1] === date
}

function editRow(row: TimelineRow) {
  if (row.type === 'big') {
    const cycle = cycleStore.cycles.find(item => item.id === row.cycleId)
    if (cycle) openEditBig(cycle)
    return
  }
  const parent = cycleStore.cycles.find(item => item.id === row.cycleId)
  const small = parent?.smallCycles.find(item => item.id === row.subCycleId)
  if (parent && small) openEditSmall(parent, small)
}

function getDailyTrend(row: TimelineRow, date: string) {
  return row.dailyTrends?.[date]
}

function openTrendEditor(row: TimelineRow, date: string) {
  const current = getDailyTrend(row, date)
  trendEditor.value = {
    cycleId: row.cycleId,
    subCycleId: row.subCycleId,
    name: row.name,
    date,
    status: current?.status || '',
    note: current?.note || ''
  }
}

function saveTrend() {
  const value = trendEditor.value
  if (!value) return
  cycleStore.saveDailyTrend(value.cycleId, value.subCycleId, value.date, { status: value.status, note: value.note })
  toast.success('当日走势已保存')
  trendEditor.value = null
}

function clearTrend() {
  const value = trendEditor.value
  if (!value) return
  cycleStore.saveDailyTrend(value.cycleId, value.subCycleId, value.date, { status: '', note: '' })
  toast.success('当日走势已清空')
  trendEditor.value = null
}

function openRiskFormula(date?: string) {
  riskDialog.value = { date }
}

function openNewBig(startDate = lastDate.value) {
  editor.value = { kind: 'big', id: '', parentId: '', name: '', carrier: '', startDate, endDate: '', stage: '' }
}

function openEditBig(cycle: MarketCycleRecord) {
  editor.value = {
    kind: 'big', id: cycle.id, parentId: '', name: cycle.name, carrier: cycle.carriers.join('、'),
    startDate: cycle.startDate, endDate: cycle.endDate || '', stage: cycle.confirmedStage || ''
  }
}

function openNewSmall(startDate = lastDate.value) {
  const parent = cycleStore.activeCycle || cycleStore.sortedCycles[0]
  if (!parent) return
  editor.value = { kind: 'small', id: '', parentId: parent.id, name: '', carrier: '', startDate, endDate: '', stage: '' }
}

function openEditSmall(parent: MarketCycleRecord, small: MarketSubCycle) {
  editor.value = {
    kind: 'small', id: small.id, parentId: parent.id, name: small.name, carrier: small.carrier,
    startDate: small.startDate, endDate: small.endDate || '', stage: ''
  }
}

function closeEditor() {
  editor.value = null
}

function saveCurrent() {
  const value = editor.value
  if (!value) return
  if (!value.name.trim() || !value.startDate) {
    toast.error('请填写周期名称和开始日期')
    return
  }
  if (value.endDate && value.endDate < value.startDate) {
    toast.error('结束日期不能早于开始日期')
    return
  }
  if (value.kind === 'big') {
    const existing = cycleStore.cycles.find(item => item.id === value.id)
    cycleStore.saveCycle({
      id: value.id || undefined,
      name: value.name.trim(),
      carriers: value.carrier.split(/[、,，]/).map(item => item.trim()).filter(Boolean),
      startDate: value.startDate,
      endDate: value.endDate || undefined,
      confirmedStage: value.stage || undefined,
      dailyTrends: existing?.dailyTrends,
      smallCycles: existing?.smallCycles || []
    })
  } else {
    cycleStore.saveSubCycle(value.parentId, {
      id: value.id || undefined,
      name: value.name.trim(),
      carrier: value.carrier.trim(),
      startDate: value.startDate,
      endDate: value.endDate || undefined
    })
  }
  toast.success('周期天梯图已保存')
  closeEditor()
}

function deleteCurrent() {
  const value = editor.value
  if (!value || !window.confirm(`确定删除「${value.name}」吗？`)) return
  if (value.kind === 'big') cycleStore.deleteCycle(value.id)
  else cycleStore.deleteSubCycle(value.parentId, value.id)
  toast.success('周期记录已删除')
  closeEditor()
}

function emitScroll() {
  if (scrollRef.value) emit('scroll', scrollRef.value.scrollLeft)
}

function setScrollLeft(left: number) {
  if (scrollRef.value && Math.abs(scrollRef.value.scrollLeft - left) > 0.5) scrollRef.value.scrollLeft = left
}

defineExpose({ setScrollLeft })

function stageLabel(stage?: MarketCycleStage) {
  return stage ? marketCycleStageLabel(stage) : ''
}

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function riskColor(score: number) {
  if (score >= 72) return '#f85149'
  if (score >= 58) return '#f0883e'
  if (score >= 42) return '#d29922'
  return '#3fb950'
}

function accelerationClass(value: number) {
  return { danger: value >= 8, warning: value > 0 && value < 8, safe: value < 0 }
}

function riskTitle(date: string) {
  const point = diagnosisByDate.value[date]
  if (!point) return `${date} · 暂无诊断`
  return `${date}\n负反馈 ${point.feedbackScore}\n加速度 ${signed(point.acceleration)}\n建议阶段：${marketCycleStageLabel(point.suggestedStage)}\n${point.reasons.join('\n')}`
}

function rowTitle(row: TimelineRow, date: string) {
  if (!isDateInRow(date, row)) return `${date} · 不在${row.name}周期内`
  return `${row.name}\n载体：${row.carrier || '未设置'}\n${row.startDate} → ${row.endDate || '进行中'}${row.stage ? `\n阶段：${stageLabel(row.stage)}` : ''}\n点击编辑`
}
</script>

<style scoped>
.cycle-ladder { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.cycle-ladder-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
.cycle-ladder-header > div:first-child { display: flex; align-items: baseline; gap: 8px; }
.cycle-ladder-header strong { color: var(--text-primary); font-size: 13px; }
.cycle-ladder-header small { color: var(--text-tertiary); font-size: 9px; }
.cycle-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.cycle-actions button { padding: 5px 10px; color: var(--color-blue); background: rgba(88, 166, 255, .08); border: 1px solid rgba(88, 166, 255, .3); border-radius: 5px; cursor: pointer; font-size: 10px; }
.cycle-actions button:disabled { opacity: .35; cursor: not-allowed; }
.legend { display: inline-flex; align-items: center; gap: 4px; color: var(--text-tertiary); font-size: 9px; }
.legend i { width: 10px; height: 4px; border-radius: 2px; }
.legend i.big { background: #58a6ff; } .legend i.small { background: rgba(88, 166, 255, .55); } .legend i.risk { background: #f0883e; }

.cycle-matrix { display: flex; min-width: 0; border: 1px solid var(--border-color); border-radius: 7px; overflow: hidden; }
.cycle-labels { width: 154px; flex: 0 0 154px; background: var(--bg-secondary); border-right: 1px solid var(--border-color); }
.date-corner { height: 38px; display: flex; align-items: center; padding: 0 11px; color: var(--text-tertiary); background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); font-size: 9px; font-weight: 600; }
.risk-label { width: 100%; height: 42px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px; padding: 0 11px; color: inherit; background: transparent; border: 0; border-bottom: 1px solid var(--border-color); text-align: left; cursor: pointer; }
.risk-label:hover { background: rgba(240, 136, 62, .06); }
.risk-label strong { color: #f0883e; font-size: 10px; }
.risk-label span { color: var(--text-tertiary); font-size: 8px; }
.cycle-row-label { width: 100%; height: 46px; display: flex; align-items: center; gap: 7px; padding: 0 8px; color: var(--text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--border-color); text-align: left; cursor: pointer; }
.cycle-row-label.small { height: 38px; padding-left: 20px; background: rgba(110, 118, 129, .035); }
.cycle-row-label > span { width: 21px; height: 21px; flex: 0 0 21px; display: grid; place-items: center; color: var(--color-blue); background: rgba(88, 166, 255, .1); border: 1px solid rgba(88, 166, 255, .24); border-radius: 5px; font-size: 9px; font-weight: 700; }
.cycle-row-label.small > span { color: var(--text-secondary); background: var(--bg-tertiary); border-color: var(--border-color); }
.cycle-row-label > div { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cycle-row-label strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.cycle-row-label small { overflow: hidden; color: var(--text-tertiary); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.cycle-row-label:hover { background: rgba(88, 166, 255, .06); }
.cycle-row-label.empty { height: 46px; }

.cycle-scroll { min-width: 0; flex: 1; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; scrollbar-color: rgba(88, 166, 255, .45) var(--bg-tertiary); }
.cycle-grid { min-width: 100%; }
.cycle-date-row, .risk-row, .timeline-row { display: flex; }
.cycle-date-cell { height: 38px; flex: 0 0 auto; display: grid; place-items: center; color: var(--text-secondary); background: var(--bg-tertiary); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); font-size: 9px; font-weight: 600; }
.risk-cell { height: 42px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; gap: 4px; color: inherit; background: var(--bg-primary); border: 0; border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); cursor: pointer; }
.risk-cell:hover { background: rgba(240, 136, 62, .07); }
.risk-cell b { font-size: 11px; }
.risk-cell span { font-size: 8px; }
.risk-cell span.danger { color: #f85149; } .risk-cell span.warning { color: #f0883e; } .risk-cell span.safe { color: #3fb950; }
.timeline-row { height: 46px; background: var(--bg-primary); }
.timeline-row.small { height: 38px; background: rgba(110, 118, 129, .025); }
.timeline-cell { position: relative; height: 100%; flex: 0 0 auto; overflow: visible; color: var(--text-primary); background: transparent; border: 0; border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); cursor: default; }
.timeline-cell.active { background: color-mix(in srgb, var(--cycle-color) 15%, transparent); border-top: 3px solid var(--cycle-color); cursor: pointer; }
.timeline-row.small .timeline-cell.active { background: color-mix(in srgb, var(--cycle-color) 8%, transparent); border-top-width: 2px; }
.timeline-cell.active.start::before, .timeline-cell.active.end::after { content: ''; position: absolute; top: -3px; bottom: 0; width: 3px; background: var(--cycle-color); }
.timeline-cell.active.start::before { left: 0; } .timeline-cell.active.end::after { right: 0; }
.timeline-row.small .timeline-cell.active.start::before, .timeline-row.small .timeline-cell.active.end::after { top: -2px; width: 2px; opacity: .75; }
.period-name { position: absolute; z-index: 2; left: 8px; top: 9px; display: inline-flex; align-items: center; gap: 6px; color: var(--text-primary); font-size: 10px; font-weight: 700; white-space: nowrap; pointer-events: none; }
.timeline-row.small .period-name { top: 8px; font-size: 9px; font-weight: 600; }
.period-name small { padding: 2px 5px; color: var(--cycle-color); background: var(--bg-secondary); border: 1px solid color-mix(in srgb, var(--cycle-color) 45%, transparent); border-radius: 8px; font-size: 7px; }
.daily-trend-status { position: absolute; z-index: 3; left: 7px; right: 7px; bottom: 4px; overflow: hidden; color: var(--cycle-color); font-size: 8px; font-weight: 600; text-align: left; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; }
.timeline-row.small .daily-trend-status { bottom: 3px; }
.daily-trend-note { position: absolute; z-index: 4; right: 5px; bottom: 5px; width: 4px; height: 4px; background: var(--color-gold); border-radius: 50%; pointer-events: none; }
.empty-cell { color: var(--text-tertiary); cursor: pointer; }
.empty-cell:hover { color: var(--color-blue); background: rgba(88, 166, 255, .07); }
.cycle-empty { padding: 20px; color: var(--text-tertiary); text-align: center; font-size: 10px; }

.cycle-editor-mask { position: fixed; z-index: 1300; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(1, 4, 9, .72); }
.cycle-editor-card { width: min(560px, 96vw); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; box-shadow: 0 18px 60px rgba(0, 0, 0, .45); }
.cycle-editor-card header { display: flex; align-items: center; justify-content: space-between; padding: 15px 17px; border-bottom: 1px solid var(--border-color); }
.cycle-editor-card header div { display: flex; flex-direction: column; gap: 3px; }
.cycle-editor-card header strong { font-size: 14px; }
.cycle-editor-card header small { color: var(--text-tertiary); font-size: 9px; }
.cycle-editor-card header button { color: var(--text-tertiary); background: none; border: 0; font-size: 21px; cursor: pointer; }
.cycle-editor-body { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; padding: 17px; }
.cycle-editor-body label { display: grid; align-content: start; gap: 6px; }
.cycle-editor-body label > span { color: var(--text-secondary); font-size: 10px; }
.cycle-editor-body input, .cycle-editor-body select { min-width: 0; width: 100%; padding: 8px 10px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 5px; outline: 0; }
.cycle-editor-body input:focus, .cycle-editor-body select:focus { border-color: var(--color-blue); }
.cycle-editor-body .wide-field { grid-column: 1 / -1; }
.field-tip { color: var(--text-tertiary); font-size: 8px; }
.cycle-editor-card footer { display: flex; justify-content: flex-end; gap: 8px; padding: 11px 17px; border-top: 1px solid var(--border-color); }
.cycle-editor-card footer button { padding: 6px 15px; border-radius: 5px; cursor: pointer; }
.cycle-editor-card footer .delete { margin-right: auto; color: #f85149; background: rgba(248, 81, 73, .08); border: 1px solid rgba(248, 81, 73, .25); }
.cycle-editor-card footer .cancel { color: var(--text-secondary); background: transparent; border: 1px solid var(--border-color); }
.cycle-editor-card footer .save { color: #fff; background: var(--color-blue); border: 1px solid var(--color-blue); }

.risk-explain-card { width: min(660px, 96vw); }
.risk-explain-body { display: grid; gap: 10px; padding: 17px; }
.formula-box { padding: 10px 12px; color: var(--text-primary); background: rgba(88, 166, 255, .07); border: 1px solid rgba(88, 166, 255, .2); border-radius: 6px; font-size: 10px; line-height: 1.6; }
.formula-box.secondary { color: var(--text-secondary); background: var(--bg-primary); border-color: var(--border-color); }
.risk-factor-table { overflow: hidden; border: 1px solid var(--border-color); border-radius: 6px; }
.risk-factor-head, .risk-factor-row { display: grid; grid-template-columns: 1fr 70px 1.5fr; align-items: center; min-height: 34px; }
.risk-factor-head { color: var(--text-tertiary); background: var(--bg-tertiary); font-size: 9px; }
.risk-factor-row { border-top: 1px solid var(--border-color); font-size: 10px; }
.risk-factor-head > *, .risk-factor-row > * { padding: 0 10px; }
.risk-factor-row b { color: var(--color-blue); font-size: 10px; }
.risk-factor-row strong { font-size: 12px; }
.risk-factor-row small { color: var(--text-secondary); line-height: 1.4; }
.risk-result { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.risk-result div { padding: 9px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; }
.risk-result span { display: block; margin-bottom: 5px; color: var(--text-tertiary); font-size: 8px; }
.risk-result strong { font-size: 15px; }
.risk-event-help { margin: 0; color: var(--text-tertiary); font-size: 9px; line-height: 1.6; }

.trend-editor-card { width: min(520px, 96vw); }
.trend-editor-body { display: grid; gap: 13px; padding: 17px; }
.trend-field-label, .trend-editor-body label > span { color: var(--text-secondary); font-size: 10px; }
.trend-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.trend-presets button { padding: 5px 9px; color: var(--text-secondary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 5px; cursor: pointer; font-size: 9px; }
.trend-presets button:hover, .trend-presets button.active { color: var(--color-blue); background: rgba(88, 166, 255, .09); border-color: rgba(88, 166, 255, .45); }
.trend-editor-body label { display: grid; gap: 6px; }
.trend-editor-body input, .trend-editor-body textarea { width: 100%; padding: 9px 10px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 5px; outline: 0; resize: vertical; font-family: inherit; }
.trend-editor-body input:focus, .trend-editor-body textarea:focus { border-color: var(--color-blue); }

@media (max-width: 700px) {
  .cycle-ladder-header { align-items: flex-start; flex-direction: column; }
  .cycle-actions { justify-content: flex-start; }
  .cycle-labels { width: 130px; flex-basis: 130px; }
  .cycle-editor-body { grid-template-columns: 1fr; }
  .cycle-editor-body .wide-field { grid-column: auto; }
  .risk-result { grid-template-columns: repeat(2, 1fr); }
}
</style>
