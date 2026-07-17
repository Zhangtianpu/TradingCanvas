<template>
  <div class="review-page">
    <!-- 日期选择 -->
    <div class="page-header">
      <h1 class="page-title">每日复盘</h1>
      <input v-model="selectedDate" type="date" @change="loadData" class="date-input" />
    </div>

    <!-- 日期信息 -->
    <div class="date-info-card">
      <div class="date-main">
        <span class="date-text">{{ selectedDate }}</span>
        <span class="week-text">{{ weekDay }}</span>
      </div>
    </div>

    <!-- 宏观信息 -->
    <div class="macro-section">
      <div class="section-header">
        <span class="section-title">宏观信息</span>
      </div>
      <div class="macro-grid">
        <!-- 指数 -->
        <div class="macro-group">
          <div class="group-title">指数</div>
          <div class="input-list">
            <div class="input-row">
              <span class="input-label">上证</span>
              <input v-model.number="macroForm.shIndex" type="number" step="0.01" placeholder="点位" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">深证</span>
              <input v-model.number="macroForm.szIndex" type="number" step="0.01" placeholder="点位" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">创业板</span>
              <input v-model.number="macroForm.cybIndex" type="number" step="0.01" placeholder="点位" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">全A</span>
              <input v-model.number="macroForm.allAIndex" type="number" step="0.01" placeholder="点位" class="small-input" />
            </div>
            <div class="input-row single">
              <span class="input-label">成交量</span>
              <input v-model.number="macroForm.allAVolume" type="number" step="0.01" placeholder="亿" class="small-input" />
            </div>
          </div>
        </div>

        <!-- 涨跌 -->
        <div class="macro-group">
          <div class="group-title">涨跌</div>
          <div class="input-list">
            <div class="input-row">
              <span class="input-label">上涨</span>
              <input v-model.number="macroForm.upCount" type="number" min="0" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">下跌</span>
              <input v-model.number="macroForm.downCount" type="number" min="0" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">涨停</span>
              <input v-model.number="macroForm.limitUpCount" type="number" min="0" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">跌停</span>
              <input v-model.number="macroForm.limitDownCount" type="number" min="0" class="small-input" />
            </div>
          </div>
        </div>

        <!-- 连板 -->
        <div class="macro-group">
          <div class="group-title">连板</div>
          <div class="input-list">
            <div class="input-row">
              <span class="input-label">连板家数</span>
              <input v-model.number="macroForm.continuousBoardCount" type="number" min="0" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">封板率</span>
              <input v-model.number="macroForm.sealRate" type="number" min="0" max="100" step="0.01" class="small-input" />
              <span class="input-unit">%</span>
            </div>
            <div class="input-row">
              <span class="input-label">2板家数</span>
              <input v-model.number="macroForm.board2Count" type="number" min="0" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">3板家数</span>
              <input v-model.number="macroForm.board3Count" type="number" min="0" class="small-input" />
            </div>
            <div class="input-row">
              <span class="input-label">目标标的</span>
              <input v-model.number="form.targetStocks" type="number" min="0" class="small-input" />
              <span class="input-unit">只</span>
            </div>
          </div>
        </div>

        <!-- 空间板 -->
        <div class="macro-group">
          <div class="group-title">空间板</div>
          <div class="input-list">
            <div class="input-row">
              <span class="input-label">最高板</span>
              <input v-model.number="macroForm.maxBoardHeight" type="number" min="0" class="small-input" />
              <span class="input-unit">板</span>
            </div>
            <div class="input-row">
              <span class="input-label">股票名称</span>
              <input v-model="macroForm.spaceBoardName" type="text" placeholder="股票名称" class="text-input" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 当日题材 -->
    <div class="themes-section">
      <div class="section-header">
        <span class="section-title">当日题材</span>
        <router-link to="/themes" class="link-btn">管理题材</router-link>
      </div>
      <div v-if="dayThemes.length === 0" class="empty-hint">
        暂无当日题材记录
      </div>
      <div v-else class="theme-list">
        <div v-for="t in dayThemes" :key="t.id" class="theme-card" @click="$router.push(`/themes/${t.id}`)">
          <div class="theme-header">
            <span class="theme-name">{{ t.name }}</span>
            <span class="tag" :class="levelTagClass(t.level)">{{ THEME_LEVEL_LABELS[t.level] }}</span>
          </div>
          <div class="theme-meta">
            <span class="theme-sector">{{ t.sector }}</span>
            <span class="theme-status" :class="statusTagClass(t.status)">{{ THEME_STATUS_LABELS[t.status] }}</span>
          </div>
          <div class="theme-leaders" v-if="getThemeLeaders(t.id).length > 0">
            <span class="leader-label">龙头：</span>
            <span v-for="s in getThemeLeaders(t.id)" :key="s.id" class="leader-name">{{ s.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 复盘内容 -->
    <div class="review-content">
      <div class="section-title">复盘内容</div>
      <div class="card">
        <div class="form-group">
          <label>市场概述</label>
          <textarea v-model="form.summary" placeholder="今日市场整体感受..." rows="3"></textarea>
        </div>
      </div>
      <div class="card">
        <div class="form-group">
          <label>题材梳理</label>
          <textarea v-model="form.themeAnalysis" placeholder="各题材表现、龙头表现..." rows="3"></textarea>
        </div>
      </div>
      <div class="card">
        <div class="form-group">
          <label>操作反思</label>
          <textarea v-model="form.reflection" placeholder="今日操作得失、改进点..." rows="3"></textarea>
        </div>
      </div>
      <div class="card">
        <div class="form-group">
          <label>明日计划</label>
          <textarea v-model="form.tomorrowPlan" placeholder="明日关注方向、目标个股..." rows="3"></textarea>
        </div>
      </div>
      <div class="action-bar">
        <button class="btn-primary" @click="handleSave">保存复盘</button>
        <button class="btn-ghost" v-if="existingReview" @click="handleDelete">删除</button>
      </div>
    </div>

    <!-- 历史复盘 -->
    <div class="history-section">
      <div class="section-title">历史复盘</div>
      <div v-if="sortedReviews.length === 0" class="empty-hint">暂无历史复盘</div>
      <div v-else class="history-list">
        <div
          v-for="r in sortedReviews"
          :key="r.id"
          class="history-item"
          :class="{ active: r.date === selectedDate }"
          @click="selectDate(r.date)"
        >
          <div class="history-left">
            <span class="history-date">{{ r.date }}</span>
            <span class="history-week">{{ getWeekDay(r.date) }}</span>
          </div>
          <div class="history-right">
            <div class="history-preview">{{ r.summary?.slice(0, 40) || '无概述' }}...</div>
            <div class="history-tags">
              <span v-if="hasEmotionData(r.date)" class="tag tag-blue">宏观</span>
              <span v-if="r.summary" class="tag tag-green">复盘</span>
            </div>
          </div>
          <span class="edit-icon">✎</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useReviewStore } from '@/stores/review'
import { useEmotionStore } from '@/stores/emotion'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { THEME_LEVEL_LABELS, THEME_STATUS_LABELS } from '@/types'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'

const reviewStore = useReviewStore()
const emotionStore = useEmotionStore()
const themeStore = useThemeStore()
const stockStore = useStockStore()
const toast = useToast()

const selectedDate = ref(today())

// 复盘表单
const form = reactive({
  targetStocks: 0,
  summary: '',
  themeAnalysis: '',
  reflection: '',
  tomorrowPlan: ''
})

// 宏观信息表单
const macroForm = reactive({
  shIndex: 0,
  shChange: 0,
  szIndex: 0,
  szChange: 0,
  cybIndex: 0,
  cybChange: 0,
  allAIndex: 0,
  allAChange: 0,
  allAVolume: 0,
  upCount: 0,
  downCount: 0,
  limitUpCount: 0,
  limitDownCount: 0,
  continuousBoardCount: 0,
  sealRate: 0,
  board2Count: 0,
  board3Count: 0,
  maxBoardHeight: 0,
  spaceBoardName: ''
})

const emotion = computed(() => emotionStore.getEmotionByDate(selectedDate.value))
const existingReview = computed(() => reviewStore.getReviewByDate(selectedDate.value))

const weekDay = computed(() => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(selectedDate.value)
  return days[date.getDay()]
})

// 当日题材（按状态筛选活跃题材）
const dayThemes = computed(() => {
  const activeStatuses = ['burst', 'ferment', 'climax']
  return themeStore.sortedThemes.filter(t => activeStatuses.includes(t.status))
})

const sortedReviews = computed(() => {
  return [...reviewStore.reviews].sort((a, b) => b.date.localeCompare(a.date))
})

function getThemeLeaders(themeId: string) {
  return stockStore.stocks.filter(s => s.themeId === themeId && s.role === 'leader')
}

function levelTagClass(level: string) {
  return level === 'main' ? 'tag-red' : level === 'sub' ? 'tag-blue' : 'tag-yellow'
}

function statusTagClass(status: string) {
  const map: Record<string, string> = {
    burst: 'tag-red',
    ferment: 'tag-blue',
    climax: 'tag-yellow',
    retreat: 'tag-gray'
  }
  return map[status] || 'tag-gray'
}

// 加载数据
function loadData() {
  // 加载复盘内容
  const review = reviewStore.getReviewByDate(selectedDate.value)
  if (review) {
    form.targetStocks = review.targetStocks || 0
    form.summary = review.summary
    form.themeAnalysis = review.themeAnalysis
    form.reflection = review.reflection
    form.tomorrowPlan = review.tomorrowPlan
  } else {
    form.targetStocks = 0
    form.summary = ''
    form.themeAnalysis = ''
    form.reflection = ''
    form.tomorrowPlan = ''
  }

  // 加载宏观信息
  const e = emotionStore.getEmotionByDate(selectedDate.value)
  if (e) {
    macroForm.shIndex = e.shIndex || 0
    macroForm.shChange = e.shChange || 0
    macroForm.szIndex = e.szIndex || 0
    macroForm.szChange = e.szChange || 0
    macroForm.cybIndex = e.cybIndex || 0
    macroForm.cybChange = e.cybChange || 0
    macroForm.allAIndex = e.allAIndex || 0
    macroForm.allAChange = e.allAChange || 0
    macroForm.allAVolume = e.allAVolume || 0
    macroForm.upCount = e.upCount || 0
    macroForm.downCount = e.downCount || 0
    macroForm.limitUpCount = e.limitUpCount || 0
    macroForm.limitDownCount = e.limitDownCount || 0
    macroForm.continuousBoardCount = e.continuousBoardCount || 0
    macroForm.sealRate = e.sealRate || 0
    macroForm.board2Count = e.board2Count || 0
    macroForm.board3Count = e.board3Count || 0
    macroForm.maxBoardHeight = e.maxBoardHeight || 0
    macroForm.spaceBoardName = e.spaceBoardStocks?.[0]?.name || ''
  } else {
    // 重置表单
    Object.assign(macroForm, {
      shIndex: 0, shChange: 0, szIndex: 0, szChange: 0,
      cybIndex: 0, cybChange: 0, allAIndex: 0, allAChange: 0, allAVolume: 0,
      upCount: 0, downCount: 0, limitUpCount: 0, limitDownCount: 0,
      continuousBoardCount: 0, sealRate: 0, board2Count: 0, board3Count: 0,
      maxBoardHeight: 0, spaceBoardName: ''
    })
  }
}

function selectDate(date: string) {
  selectedDate.value = date
  loadData()
}

// 获取星期几
function getWeekDay(date: string) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = new Date(date)
  return days[d.getDay()]
}

// 检查是否有情绪数据
function hasEmotionData(date: string) {
  return !!emotionStore.getEmotionByDate(date)
}

function handleSave() {
  // 保存宏观信息
  const existing = emotionStore.getEmotionByDate(selectedDate.value)

  emotionStore.addOrUpdateEmotion({
    date: selectedDate.value,
    // 指数
    shIndex: macroForm.shIndex,
    shChange: macroForm.shChange,
    szIndex: macroForm.szIndex,
    szChange: macroForm.szChange,
    cybIndex: macroForm.cybIndex,
    cybChange: macroForm.cybChange,
    allAIndex: macroForm.allAIndex,
    allAChange: macroForm.allAChange,
    allAVolume: macroForm.allAVolume,
    // 市场概况
    upCount: macroForm.upCount,
    downCount: macroForm.downCount,
    limitUpCount: macroForm.limitUpCount,
    limitDownCount: macroForm.limitDownCount,
    // 连板
    continuousBoardCount: macroForm.continuousBoardCount,
    sealRate: macroForm.sealRate,
    board2Count: macroForm.board2Count,
    board3Count: macroForm.board3Count,
    board4Count: existing?.board4Count || 0,
    board5Count: existing?.board5Count || 0,
    board6PlusCount: existing?.board6PlusCount || 0,
    brokenRate: existing?.brokenRate || 0,
    // 空间板
    maxBoardHeight: macroForm.maxBoardHeight,
    spaceBoardStocks: macroForm.spaceBoardName
      ? [{ name: macroForm.spaceBoardName, height: macroForm.maxBoardHeight }]
      : existing?.spaceBoardStocks || [],
    prevHighBoard: existing?.prevHighBoard || 0,
    isBreakthrough: existing?.isBreakthrough || false,
    isMedian: existing?.isMedian || false,
    isIcePoint: existing?.isIcePoint || false,
    isAnnouncement: existing?.isAnnouncement || false,
    isClear: existing?.isClear || false,
    remark: existing?.remark || '',
    // 情绪
    phase: existing?.phase || 'freeze',
    leadingThemeId: existing?.leadingThemeId || '',
    note: existing?.note || ''
  })

  // 保存复盘内容
  reviewStore.addOrUpdateReview({
    date: selectedDate.value,
    targetStocks: form.targetStocks,
    summary: form.summary,
    themeAnalysis: form.themeAnalysis,
    reflection: form.reflection,
    tomorrowPlan: form.tomorrowPlan
  })

  toast.success('复盘已保存')
}

function handleDelete() {
  if (!existingReview.value) return
  reviewStore.deleteReview(existingReview.value.id)
  toast.success('复盘已删除')
  form.summary = ''
  form.themeAnalysis = ''
  form.reflection = ''
  form.tomorrowPlan = ''
}

onMounted(() => {
  loadData()
})

// 监听日期变化
watch(selectedDate, () => {
  loadData()
})
</script>

<style scoped>
.review-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.date-input {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 日期信息 */
.date-info-card {
  background: linear-gradient(135deg, rgba(88,166,255,0.15) 0%, rgba(88,166,255,0.05) 100%);
  border: 1px solid rgba(88,166,255,0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.date-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.date-text {
  font-size: 20px;
  font-weight: 600;
}

.week-text {
  font-size: 14px;
  color: var(--color-blue);
}

/* 宏观信息 */
.macro-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.link-btn {
  font-size: 12px;
  color: var(--color-blue);
}

.btn-small {
  padding: 4px 12px;
  font-size: 12px;
  background: var(--color-blue);
  color: #fff;
  border-radius: 4px;
}

.macro-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.macro-group {
  background: var(--bg-tertiary);
  border-radius: 6px;
  padding: 12px;
}

.group-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.input-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.input-row.single {
  margin-top: 4px;
}

.input-label {
  color: var(--text-secondary);
  width: 50px;
  flex-shrink: 0;
}

.small-input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
}

.text-input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
}

.input-unit {
  color: var(--text-secondary);
  font-size: 11px;
}

/* 当日题材 */
.themes-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.theme-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.theme-card {
  background: var(--bg-tertiary);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.theme-card:hover {
  transform: translateY(-2px);
}

.theme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.theme-name {
  font-weight: 500;
  font-size: 14px;
}

.theme-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.theme-leaders {
  font-size: 11px;
  color: var(--text-secondary);
}

.leader-name {
  color: #f0c040;
  margin-left: 4px;
}

/* 标签 */
.tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}

.tag-red { background: rgba(248,81,73,0.2); color: #f85149; }
.tag-blue { background: rgba(88,166,255,0.2); color: #58a6ff; }
.tag-yellow { background: rgba(240,192,64,0.2); color: #f0c040; }
.tag-gray { background: rgba(139,148,158,0.2); color: #8b949e; }

/* 复盘内容 */
.review-content {
  margin-bottom: 16px;
}

.review-content .card {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  resize: vertical;
}

.action-bar {
  display: flex;
  gap: 8px;
}

/* 历史复盘 */
.history-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.history-item:hover {
  background: var(--bg-primary);
  transform: translateX(4px);
}

.history-item.active {
  border-color: var(--color-blue);
  background: var(--bg-primary);
}

.history-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.history-date {
  font-size: 13px;
  font-weight: 600;
}

.history-week {
  font-size: 11px;
  color: var(--text-secondary);
}

.history-right {
  flex: 1;
  min-width: 0;
}

.history-preview {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.history-tags {
  display: flex;
  gap: 6px;
}

.tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}

.tag-blue { background: rgba(88,166,255,0.2); color: #58a6ff; }
.tag-green { background: rgba(63,185,80,0.2); color: #3fb950; }

.edit-icon {
  color: var(--text-tertiary);
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .edit-icon,
.history-item.active .edit-icon {
  opacity: 1;
}

.empty-hint {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}

@media (max-width: 768px) {
  .macro-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .theme-list {
    grid-template-columns: 1fr;
  }
}
</style>
