<template>
  <div class="emotion-anchor-page">
    <header class="page-heading">
      <div>
        <div class="eyebrow">SENTIMENT ANCHOR CENTER</div>
        <h1>情绪锚定</h1>
        <p>统一管理开盘判断、收盘复核、历史记录和计分规则；看板统计会与这里实时同步。</p>
      </div>
      <router-link to="/" class="dashboard-link">返回看板</router-link>
    </header>

    <section class="summary-strip">
      <div><span>记录天数</span><strong>{{ summary.days }}</strong><small>天</small></div>
      <div><span>累计标的</span><strong>{{ summary.anchors }}</strong><small>个</small></div>
      <div><span>已复核判断</span><strong>{{ store.overallAccuracy.reviewed }}</strong><small>次</small></div>
      <div><span>判断正确</span><strong>{{ store.overallAccuracy.correct }}</strong><small>次</small></div>
      <div class="accuracy"><span>累计正确率</span><strong>{{ accuracyText }}</strong></div>
    </section>

    <section class="rule-card">
      <div class="rule-heading">
        <div>
          <h2>计分规则</h2>
          <p>每个标的按开盘判断获得分值，当日综合得分为所有标的的平均分。</p>
        </div>
        <span v-if="saved" class="saved-tip">已保存并同步</span>
      </div>

      <div class="rule-grid">
        <div class="rule-group score-group">
          <strong>三档判断分值</strong>
          <label><span>超预期</span><input v-model.number="draft.aboveScore" type="number" min="0" max="100" /><small>分</small></label>
          <label><span>符合预期</span><input v-model.number="draft.matchScore" type="number" min="0" max="100" /><small>分</small></label>
          <label><span>低预期</span><input v-model.number="draft.belowScore" type="number" min="0" max="100" /><small>分</small></label>
        </div>
        <div class="rule-group threshold-group">
          <strong>情绪分界线</strong>
          <label><span class="tone strong-repair">强修复</span><b>≥</b><input v-model.number="draft.strongRepairMin" type="number" min="0" max="100" /></label>
          <label><span class="tone weak-repair">弱修复</span><b>≥</b><input v-model.number="draft.weakRepairMin" type="number" min="0" max="100" /></label>
          <label><span class="tone weak-diverge">弱分歧</span><b>≥</b><input v-model.number="draft.weakDivergeMin" type="number" min="0" max="100" /></label>
          <label><span class="tone strong-diverge">强分歧</span><b>&lt;</b><em>{{ draft.weakDivergeMin }}</em></label>
        </div>
        <div class="preview-group">
          <span>当前规则预览</span>
          <div class="scale-bar">
            <i class="strong-diverge-bg" :style="segmentStyle(0, draft.weakDivergeMin)"></i>
            <i class="weak-diverge-bg" :style="segmentStyle(draft.weakDivergeMin, draft.weakRepairMin)"></i>
            <i class="weak-repair-bg" :style="segmentStyle(draft.weakRepairMin, draft.strongRepairMin)"></i>
            <i class="strong-repair-bg" :style="segmentStyle(draft.strongRepairMin, 100)"></i>
          </div>
          <div class="scale-labels"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          <p v-if="error" class="rule-error">{{ error }}</p>
          <p v-else>保存后，看板与历史记录将立即按新规则重新计算。</p>
          <div class="rule-actions">
            <button class="reset-button" @click="resetRules">恢复默认</button>
            <button class="save-button" @click="saveRules">保存规则</button>
          </div>
        </div>
      </div>
    </section>

    <EmotionAnchorPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import EmotionAnchorPanel from '@/components/EmotionAnchorPanel.vue'
import { useEmotionAnchorStore } from '@/stores/emotionAnchor'
import type { EmotionAnchorSettings } from '@/types'

const store = useEmotionAnchorStore()
const draft = reactive<EmotionAnchorSettings>({ ...store.settings })
const error = ref('')
const saved = ref(false)

watch(() => store.settings, settings => Object.assign(draft, settings), { deep: true })

const summary = computed(() => ({
  days: store.records.length,
  anchors: store.records.reduce((sum, record) => sum + record.items.length, 0)
}))
const accuracyText = computed(() => store.overallAccuracy.reviewed ? `${store.overallAccuracy.accuracy.toFixed(1)}%` : '—')

function validate() {
  const values = [draft.aboveScore, draft.matchScore, draft.belowScore, draft.strongRepairMin, draft.weakRepairMin, draft.weakDivergeMin]
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) return '所有分值必须在 0–100 之间。'
  if (!(draft.strongRepairMin > draft.weakRepairMin && draft.weakRepairMin > draft.weakDivergeMin)) return '情绪分界线必须满足：强修复 > 弱修复 > 弱分歧。'
  if (!(draft.aboveScore >= draft.matchScore && draft.matchScore >= draft.belowScore)) return '三档分值应满足：超预期 ≥ 符合预期 ≥ 低预期。'
  return ''
}

function saveRules() {
  error.value = validate()
  if (error.value) return
  store.updateSettings({ ...draft })
  saved.value = true
  setTimeout(() => { saved.value = false }, 1800)
}

function resetRules() {
  store.resetSettings()
  error.value = ''
  saved.value = true
  setTimeout(() => { saved.value = false }, 1800)
}

function segmentStyle(start: number, end: number) {
  const safeStart = Math.max(0, Math.min(100, Number(start) || 0))
  const safeEnd = Math.max(safeStart, Math.min(100, Number(end) || 0))
  return { left: `${safeStart}%`, width: `${safeEnd - safeStart}%` }
}
</script>

<style scoped>
.emotion-anchor-page { width: 100%; max-width: 1280px; margin: 0 auto; }
.page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.eyebrow { margin-bottom: 4px; color: var(--color-purple); font-size: 10px; font-weight: 700; letter-spacing: .13em; }
.page-heading h1 { font-size: 22px; }
.page-heading p { margin-top: 5px; color: var(--text-secondary); font-size: 12px; }
.dashboard-link { padding: 7px 11px; border: 1px solid var(--border-color); border-radius: 5px; font-size: 11px; }
.summary-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
.summary-strip > div { padding: 11px 13px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; }
.summary-strip span { display: block; margin-bottom: 5px; color: var(--text-tertiary); font-size: 10px; }
.summary-strip strong { font-size: 20px; }
.summary-strip small { margin-left: 4px; color: var(--text-tertiary); }
.summary-strip .accuracy strong { color: var(--color-blue); }
.rule-card { margin-bottom: 12px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; }
.rule-heading { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 13px; }
.rule-heading h2 { font-size: 15px; }
.rule-heading p { margin-top: 4px; color: var(--text-tertiary); font-size: 10px; }
.saved-tip { padding: 4px 9px; color: var(--color-green); background: rgba(63,185,80,.1); border-radius: 10px; font-size: 10px; }
.rule-grid { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 12px; }
.rule-group, .preview-group { padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 7px; }
.rule-group > strong, .preview-group > span { display: block; margin-bottom: 9px; font-size: 11px; }
.rule-group label { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 7px; margin-top: 6px; color: var(--text-secondary); font-size: 11px; }
.rule-group input { width: 68px; padding: 5px 7px; text-align: center; }
.rule-group small, .rule-group b { color: var(--text-tertiary); font-weight: 400; }
.rule-group em { width: 68px; color: var(--text-primary); font-style: normal; text-align: center; }
.tone { font-weight: 600; }
.strong-repair { color: var(--color-red); }
.weak-repair { color: var(--color-orange); }
.weak-diverge { color: var(--color-blue); }
.strong-diverge { color: var(--color-green); }
.scale-bar { position: relative; height: 10px; margin: 17px 0 6px; overflow: hidden; background: var(--border-color); border-radius: 5px; }
.scale-bar i { position: absolute; top: 0; bottom: 0; }
.strong-diverge-bg { background: var(--color-green); }
.weak-diverge-bg { background: var(--color-blue); }
.weak-repair-bg { background: var(--color-orange); }
.strong-repair-bg { background: var(--color-red); }
.scale-labels { display: flex; justify-content: space-between; color: var(--text-tertiary); font-size: 9px; }
.preview-group p { min-height: 28px; margin-top: 11px; color: var(--text-tertiary); font-size: 10px; line-height: 1.4; }
.preview-group .rule-error { color: var(--color-red); }
.rule-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 8px; }
.rule-actions button { padding: 5px 10px; font-size: 10px; }
.reset-button { color: var(--text-secondary); background: transparent; border: 1px solid var(--border-color); }
.save-button { color: #fff; background: var(--color-blue); }
@media (max-width: 900px) { .rule-grid { grid-template-columns: 1fr 1fr; } .preview-group { grid-column: 1 / -1; } }
@media (max-width: 620px) {
  .page-heading { align-items: flex-start; flex-direction: column; }
  .summary-strip { grid-template-columns: repeat(2, 1fr); }
  .summary-strip .accuracy { grid-column: 1 / -1; }
  .rule-grid { grid-template-columns: 1fr; }
  .preview-group { grid-column: auto; }
}
</style>
