<template>
  <div class="cluster-page">
    <header class="page-heading">
      <div>
        <div class="eyebrow">EMOTION CLUSTER TRACKER</div>
        <h1>情绪抱团</h1>
        <p>集中保存市场抱团核心，逐日记录走势、涨跌幅和盘面备注；数据与天梯图同步。</p>
      </div>
      <router-link to="/" class="dashboard-link">返回看板</router-link>
    </header>

    <section class="summary-strip">
      <div><span>抱团标的</span><strong>{{ store.targets.length }}</strong><small>个</small></div>
      <div><span>累计记录</span><strong>{{ store.totalEntries }}</strong><small>条</small></div>
      <div><span>记录天数</span><strong>{{ store.recordDates.length }}</strong><small>天</small></div>
      <div :class="todayAverageClass"><span>当日平均涨跌</span><strong>{{ todayAverageText }}</strong></div>
    </section>

    <section class="panel add-panel">
      <div class="panel-heading">
        <div>
          <h2>添加抱团标的</h2>
          <p>标的只需添加一次，之后可在不同日期持续记录。</p>
        </div>
      </div>
      <form class="target-form" @submit.prevent="addTarget">
        <label><span>标的名称 *</span><input v-model.trim="targetForm.name" maxlength="30" placeholder="例如：核心科技" /></label>
        <label><span>代码</span><input v-model.trim="targetForm.code" maxlength="12" placeholder="可选" /></label>
        <label><span>所属题材</span><input v-model.trim="targetForm.theme" maxlength="30" placeholder="可选" /></label>
        <label class="note-field"><span>标的备注</span><input v-model.trim="targetForm.note" maxlength="80" placeholder="抱团逻辑、市场地位等" /></label>
        <button class="primary-button" type="submit">添加并保存</button>
      </form>
    </section>

    <section class="panel records-panel">
      <div class="panel-heading record-heading">
        <div>
          <h2>每日表现记录</h2>
          <p>保存后会立即同步到看板天梯图下方的抱团标的矩阵。</p>
        </div>
        <div class="date-picker">
          <button type="button" title="前一天" @click="shiftDate(-1)">‹</button>
          <input v-model="selectedDate" type="date" />
          <button type="button" title="后一天" @click="shiftDate(1)">›</button>
          <button type="button" class="today-button" @click="selectedDate = today()">今天</button>
        </div>
      </div>

      <div v-if="store.targets.length" class="record-list">
        <article v-for="target in store.targets" :key="target.id" class="record-card">
          <div class="target-info">
            <div class="target-title">
              <strong>{{ target.name }}</strong>
              <span v-if="target.code">{{ target.code }}</span>
            </div>
            <div v-if="target.theme" class="theme-chip">{{ target.theme }}</div>
            <p>{{ target.note || '暂无标的备注' }}</p>
            <div class="target-actions">
              <button type="button" @click="openTargetEdit(target)">编辑标的</button>
              <button type="button" class="danger-text" @click="deleteTarget(target)">删除</button>
            </div>
          </div>

          <div v-if="entryDrafts[target.id]" class="daily-fields">
            <label>
              <span>当日走势</span>
              <input v-model.trim="entryDrafts[target.id].trend" maxlength="40" placeholder="高开回落、弱转强、横盘等" />
            </label>
            <label>
              <span>涨跌幅（%）</span>
              <input v-model="entryDrafts[target.id].changePercent" type="number" step="0.01" placeholder="0.00" />
            </label>
            <label class="daily-note">
              <span>盘面备注</span>
              <input v-model.trim="entryDrafts[target.id].note" maxlength="100" placeholder="量价、承接、带动性等" />
            </label>
            <div class="daily-actions">
              <button v-if="target.entries[selectedDate]" type="button" class="clear-button" @click="clearEntry(target)">清空当天</button>
              <button type="button" class="save-entry-button" @click="saveEntry(target)">保存记录</button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <b>还没有抱团标的</b>
        <span>先在上方添加市场最具辨识度、最能代表抱团情绪的核心标的。</span>
      </div>
    </section>

    <section class="panel history-panel">
      <div class="panel-heading">
        <div>
          <h2>历史记录</h2>
          <p>按日期倒序展示已保存的抱团表现。</p>
        </div>
        <span class="history-count">最近 {{ historyRows.length }} 条</span>
      </div>
      <div v-if="historyRows.length" class="history-table-wrap">
        <table class="history-table">
          <thead><tr><th>日期</th><th>标的</th><th>题材</th><th>走势</th><th>涨跌幅</th><th>备注</th></tr></thead>
          <tbody>
            <tr v-for="row in historyRows" :key="`${row.targetId}-${row.date}`">
              <td>{{ row.date }}</td>
              <td><strong>{{ row.name }}</strong><small v-if="row.code">{{ row.code }}</small></td>
              <td>{{ row.theme || '—' }}</td>
              <td>{{ row.trend || '—' }}</td>
              <td :class="changeClass(row.changePercent)">{{ formatPercent(row.changePercent) }}</td>
              <td>{{ row.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="history-empty">暂无历史记录</div>
    </section>

    <div v-if="editingTarget" class="modal" @click.self="editingTarget = null">
      <div class="dialog">
        <div class="dialog-header"><strong>编辑抱团标的</strong><button @click="editingTarget = null">×</button></div>
        <div class="dialog-body">
          <label><span>标的名称 *</span><input v-model.trim="editTargetForm.name" maxlength="30" /></label>
          <label><span>代码</span><input v-model.trim="editTargetForm.code" maxlength="12" /></label>
          <label><span>所属题材</span><input v-model.trim="editTargetForm.theme" maxlength="30" /></label>
          <label><span>标的备注</span><textarea v-model.trim="editTargetForm.note" rows="3" maxlength="100"></textarea></label>
        </div>
        <div class="dialog-footer"><button @click="editingTarget = null">取消</button><button class="primary-button" @click="saveTargetEdit">保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { EmotionClusterTarget } from '@/types'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import { useEmotionClusterStore } from '@/stores/emotionCluster'

interface EntryDraft {
  trend: string
  changePercent: string | number
  note: string
}

const store = useEmotionClusterStore()
const toast = useToast()
const selectedDate = ref(today())
const targetForm = reactive({ name: '', code: '', theme: '', note: '' })
const entryDrafts = reactive<Record<string, EntryDraft>>({})
const editingTarget = ref<EmotionClusterTarget | null>(null)
const editTargetForm = reactive({ name: '', code: '', theme: '', note: '' })

function rebuildDrafts() {
  const validIds = new Set(store.targets.map(target => target.id))
  Object.keys(entryDrafts).forEach(id => { if (!validIds.has(id)) delete entryDrafts[id] })
  store.targets.forEach(target => {
    const entry = target.entries[selectedDate.value]
    entryDrafts[target.id] = {
      trend: entry?.trend || '',
      changePercent: entry?.changePercent === null || entry?.changePercent === undefined ? '' : String(entry.changePercent),
      note: entry?.note || ''
    }
  })
}

watch([selectedDate, () => store.targets], rebuildDrafts, { immediate: true, deep: true })

function addTarget() {
  if (!targetForm.name.trim()) {
    toast.error('请输入抱团标的名称')
    return
  }
  if (store.targets.some(target => target.name === targetForm.name.trim())) {
    toast.error('该抱团标的已经存在')
    return
  }
  const target = store.addTarget({ ...targetForm })
  if (!target) return
  Object.assign(targetForm, { name: '', code: '', theme: '', note: '' })
  toast.success('抱团标的已添加并保存')
}

function saveEntry(target: EmotionClusterTarget) {
  const draft = entryDrafts[target.id]
  if (!draft) return
  const raw = String(draft.changePercent ?? '').trim()
  const changePercent = raw === '' ? null : Number(raw)
  if (changePercent !== null && !Number.isFinite(changePercent)) {
    toast.error('请输入正确的涨跌幅')
    return
  }
  if (!draft.trend && changePercent === null && !draft.note) {
    toast.error('请至少填写走势、涨跌幅或备注中的一项')
    return
  }
  store.saveEntry(target.id, selectedDate.value, { trend: draft.trend, changePercent, note: draft.note })
  toast.success(`${target.name} ${selectedDate.value} 的记录已保存`)
}

function clearEntry(target: EmotionClusterTarget) {
  if (!window.confirm(`确定清空“${target.name}”在 ${selectedDate.value} 的记录吗？`)) return
  store.clearEntry(target.id, selectedDate.value)
  rebuildDrafts()
  toast.success('当日记录已清空')
}

function deleteTarget(target: EmotionClusterTarget) {
  if (!window.confirm(`确定删除“${target.name}”及其全部历史记录吗？`)) return
  store.deleteTarget(target.id)
  toast.success('抱团标的已删除')
}

function openTargetEdit(target: EmotionClusterTarget) {
  editingTarget.value = target
  Object.assign(editTargetForm, {
    name: target.name,
    code: target.code || '',
    theme: target.theme || '',
    note: target.note || ''
  })
}

function saveTargetEdit() {
  if (!editingTarget.value || !editTargetForm.name.trim()) {
    toast.error('请输入标的名称')
    return
  }
  const duplicate = store.targets.some(target => target.id !== editingTarget.value?.id && target.name === editTargetForm.name.trim())
  if (duplicate) {
    toast.error('该抱团标的名称已经存在')
    return
  }
  store.updateTarget(editingTarget.value.id, { ...editTargetForm })
  editingTarget.value = null
  toast.success('标的信息已更新')
}

function shiftDate(offset: number) {
  const date = new Date(`${selectedDate.value}T12:00:00`)
  date.setDate(date.getDate() + offset)
  selectedDate.value = date.toISOString().slice(0, 10)
}

const selectedChanges = computed(() => store.targets
  .map(target => target.entries[selectedDate.value]?.changePercent)
  .filter((value): value is number => typeof value === 'number'))
const todayAverage = computed(() => selectedChanges.value.length
  ? selectedChanges.value.reduce((sum, value) => sum + value, 0) / selectedChanges.value.length
  : null)
const todayAverageText = computed(() => formatPercent(todayAverage.value))
const todayAverageClass = computed(() => changeClass(todayAverage.value))

const historyRows = computed(() => store.targets.flatMap(target => Object.values(target.entries).map(entry => ({
  targetId: target.id,
  name: target.name,
  code: target.code,
  theme: target.theme,
  ...entry
}))).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100))

function formatPercent(value: number | null) {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(2))}%`
}

function changeClass(value: number | null) {
  return { gain: value !== null && value > 0, loss: value !== null && value < 0, flat: value === 0 }
}
</script>

<style scoped>
.cluster-page { width: 100%; max-width: 1320px; margin: 0 auto; }
.page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.eyebrow { margin-bottom: 4px; color: var(--color-orange); font-size: 10px; font-weight: 700; letter-spacing: .13em; }
.page-heading h1 { font-size: 22px; }
.page-heading p { margin-top: 5px; color: var(--text-secondary); font-size: 12px; }
.dashboard-link { padding: 7px 11px; border: 1px solid var(--border-color); border-radius: 5px; font-size: 11px; }
.summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.summary-strip > div { padding: 11px 13px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; }
.summary-strip span { display: block; margin-bottom: 5px; color: var(--text-tertiary); font-size: 10px; }
.summary-strip strong { font-size: 20px; }
.summary-strip small { margin-left: 4px; color: var(--text-tertiary); }
.gain strong, td.gain { color: var(--color-red); }
.loss strong, td.loss { color: var(--color-green); }
.flat strong, td.flat { color: var(--text-secondary); }
.panel { margin-bottom: 12px; padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 9px; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.panel-heading h2 { font-size: 15px; }
.panel-heading p { margin-top: 4px; color: var(--text-tertiary); font-size: 10px; }
.target-form { display: grid; grid-template-columns: 1.15fr .8fr 1fr 1.6fr auto; align-items: end; gap: 9px; }
label span { display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 10px; }
input, textarea { width: 100%; padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-primary); font-size: 12px; box-sizing: border-box; }
input:focus, textarea:focus { outline: none; border-color: var(--color-blue); }
.primary-button, .save-entry-button { padding: 8px 13px; color: #fff; background: var(--color-blue); border-radius: 5px; font-size: 11px; white-space: nowrap; }
.date-picker { display: flex; align-items: center; gap: 5px; }
.date-picker button { height: 30px; padding: 0 10px; color: var(--text-secondary); background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; }
.date-picker input { width: 138px; height: 30px; padding: 4px 7px; }
.date-picker .today-button { color: var(--color-blue); }
.record-list { display: flex; flex-direction: column; gap: 8px; }
.record-card { display: grid; grid-template-columns: 210px 1fr; overflow: hidden; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 7px; }
.target-info { padding: 12px; border-right: 1px solid var(--border-color); background: rgba(240,192,64,.045); }
.target-title { display: flex; align-items: baseline; gap: 7px; }
.target-title strong { font-size: 14px; }
.target-title span { color: var(--text-tertiary); font-size: 9px; }
.theme-chip { display: inline-block; margin-top: 7px; padding: 2px 7px; color: var(--color-orange); background: rgba(240,136,62,.1); border-radius: 9px; font-size: 9px; }
.target-info p { min-height: 28px; margin-top: 7px; color: var(--text-tertiary); font-size: 10px; line-height: 1.4; }
.target-actions { display: flex; gap: 9px; margin-top: 7px; }
.target-actions button { padding: 0; color: var(--color-blue); background: none; font-size: 9px; }
.target-actions .danger-text { color: var(--color-red); }
.daily-fields { display: grid; grid-template-columns: 1.15fr .55fr 1.5fr auto; align-items: end; gap: 9px; padding: 12px; }
.daily-actions { display: flex; gap: 6px; }
.daily-actions button { height: 32px; padding: 0 10px; border-radius: 4px; font-size: 10px; }
.clear-button { color: var(--color-red); background: rgba(248,81,73,.1); }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 34px; color: var(--text-tertiary); border: 1px dashed var(--border-color); border-radius: 7px; font-size: 11px; }
.empty-state b { color: var(--text-secondary); font-size: 13px; }
.history-count { color: var(--text-tertiary); font-size: 10px; }
.history-table-wrap { overflow-x: auto; }
.history-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.history-table th, .history-table td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); text-align: left; }
.history-table th { color: var(--text-tertiary); background: var(--bg-tertiary); font-size: 9px; font-weight: 500; }
.history-table td { color: var(--text-secondary); }
.history-table td strong { color: var(--text-primary); }
.history-table td small { display: block; margin-top: 2px; color: var(--text-tertiary); font-size: 8px; }
.history-empty { padding: 25px; color: var(--text-tertiary); text-align: center; font-size: 11px; }
.modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.62); }
.dialog { width: 380px; max-width: calc(100vw - 28px); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; border-bottom: 1px solid var(--border-color); font-size: 13px; }
.dialog-header button { color: var(--text-secondary); background: none; font-size: 18px; }
.dialog-body { display: grid; gap: 10px; padding: 15px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 7px; padding: 11px 15px; border-top: 1px solid var(--border-color); }
.dialog-footer button { padding: 7px 13px; border-radius: 4px; color: var(--text-secondary); background: var(--bg-tertiary); }
.dialog-footer .primary-button { color: #fff; background: var(--color-blue); }
@media (max-width: 1050px) { .target-form { grid-template-columns: repeat(2, 1fr); } .target-form button { justify-self: start; } .daily-fields { grid-template-columns: 1fr 150px; } .daily-note { grid-column: 1 / -1; } }
@media (max-width: 700px) { .page-heading, .record-heading { align-items: flex-start; flex-direction: column; } .summary-strip { grid-template-columns: repeat(2, 1fr); } .target-form { grid-template-columns: 1fr; } .record-card { grid-template-columns: 1fr; } .target-info { border-right: 0; border-bottom: 1px solid var(--border-color); } .daily-fields { grid-template-columns: 1fr; } .daily-note { grid-column: auto; } .daily-actions { justify-content: flex-end; } }
</style>
