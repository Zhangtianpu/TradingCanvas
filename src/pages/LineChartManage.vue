<template>
  <div class="line-chart-page">
    <header class="page-heading">
      <div>
        <h1>折线图管理</h1>
        <p>选择看板需要展示的参数，并为每张折线图配置独立均线。</p>
      </div>
      <div class="heading-actions">
        <span>已启用 {{ enabledCount }}/{{ LINE_CHART_DEFINITIONS.length }}</span>
        <button class="btn-ghost btn-sm" @click="resetSettings">恢复默认</button>
        <router-link to="/" class="back-link">返回看板</router-link>
      </div>
    </header>

    <section v-for="group in groups" :key="group.name" class="group-card">
      <div class="group-title">
        <div>
          <h2>{{ group.name }}</h2>
          <p>{{ group.description }}</p>
        </div>
        <button class="group-toggle" @click="toggleGroup(group.items)">
          {{ group.items.every(item => chartStore.preferences[item.key].enabled) ? '全部关闭' : '全部启用' }}
        </button>
      </div>

      <div class="chart-list">
        <article v-for="chart in group.items" :key="chart.key" class="chart-setting" :class="{ disabled: !chartStore.preferences[chart.key].enabled }">
          <div class="chart-main">
            <label class="enable-switch">
              <input
                type="checkbox"
                :checked="chartStore.preferences[chart.key].enabled"
                @change="chartStore.setEnabled(chart.key, ($event.target as HTMLInputElement).checked)"
              />
              <span class="switch-track"><span></span></span>
              <span class="chart-color" :style="{ background: chart.color }"></span>
              <strong>{{ chart.title }}</strong>
            </label>
            <span class="status-text">{{ chartStore.preferences[chart.key].enabled ? '在看板显示' : '已隐藏' }}</span>
          </div>

          <div class="average-panel">
            <div class="average-heading">
              <span>均线设置</span>
              <small>可同时添加多条均线</small>
            </div>
            <div class="quick-actions">
              <button @click="addPeriod(chart.key, 5)">+ 5日均线</button>
              <button @click="addPeriod(chart.key, 10)">+ 10日均线</button>
              <button @click="addCumulative(chart.key)">+ 开始至今</button>
              <div class="custom-average">
                <input
                  v-model.number="customPeriods[chart.key]"
                  type="number"
                  min="2"
                  max="365"
                  placeholder="自定义天数"
                  @keyup.enter="addCustom(chart.key)"
                />
                <button @click="addCustom(chart.key)">添加</button>
              </div>
            </div>

            <div v-if="chartStore.preferences[chart.key].averages.length" class="average-tags">
              <span v-for="average in chartStore.preferences[chart.key].averages" :key="average.id" class="average-tag">
                <i :style="{ background: average.color }"></i>
                {{ movingAverageLabel(average) }}
                <button :aria-label="`删除${movingAverageLabel(average)}`" @click="chartStore.removeAverage(chart.key, average.id)">×</button>
              </span>
            </div>
            <p v-else class="empty-average">暂未添加均线</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { LINE_CHART_DEFINITIONS, movingAverageLabel, useLineChartStore } from '@/stores/lineChart'
import type { LineChartDefinition, LineChartKey } from '@/stores/lineChart'
import { useToast } from '@/composables/useToast'

const chartStore = useLineChartStore()
const toast = useToast()
const customPeriods = reactive<Partial<Record<LineChartKey, number>>>({})

const groupDescriptions: Record<string, string> = {
  宏观指数: '观察主要指数趋势与市场整体方向',
  涨跌概况: '观察赚钱效应、涨停与跌停变化',
  连板情绪: '观察连板生态、晋级率及空间高度'
}

const groups = computed(() => ['宏观指数', '涨跌概况', '连板情绪'].map(name => ({
  name,
  description: groupDescriptions[name],
  items: LINE_CHART_DEFINITIONS.filter(item => item.group === name)
})))

const enabledCount = computed(() => chartStore.enabledDefinitions.length)

function addPeriod(key: LineChartKey, period: number) {
  if (!chartStore.addRollingAverage(key, period)) toast.info(`${period}日均线已存在`)
  else toast.success(`已添加${period}日均线`)
}

function addCumulative(key: LineChartKey) {
  if (!chartStore.addCumulativeAverage(key)) toast.info('开始至今均线已存在')
  else toast.success('已添加开始至今均线')
}

function addCustom(key: LineChartKey) {
  const period = customPeriods[key]
  if (!period || period < 2 || period > 365) {
    toast.error('均线天数请输入 2–365')
    return
  }
  if (!chartStore.addRollingAverage(key, period)) toast.info(`${Math.floor(period)}日均线已存在`)
  else {
    customPeriods[key] = undefined
    toast.success(`已添加${Math.floor(period)}日均线`)
  }
}

function toggleGroup(items: LineChartDefinition[]) {
  const enabled = !items.every(item => chartStore.preferences[item.key].enabled)
  items.forEach(item => chartStore.setEnabled(item.key, enabled))
}

function resetSettings() {
  chartStore.reset()
  toast.success('折线图设置已恢复默认')
}
</script>

<style scoped>
.line-chart-page { width: 100%; max-width: 1180px; margin: 0 auto; }
.page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.page-heading h1 { margin-bottom: 5px; font-size: 21px; }
.page-heading p, .group-title p { color: var(--text-secondary); font-size: 13px; }
.heading-actions { display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 12px; }
.back-link { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 5px; }
.group-card { margin-bottom: 16px; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 9px; }
.group-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--border-color); }
.group-title h2 { margin-bottom: 3px; font-size: 15px; }
.group-toggle { padding: 5px 10px; color: var(--color-blue); background: rgba(88,166,255,.1); font-size: 12px; }
.chart-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.chart-setting { min-width: 0; padding: 14px 16px; border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); transition: opacity .2s; }
.chart-setting:nth-child(2n) { border-right: 0; }
.chart-setting.disabled { opacity: .58; }
.chart-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 13px; }
.enable-switch { display: flex; align-items: center; gap: 9px; cursor: pointer; }
.enable-switch input { position: absolute; opacity: 0; pointer-events: none; }
.switch-track { position: relative; width: 32px; height: 18px; flex-shrink: 0; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; transition: .2s; }
.switch-track span { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background: var(--text-tertiary); border-radius: 50%; transition: .2s; }
.enable-switch input:checked + .switch-track { background: rgba(88,166,255,.28); border-color: var(--color-blue); }
.enable-switch input:checked + .switch-track span { left: 16px; background: var(--color-blue); }
.chart-color { width: 4px; height: 17px; border-radius: 2px; }
.status-text { color: var(--text-tertiary); font-size: 11px; }
.average-panel { padding: 10px; background: var(--bg-primary); border-radius: 6px; }
.average-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; font-size: 12px; font-weight: 600; }
.average-heading small { color: var(--text-tertiary); font-size: 10px; font-weight: 400; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.quick-actions > button, .custom-average button { padding: 5px 8px; color: var(--text-secondary); background: var(--bg-tertiary); border: 1px solid var(--border-color); font-size: 11px; }
.quick-actions button:hover { color: var(--color-blue); border-color: var(--color-blue); }
.custom-average { display: flex; min-width: 145px; flex: 1; }
.custom-average input { width: 100%; min-width: 80px; padding: 5px 7px; border-radius: 4px 0 0 4px; font-size: 11px; }
.custom-average button { border-left: 0; border-radius: 0 4px 4px 0; }
.average-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.average-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 5px 3px 7px; color: var(--text-secondary); background: var(--bg-tertiary); border-radius: 10px; font-size: 11px; }
.average-tag i { width: 14px; height: 2px; border-radius: 1px; }
.average-tag button { padding: 0 3px; color: var(--text-tertiary); background: transparent; font-size: 15px; line-height: 1; }
.average-tag button:hover { color: var(--color-red); }
.empty-average { margin-top: 9px; color: var(--text-tertiary); font-size: 11px; }
@media (max-width: 760px) {
  .page-heading { align-items: flex-start; flex-direction: column; }
  .heading-actions { flex-wrap: wrap; }
  .chart-list { grid-template-columns: 1fr; }
  .chart-setting { border-right: 0; }
}
</style>
