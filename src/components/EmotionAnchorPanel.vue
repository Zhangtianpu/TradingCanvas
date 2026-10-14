<template>
  <section class="anchor-card">
    <header class="anchor-header">
      <div>
        <div class="eyebrow">OPENING SENTIMENT CHECK</div>
        <h2>情绪锚定</h2>
        <p>用代表性标的校准开盘情绪，收盘复核判断质量。</p>
      </div>
      <div class="header-meta">
        <label>
          <span>记录日期</span>
          <input v-model="activeDate" type="date" :max="today" />
        </label>
        <div class="accuracy-pill">
          <small>累计正确率</small>
          <strong>{{ formatAccuracy(store.overallAccuracy.accuracy, store.overallAccuracy.reviewed) }}</strong>
          <span>{{ store.overallAccuracy.correct }}/{{ store.overallAccuracy.reviewed }} 次</span>
        </div>
      </div>
    </header>

    <div class="overview">
      <div class="emotion-score" :class="emotionClass(dayStats.label)">
        <span>今日情绪</span>
        <strong>{{ dayStats.total ? dayStats.label : '等待锚定' }}</strong>
        <div class="score-line">
          <i :style="{ width: `${dayStats.score}%` }"></i>
        </div>
        <small>综合得分 {{ dayStats.total ? dayStats.score : '—' }}</small>
      </div>
      <div class="count-stat above"><span>超预期</span><strong>{{ dayStats.above }}</strong><small>个</small></div>
      <div class="count-stat match"><span>符合预期</span><strong>{{ dayStats.match }}</strong><small>个</small></div>
      <div class="count-stat below"><span>低预期</span><strong>{{ dayStats.below }}</strong><small>个</small></div>
      <div class="count-stat reviewed"><span>当日正确率</span><strong>{{ formatAccuracy(dayStats.accuracy, dayStats.reviewed) }}</strong><small>{{ dayStats.correct }}/{{ dayStats.reviewed }}</small></div>
    </div>

    <div v-if="showRule" class="rule-tip">
      <span>计分规则</span>
      超预期 {{ store.settings.aboveScore }} 分 · 符合预期 {{ store.settings.matchScore }} 分 · 低预期 {{ store.settings.belowScore }} 分；
      ≥{{ store.settings.strongRepairMin }} 强修复，≥{{ store.settings.weakRepairMin }} 弱修复，≥{{ store.settings.weakDivergeMin }} 弱分歧，其余为强分歧。
    </div>

    <form v-if="!currentRecord?.finalizedAt" class="add-form" @submit.prevent="addAnchor">
      <div class="stock-fields">
        <input v-model.trim="form.name" required placeholder="锚定标的名称 *" />
        <input v-model.trim="form.code" placeholder="代码（可选）" />
        <input v-model.trim="form.note" placeholder="竞价、开盘走势备注（可选）" />
      </div>
      <div class="level-picker compact">
        <span>开盘判断</span>
        <button
          v-for="option in levelOptions"
          :key="option.value"
          type="button"
          :class="[option.value, { active: form.openingLevel === option.value }]"
          @click="form.openingLevel = option.value"
        >{{ option.label }}</button>
      </div>
      <button class="add-button" type="submit">添加标的</button>
    </form>

    <div v-if="currentRecord?.finalizedAt" class="locked-banner">
      <div>
        <span>✓ {{ activeDate }} 已完成收盘复核，记录已归档。</span>
        <small v-if="currentRecord.closingNote">复盘：{{ currentRecord.closingNote }}</small>
      </div>
      <button @click="store.reopenDay(activeDate)">重新编辑</button>
    </div>

    <div class="anchor-list">
      <div class="list-heading">
        <div><strong>锚定标的</strong><span>{{ currentRecord?.items.length || 0 }} 个</span></div>
        <small>收盘后选择实际表现，系统自动判断开盘结论是否正确</small>
      </div>

      <div v-if="currentRecord?.items.length" class="anchor-table-wrap">
        <table>
          <thead>
            <tr><th>标的</th><th>开盘判断</th><th>收盘实际</th><th>复核</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="item in currentRecord.items" :key="item.id">
              <td class="stock-cell">
                <b>{{ item.name }}</b><span>{{ item.code || '—' }}</span>
                <small v-if="item.note" :title="item.note">{{ item.note }}</small>
              </td>
              <td>
                <div class="level-picker table-picker">
                  <button
                    v-for="option in levelOptions"
                    :key="option.value"
                    :disabled="!!currentRecord.finalizedAt"
                    :class="[option.value, { active: item.openingLevel === option.value }]"
                    @click="store.updateOpeningLevel(activeDate, item.id, option.value)"
                  >{{ option.short }}</button>
                </div>
              </td>
              <td>
                <div class="level-picker table-picker">
                  <button
                    v-for="option in levelOptions"
                    :key="option.value"
                    :disabled="!!currentRecord.finalizedAt"
                    :class="[option.value, { active: item.closingLevel === option.value }]"
                    @click="toggleClosingLevel(item.id, option.value, item.closingLevel)"
                  >{{ option.short }}</button>
                </div>
              </td>
              <td>
                <span v-if="item.closingLevel" class="review-result" :class="item.closingLevel === item.openingLevel ? 'correct' : 'wrong'">
                  {{ item.closingLevel === item.openingLevel ? '判断正确' : '需要修正' }}
                </span>
                <span v-else class="pending">待复核</span>
              </td>
              <td><button v-if="!currentRecord.finalizedAt" class="delete-button" title="删除" @click="removeAnchor(item.id)">×</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state-small">还没有锚定标的，请添加当天最具代表性的核心标的。</div>
    </div>

    <div v-if="currentRecord?.items.length && !currentRecord.finalizedAt" class="closing-review">
      <div>
        <strong>收盘复核</strong>
        <span>已复核 {{ dayStats.reviewed }}/{{ dayStats.total }} 个标的</span>
      </div>
      <textarea v-model.trim="closingNote" rows="2" placeholder="记录今天判断偏差、盘面变化和明日改进点（可选）"></textarea>
      <button class="finalize-button" :disabled="dayStats.reviewed !== dayStats.total" @click="finalizeDay">
        {{ dayStats.reviewed === dayStats.total ? '完成复核并归档' : '请先复核全部标的' }}
      </button>
    </div>

    <div v-if="showHistory" class="history-section">
      <div class="history-heading">
        <strong>历史记录</strong>
        <span>点击日期可查看或补充复核</span>
      </div>
      <div v-if="store.sortedRecords.length" class="history-list">
        <button
          v-for="record in store.sortedRecords.slice(0, 12)"
          :key="record.id"
          :class="{ active: record.date === activeDate }"
          @click="selectRecord(record)"
        >
          <span class="history-date">{{ record.date }}</span>
          <b :class="emotionClass(store.stats(record).label)">{{ store.stats(record).label }}</b>
          <span>得分 {{ store.stats(record).score }}</span>
          <span>{{ store.stats(record).above }}/{{ store.stats(record).match }}/{{ store.stats(record).below }}</span>
          <span>正确率 {{ formatAccuracy(store.stats(record).accuracy, store.stats(record).reviewed) }}</span>
          <i :class="record.finalizedAt ? 'done' : 'open'">{{ record.finalizedAt ? '已归档' : '待完成' }}</i>
        </button>
      </div>
      <div v-else class="empty-history">完成第一天的情绪锚定后，这里会形成可回看的判断档案。</div>
    </div>
    <router-link v-else to="/emotion-anchor" class="manage-anchor-link">查看完整历史与计分规则 →</router-link>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { EmotionAnchorDaily, EmotionAnchorLevel } from '@/types'
import { useEmotionAnchorStore } from '@/stores/emotionAnchor'

withDefaults(defineProps<{
  showHistory?: boolean
  showRule?: boolean
}>(), {
  showHistory: true,
  showRule: true
})

const store = useEmotionAnchorStore()
const localDateString = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
const today = localDateString()
const activeDate = ref(today)
const closingNote = ref('')
const form = reactive({ name: '', code: '', note: '', openingLevel: 'match' as EmotionAnchorLevel })
const levelOptions: Array<{ value: EmotionAnchorLevel; label: string; short: string }> = [
  { value: 'above', label: '超预期', short: '超' },
  { value: 'match', label: '符合预期', short: '符' },
  { value: 'below', label: '低预期', short: '低' }
]

const currentRecord = computed(() => store.records.find(record => record.date === activeDate.value))
const dayStats = computed(() => store.stats(currentRecord.value))

watch(currentRecord, record => {
  closingNote.value = record?.closingNote || ''
}, { immediate: true })

function addAnchor() {
  if (!form.name) return
  store.addAnchor(activeDate.value, {
    name: form.name,
    code: form.code || undefined,
    note: form.note,
    openingLevel: form.openingLevel
  })
  Object.assign(form, { name: '', code: '', note: '', openingLevel: 'match' })
}

function toggleClosingLevel(id: string, level: EmotionAnchorLevel, current?: EmotionAnchorLevel) {
  store.updateClosingLevel(activeDate.value, id, current === level ? undefined : level)
}

function removeAnchor(id: string) {
  if (confirm('确定删除这个情绪锚定标的？')) store.deleteAnchor(activeDate.value, id)
}

function finalizeDay() {
  if (!currentRecord.value || dayStats.value.reviewed !== dayStats.value.total) return
  store.finalizeDay(activeDate.value, closingNote.value)
}

function selectRecord(record: EmotionAnchorDaily) {
  activeDate.value = record.date
  document.querySelector('.anchor-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatAccuracy(value: number, reviewed: number) {
  return reviewed ? `${value.toFixed(1)}%` : '—'
}

function emotionClass(label: string) {
  return {
    '强修复': 'strong-repair',
    '弱修复': 'weak-repair',
    '弱分歧': 'weak-diverge',
    '强分歧': 'strong-diverge'
  }[label] || ''
}
</script>

<style scoped>
.anchor-card { padding: 18px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; }
.anchor-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.eyebrow { margin-bottom: 4px; color: var(--color-purple); font-size: 10px; font-weight: 700; letter-spacing: .13em; }
.anchor-header h2 { font-size: 18px; }
.anchor-header p { margin-top: 5px; color: var(--text-secondary); font-size: 12px; }
.header-meta { display: flex; align-items: stretch; gap: 8px; }
.header-meta label { display: flex; flex-direction: column; gap: 4px; color: var(--text-tertiary); font-size: 10px; }
.header-meta input { width: 142px; padding: 6px 8px; }
.accuracy-pill { min-width: 110px; padding: 7px 11px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 7px; }
.accuracy-pill small, .accuracy-pill span { display: block; color: var(--text-tertiary); font-size: 10px; }
.accuracy-pill strong { display: inline-block; margin: 2px 6px 1px 0; color: var(--color-blue); font-size: 17px; }
.accuracy-pill span { display: inline; }
.overview { display: grid; grid-template-columns: 1.5fr repeat(4, 1fr); gap: 8px; margin-top: 16px; }
.emotion-score, .count-stat { min-height: 82px; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; }
.emotion-score > span, .count-stat > span { display: block; color: var(--text-secondary); font-size: 11px; }
.emotion-score strong { display: block; margin-top: 5px; font-size: 20px; }
.emotion-score small { color: var(--text-tertiary); font-size: 10px; }
.score-line { height: 4px; margin: 7px 0 5px; overflow: hidden; background: var(--border-color); border-radius: 3px; }
.score-line i { display: block; height: 100%; background: currentColor; border-radius: 3px; transition: width .25s; }
.count-stat strong { display: inline-block; margin-top: 9px; font-size: 24px; }
.count-stat small { margin-left: 4px; color: var(--text-tertiary); }
.count-stat.above strong { color: var(--color-red); }
.count-stat.match strong { color: var(--color-gold); }
.count-stat.below strong { color: var(--color-green); }
.count-stat.reviewed strong { color: var(--color-blue); font-size: 20px; }
.strong-repair { color: var(--color-red) !important; }
.weak-repair { color: var(--color-orange) !important; }
.weak-diverge { color: var(--color-blue) !important; }
.strong-diverge { color: var(--color-green) !important; }
.rule-tip { margin-top: 8px; padding: 8px 11px; color: var(--text-tertiary); background: rgba(88,166,255,.06); border: 1px solid rgba(88,166,255,.14); border-radius: 6px; font-size: 10px; }
.rule-tip span { margin-right: 7px; color: var(--color-blue); font-weight: 600; }
.add-form { display: grid; grid-template-columns: minmax(300px, 1fr) auto auto; align-items: end; gap: 10px; margin-top: 14px; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; }
.stock-fields { display: grid; grid-template-columns: 1fr .7fr 1.5fr; gap: 7px; }
.stock-fields input { width: 100%; padding: 7px 9px; }
.level-picker { display: flex; align-items: center; gap: 4px; }
.level-picker > span { margin-right: 3px; color: var(--text-tertiary); font-size: 10px; }
.level-picker button { padding: 5px 8px; color: var(--text-tertiary); background: transparent; border: 1px solid var(--border-color); font-size: 11px; }
.level-picker button.active.above { color: #fff; background: var(--color-red); border-color: var(--color-red); }
.level-picker button.active.match { color: #161b22; background: var(--color-gold); border-color: var(--color-gold); }
.level-picker button.active.below { color: #fff; background: var(--color-green); border-color: var(--color-green); }
.level-picker button:disabled { cursor: default; opacity: .75; }
.add-button, .finalize-button { color: #fff; background: var(--color-blue); white-space: nowrap; }
.locked-banner { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding: 10px 12px; color: var(--color-green); background: rgba(63,185,80,.08); border: 1px solid rgba(63,185,80,.22); border-radius: 7px; font-size: 12px; }
.locked-banner small { display: block; max-width: 780px; margin-top: 4px; color: var(--text-secondary); line-height: 1.5; }
.locked-banner button { padding: 4px 9px; color: var(--text-secondary); background: transparent; border: 1px solid var(--border-color); font-size: 11px; }
.anchor-list { margin-top: 14px; }
.list-heading, .history-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.list-heading div { display: flex; align-items: center; gap: 7px; }
.list-heading span { padding: 1px 7px; color: var(--color-blue); background: rgba(88,166,255,.1); border-radius: 10px; font-size: 10px; }
.list-heading small, .history-heading span { color: var(--text-tertiary); font-size: 10px; }
.anchor-table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 730px; border-collapse: collapse; }
th, td { padding: 9px 8px; border-bottom: 1px solid var(--border-color); text-align: left; font-size: 11px; }
th { color: var(--text-tertiary); font-weight: 500; }
.stock-cell b, .stock-cell span, .stock-cell small { display: block; }
.stock-cell span { margin-top: 2px; color: var(--text-tertiary); font-size: 10px; }
.stock-cell small { max-width: 260px; margin-top: 3px; overflow: hidden; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; }
.table-picker button { width: 30px; padding: 4px; }
.review-result { padding: 3px 7px; border-radius: 10px; font-size: 10px; }
.review-result.correct { color: var(--color-green); background: rgba(63,185,80,.12); }
.review-result.wrong { color: var(--color-orange); background: rgba(240,136,62,.12); }
.pending { color: var(--text-tertiary); }
.delete-button { padding: 2px 7px; color: var(--text-tertiary); background: transparent; font-size: 18px; }
.delete-button:hover { color: var(--color-red); }
.empty-state-small, .empty-history { padding: 22px; color: var(--text-tertiary); background: var(--bg-tertiary); border-radius: 7px; text-align: center; font-size: 11px; }
.closing-review { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; margin-top: 12px; padding: 12px; background: rgba(188,140,255,.05); border: 1px solid rgba(188,140,255,.18); border-radius: 8px; }
.closing-review > div span { display: block; margin-top: 3px; color: var(--text-tertiary); font-size: 10px; }
.closing-review textarea { min-height: 54px; padding: 7px 9px; }
.finalize-button:disabled { cursor: not-allowed; opacity: .4; }
.history-section { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-color); }
.manage-anchor-link { display: block; margin-top: 13px; padding-top: 11px; border-top: 1px solid var(--border-color); text-align: right; font-size: 11px; }
.history-list { display: flex; flex-direction: column; gap: 5px; }
.history-list button { display: grid; grid-template-columns: 100px 72px 70px 80px 1fr 55px; align-items: center; gap: 8px; padding: 8px 10px; color: var(--text-secondary); background: var(--bg-tertiary); border: 1px solid transparent; text-align: left; font-size: 10px; }
.history-list button:hover, .history-list button.active { border-color: rgba(88,166,255,.45); }
.history-date { color: var(--text-primary); font-weight: 600; }
.history-list i { justify-self: end; font-style: normal; }
.history-list i.done { color: var(--color-green); }
.history-list i.open { color: var(--color-gold); }
@media (max-width: 900px) {
  .overview { grid-template-columns: repeat(4, 1fr); }
  .emotion-score { grid-column: 1 / -1; }
  .add-form { grid-template-columns: 1fr; align-items: stretch; }
  .stock-fields { grid-template-columns: 1fr 1fr; }
  .stock-fields input:last-child { grid-column: 1 / -1; }
  .closing-review { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .anchor-header { flex-direction: column; }
  .header-meta { width: 100%; }
  .header-meta label, .header-meta input, .accuracy-pill { flex: 1; width: auto; }
  .overview { grid-template-columns: repeat(2, 1fr); }
  .stock-fields { grid-template-columns: 1fr; }
  .stock-fields input:last-child { grid-column: auto; }
  .compact { flex-wrap: wrap; }
  .history-list button { grid-template-columns: 1fr 1fr 1fr; }
  .history-list i { justify-self: start; }
}
</style>
