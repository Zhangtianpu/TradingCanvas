<template>
  <section class="pattern-card">
    <header class="pattern-header">
      <div>
        <div class="eyebrow">虚拟验证 · 不计入持仓</div>
        <h2>模式挖掘</h2>
      </div>
      <button class="add-btn" :disabled="!tradeModeStore.tradeModes.length" @click="showForm = !showForm">
        {{ showForm ? '收起' : '+ 记录虚拟买点' }}
      </button>
    </header>

    <div v-if="tradeModeStore.tradeModes.length" class="analysis-toolbar">
      <div>
        <strong>模式统计</strong>
        <span>切换模式查看独立的验证结果</span>
      </div>
      <label class="mode-select">
        <span>分析模式</span>
        <select v-model="selectedModeId">
          <option v-for="mode in tradeModeStore.tradeModes" :key="mode.id" :value="mode.id">{{ mode.name }}</option>
        </select>
      </label>
    </div>
    <div v-else class="empty-tip">请先在“标签管理 → 交易模式”中创建模式。</div>

    <div v-if="selectedModeId" class="stats-grid">
      <div class="stat"><span>已完成</span><strong>{{ stats.closed }}</strong><small>笔</small></div>
      <div class="stat"><span>胜率</span><strong>{{ formatPercent(stats.winRate) }}</strong></div>
      <div class="stat"><span>盈亏比</span><strong>{{ formatRatio(stats.profitLossRatio) }}</strong></div>
      <div class="stat"><span>平均收益</span><strong :class="returnClass(stats.averageReturn)">{{ signedPercent(stats.averageReturn) }}</strong></div>
      <div class="stat"><span>累计收益率</span><strong :class="returnClass(stats.totalReturn)">{{ signedPercent(stats.totalReturn) }}</strong></div>
      <div class="stat"><span>进行中</span><strong>{{ stats.open }}</strong><small>笔</small></div>
    </div>

    <form v-if="showForm && tradeModeStore.tradeModes.length" class="trade-form" @submit.prevent="submitTrade">
      <div class="form-grid">
        <label><span>使用模式 *</span><select v-model="form.modeId" required><option v-for="mode in tradeModeStore.tradeModes" :key="mode.id" :value="mode.id">{{ mode.name }}</option></select></label>
        <label><span>股票名称 *</span><input v-model.trim="form.stockName" required placeholder="如：东方财富" /></label>
        <label><span>股票代码</span><input v-model.trim="form.stockCode" placeholder="可选" /></label>
        <label><span>买入日期 *</span><input v-model="form.buyDate" type="date" required /></label>
        <label><span>虚拟买价 *</span><input v-model.number="form.buyPrice" type="number" min="0.001" step="0.001" required /></label>
        <label><span>虚拟数量 *</span><input v-model.number="form.quantity" type="number" min="1" step="1" required /></label>
        <label class="note-field"><span>验证备注</span><input v-model.trim="form.note" placeholder="记录触发条件、预期与观察点" /></label>
      </div>
      <div class="form-actions"><button type="button" class="ghost-btn" @click="showForm = false">取消</button><button class="save-btn">保存虚拟买点</button></div>
    </form>

    <div v-if="selectedModeId" class="trade-list">
      <div class="list-head"><span>验证记录</span><small>统计仅基于已填写卖点的记录</small></div>
      <div v-if="modeTrades.length" class="table-wrap">
        <table>
          <thead><tr><th>标的</th><th>买点</th><th>卖点</th><th>收益</th><th>备注</th><th></th></tr></thead>
          <tbody>
            <tr v-for="trade in modeTrades" :key="trade.id">
              <td><b>{{ trade.stockName }}</b><small>{{ trade.stockCode || '—' }}</small></td>
              <td>{{ trade.buyPrice.toFixed(2) }}<small>{{ trade.buyDate }}</small></td>
              <td v-if="trade.sellPrice">{{ trade.sellPrice.toFixed(2) }}<small>{{ trade.sellDate }}</small></td>
              <td v-else><button class="close-btn" @click="openClose(trade.id)">记录卖点</button></td>
              <td><span v-if="returnRate(trade) !== null" :class="returnClass(returnRate(trade) || 0)">{{ signedPercent(returnRate(trade) || 0) }}</span><span v-else class="open-tag">进行中</span></td>
              <td class="note-cell" :title="trade.note">{{ trade.note || '—' }}</td>
              <td><button class="delete-btn" title="删除" @click="removeTrade(trade.id)">×</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-tip">这个模式还没有虚拟交易记录。</div>
    </div>

    <div v-if="closingId" class="modal-overlay" @click.self="closingId = null">
      <form class="close-modal" @submit.prevent="submitClose">
        <h3>记录虚拟卖点</h3>
        <label><span>卖出日期</span><input v-model="closeForm.sellDate" type="date" required /></label>
        <label><span>虚拟卖价</span><input v-model.number="closeForm.sellPrice" type="number" min="0.001" step="0.001" required /></label>
        <div class="form-actions"><button type="button" class="ghost-btn" @click="closingId = null">取消</button><button class="save-btn">完成交易</button></div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useTradeModeStore } from '@/stores/tradeMode'
import { usePatternMiningStore } from '@/stores/patternMining'
import type { PatternTrade } from '@/types'

const tradeModeStore = useTradeModeStore()
const patternStore = usePatternMiningStore()
const selectedModeId = ref(tradeModeStore.tradeModes[0]?.id || '')
const showForm = ref(false)
const today = () => new Date().toISOString().slice(0, 10)
const form = reactive({ modeId: selectedModeId.value, stockName: '', stockCode: '', buyDate: today(), buyPrice: 0, quantity: 100, note: '' })
const closingId = ref<string | null>(null)
const closeForm = reactive({ sellDate: today(), sellPrice: 0 })

const modeTrades = computed(() => patternStore.sortedTrades.filter(item => item.modeId === selectedModeId.value))
const stats = computed(() => patternStore.statsForMode(selectedModeId.value))
const returnRate = (trade: PatternTrade) => patternStore.returnRate(trade)

watch(() => tradeModeStore.tradeModes, modes => {
  if (!modes.some(mode => mode.id === selectedModeId.value)) selectedModeId.value = modes[0]?.id || ''
  if (!modes.some(mode => mode.id === form.modeId)) form.modeId = modes[0]?.id || ''
}, { deep: true })

function submitTrade() {
  if (!form.modeId || !form.stockName || form.buyPrice <= 0 || form.quantity <= 0) return
  patternStore.addTrade({
    modeId: form.modeId,
    stockName: form.stockName,
    stockCode: form.stockCode || undefined,
    buyDate: form.buyDate,
    buyPrice: form.buyPrice,
    quantity: form.quantity,
    note: form.note
  })
  selectedModeId.value = form.modeId
  Object.assign(form, { modeId: selectedModeId.value, stockName: '', stockCode: '', buyDate: today(), buyPrice: 0, quantity: 100, note: '' })
  showForm.value = false
}

function openClose(id: string) {
  closingId.value = id
  Object.assign(closeForm, { sellDate: today(), sellPrice: 0 })
}

function submitClose() {
  if (!closingId.value || closeForm.sellPrice <= 0) return
  patternStore.closeTrade(closingId.value, closeForm.sellDate, closeForm.sellPrice)
  closingId.value = null
}

function removeTrade(id: string) {
  if (confirm('确定删除这条虚拟交易记录？')) patternStore.deleteTrade(id)
}

const formatPercent = (value: number) => `${value.toFixed(1)}%`
const signedPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
const formatRatio = (value: number | null) => value === null ? '∞' : value ? `${value.toFixed(2)} : 1` : '—'
const returnClass = (value: number) => value > 0 ? 'positive' : value < 0 ? 'negative' : ''
</script>

<style scoped>
.pattern-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 18px; }
.pattern-header, .list-head, .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pattern-header h2 { font-size: 16px; margin-top: 3px; }
.eyebrow { color: var(--color-purple); font-size: 11px; letter-spacing: .08em; }
.add-btn, .save-btn { background: var(--color-blue); color: white; }
.add-btn:disabled { opacity: .45; cursor: not-allowed; }
.analysis-toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 16px 0 10px; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; }
.analysis-toolbar strong { display: block; font-size: 13px; margin-bottom: 4px; }
.analysis-toolbar > div > span { color: var(--text-tertiary); font-size: 11px; }
.mode-select { min-width: 180px; }
.mode-select span { margin-bottom: 4px; }
.mode-select select { width: 100%; padding: 6px 10px; }
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px; }
.stat { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 7px; padding: 11px; }
.stat span { display: block; color: var(--text-secondary); font-size: 11px; margin-bottom: 5px; }
.stat strong { font-size: 17px; }
.stat small { margin-left: 3px; color: var(--text-tertiary); }
.positive { color: var(--color-red); }
.negative { color: var(--color-green); }
.trade-form { background: var(--bg-tertiary); border: 1px solid rgba(88,166,255,.35); border-radius: 8px; padding: 14px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr; gap: 10px; }
label span { display: block; color: var(--text-secondary); font-size: 11px; margin-bottom: 5px; }
label input, label select { width: 100%; }
.note-field { grid-column: 1 / -1; }
.form-actions { justify-content: flex-end; margin-top: 12px; }
.ghost-btn { background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); }
.trade-list { border-top: 1px solid var(--border-color); padding-top: 14px; }
.list-head { margin-bottom: 9px; font-weight: 600; }
.list-head small { color: var(--text-tertiary); font-weight: 400; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { text-align: left; border-bottom: 1px solid var(--border-color); padding: 9px 8px; font-size: 12px; }
th { color: var(--text-tertiary); font-weight: 500; }
td small { display: block; color: var(--text-tertiary); margin-top: 2px; }
.close-btn { padding: 4px 8px; background: rgba(88,166,255,.12); color: var(--color-blue); }
.open-tag { color: var(--color-gold); }
.note-cell { max-width: 220px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--text-secondary); }
.delete-btn { background: transparent; color: var(--text-tertiary); padding: 2px 7px; font-size: 18px; }
.delete-btn:hover { color: var(--color-red); }
.empty-tip { color: var(--text-tertiary); text-align: center; padding: 18px; background: var(--bg-tertiary); border-radius: 7px; }
.close-modal { width: min(380px, calc(100vw - 32px)); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; }
.close-modal h3 { margin-bottom: 16px; }
.close-modal label { display: block; margin-bottom: 12px; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.65); }
@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } .form-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .pattern-header { align-items: flex-start; } .analysis-toolbar { align-items: stretch; flex-direction: column; } .mode-select { min-width: 0; } .stats-grid { grid-template-columns: repeat(2, 1fr); } .form-grid { grid-template-columns: 1fr; } .note-field { grid-column: auto; } .list-head { align-items: flex-start; flex-direction: column; } }
</style>
