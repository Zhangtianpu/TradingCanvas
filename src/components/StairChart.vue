<template>
  <div class="stair-chart">
    <div class="chart-header">
      <span class="chart-title">连板楼梯图</span>
      <div class="chart-legend">
        <span class="legend-item"><span class="dot breakthrough"></span>突破</span>
        <span class="legend-item"><span class="dot median"></span>中位</span>
        <span class="legend-item"><span class="dot ice"></span>冰点</span>
        <span class="legend-item"><span class="dot announcement"></span>公告</span>
        <span class="legend-item"><span class="dot clear"></span>出清</span>
      </div>
    </div>
    <!-- 显示范围控制 -->
    <div class="stair-range-controls">
      <span class="stair-range-label">显示范围：</span>
      <button
        v-for="r in timeRanges"
        :key="r.value"
        class="stair-range-btn"
        :class="{ active: stairRange === r.value }"
        @click="stairRange = r.value"
      >{{ r.label }}</button>
      <div class="stair-custom-range">
        <input
          type="number"
          v-model.number="customStairRange"
          min="1"
          max="365"
          class="stair-range-input"
          placeholder="天数"
        />
        <button class="stair-range-btn" @click="applyCustomStairRange">确定</button>
      </div>
    </div>
    <div class="chart-body" v-if="displayEmotions.length > 0">
      <!-- 高度标签 -->
      <div class="height-labels">
        <div v-for="h in heightRange" :key="h" class="height-label">{{ h }}板</div>
      </div>
      <!-- 表格主体 -->
      <div class="table-container">
        <div class="table-wrapper">
          <div class="table-scroll" ref="scrollContainerRef" @scroll="onScroll">
            <table class="stair-table" :style="{ '--cell-width': cellWidth + 'px' }">
              <thead>
                <tr>
                  <th
                    v-for="e in displayEmotions"
                    :key="e.id"
                    class="date-header"
                    :class="{ 'is-clear': e.isClear }"
                    @click="handleDateClick(e)"
                    :title="e.isClear ? '点击取消出清标记' : '点击标记为出清'"
                  >
                    {{ e.date.slice(5) }}
                    <span v-if="e.isClear" class="clear-badge">清</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in heightRange" :key="h">
                  <td
                    v-for="(e, idx) in displayEmotions"
                    :key="e.id"
                    class="cell"
                    :class="getCellClass(e, h, idx)"
                    :title="e.remark || ''"
                  >
                    <template v-if="hasStockAtHeight(e, h)">
                      <div class="cell-content">
                        <span
                          class="stock-name clickable"
                          @click.stop="handleCellClick(e, h)"
                          title="点击编辑"
                        >
                          {{ getStockAtHeight(e, h)?.name }}
                        </span>
                        <div class="badge-row" v-if="h === e.maxBoardHeight">
                          <span v-if="e.isAnnouncement" class="announcement-badge">公</span>
                          <span v-if="e.isIcePoint" class="ice-badge">冰</span>
                          <span v-if="e.isMedian" class="median-badge">中</span>
                        </div>
                      </div>
                      <span class="edit-hint" @click.stop="handleCellClick(e, h)">✎</span>
                    </template>
                    <template v-else-if="h === e.maxBoardHeight">
                      <div class="cell-content">
                        <span
                          class="stock-name clickable"
                          @click.stop="handleCellClick(e, h)"
                          title="点击编辑"
                        >
                          {{ getFirstStock(e)?.name || '-' }}
                        </span>
                        <div class="badge-row">
                          <span v-if="e.isIcePoint" class="ice-badge">冰</span>
                          <span v-if="e.isMedian" class="median-badge">中</span>
                        </div>
                      </div>
                      <span class="edit-hint" @click.stop="handleCellClick(e, h)">✎</span>
                    </template>
                    <template v-else-if="h <= e.maxBoardHeight">
                      <span class="fill-dot" @click.stop="handleCellClick(e, h)"></span>
                    </template>
                    <template v-else-if="h === e.maxBoardHeight + 1">
                      <span class="add-hint" @click.stop="handleCellClick(e, h)">+</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 拖拽滚动条 -->
        <div
          class="custom-scrollbar"
          :class="{ 'is-disabled': !showScrollbar }"
          ref="scrollbarRef"
          @mousedown="onScrollbarMouseDown"
        >
          <div
            class="scrollbar-thumb"
            :style="{ width: thumbWidth + '%', left: thumbLeft + '%' }"
          ></div>
        </div>
      </div>
    </div>
    <div v-else class="empty-hint">暂无数据</div>

    <!-- 编辑弹窗 -->
    <div v-if="editingCell" class="edit-modal" @click.self="closeEdit">
      <div class="edit-dialog">
        <div class="edit-header">
          <span>{{ editingCell.date.slice(5) }} - {{ editingCell.height }}板</span>
          <button class="btn-close" @click="closeEdit">×</button>
        </div>
        <div class="edit-body">
          <div class="edit-row">
            <label>选择个股</label>
            <select v-model="editForm.selectedStockId" @change="onStockSelect" class="stock-select">
              <option value="">手动输入</option>
              <option v-for="s in stockStore.stocks" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.code }})
              </option>
            </select>
          </div>
          <div class="edit-row" v-if="!editForm.selectedStockId">
            <label>股票名称</label>
            <input
              v-model="editForm.stockName"
              type="text"
              placeholder="输入股票名称"
              @keyup.enter="saveEdit"
              ref="editInputRef"
            />
          </div>
          <div class="edit-row">
            <label>
              <input type="checkbox" v-model="editForm.isBreakthrough" />
              高度突破
            </label>
          </div>
          <div class="edit-row">
            <label>
              <input type="checkbox" v-model="editForm.isMedian" />
              中位标记
            </label>
          </div>
          <div class="edit-row">
            <label>
              <input type="checkbox" v-model="editForm.isIcePoint" />
              冰点标记
            </label>
          </div>
          <div class="edit-row">
            <label>
              <input type="checkbox" v-model="editForm.isAnnouncement" />
              公告标记
            </label>
          </div>
          <div class="edit-row">
            <label>备注信息</label>
            <textarea v-model="editForm.remark" placeholder="输入备注..." rows="2"></textarea>
          </div>
        </div>
        <div class="edit-footer">
          <button class="btn-danger" v-if="hasExistingStock" @click="deleteEdit">删除</button>
          <button class="btn-secondary" @click="closeEdit">取消</button>
          <button class="btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { EmotionDaily, SpaceBoardStock } from '@/types'
import { useEmotionStore } from '@/stores/emotion'
import { useStockStore } from '@/stores/stock'

const props = defineProps<{
  emotions: EmotionDaily[]
  dateRange?: number
}>()

const router = useRouter()
const emotionStore = useEmotionStore()
const stockStore = useStockStore()

// 连板楼梯图独立的显示范围控制
const timeRanges = [
  { label: '10天', value: 10 },
  { label: '20天', value: 20 },
  { label: '30天', value: 30 },
  { label: '60天', value: 60 }
]
const stairRange = ref(20)
const customStairRange = ref<number | null>(null)

// 根据独立 range 截取的显示数据（props.emotions 为从旧到新的全部数据）
const displayEmotions = computed(() => {
  return props.emotions.slice(-stairRange.value)
})

function applyCustomStairRange() {
  if (customStairRange.value && customStairRange.value >= 1 && customStairRange.value <= 365) {
    stairRange.value = customStairRange.value
    customStairRange.value = null
  }
}

// 拖拽滚动条
const scrollContainerRef = ref<HTMLElement | null>(null)
const scrollbarRef = ref<HTMLElement | null>(null)
const thumbWidth = ref(100)
const thumbLeft = ref(0)
const showScrollbar = ref(false)
const isDragging = ref(false)
let resizeObserver: ResizeObserver | null = null

function updateScrollbar() {
  const el = scrollContainerRef.value
  if (!el) return
  const { scrollWidth, clientWidth, scrollLeft } = el
  if (scrollWidth <= clientWidth + 1) {
    // 不需要滚动：thumb 占满轨道，禁用拖动
    showScrollbar.value = false
    thumbWidth.value = 100
    thumbLeft.value = 0
    return
  }
  showScrollbar.value = true
  thumbWidth.value = (clientWidth / scrollWidth) * 100
  thumbLeft.value = (scrollLeft / (scrollWidth - clientWidth)) * (100 - thumbWidth.value)
}

function onScroll() {
  if (!isDragging.value) updateScrollbar()
}

function onScrollbarMouseDown(e: MouseEvent) {
  const el = scrollContainerRef.value
  const bar = scrollbarRef.value
  if (!el || !bar || !showScrollbar.value) return
  isDragging.value = true
  e.preventDefault()

  const onMove = (ev: MouseEvent) => {
    const rect = bar.getBoundingClientRect()
    const ratio = (ev.clientX - rect.left) / rect.width
    // 定位到thumb中心
    const thumbRatio = thumbWidth.value / 100
    const targetRatio = Math.max(0, Math.min(1 - thumbRatio, ratio - thumbRatio / 2))
    el.scrollLeft = targetRatio * (el.scrollWidth - el.clientWidth)
    updateScrollbar()
  }

  const onUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

onMounted(() => {
  // 多次延迟更新，确保表格完全渲染
  nextTick(() => {
    updateScrollbar()
    nextTick(updateScrollbar)
  })
  window.addEventListener('resize', updateScrollbar)

  // 监听容器尺寸变化
  if (scrollContainerRef.value) {
    resizeObserver = new ResizeObserver(() => updateScrollbar())
    resizeObserver.observe(scrollContainerRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollbar)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

watch(() => displayEmotions.value, () => {
  nextTick(() => {
    updateScrollbar()
    nextTick(updateScrollbar)
  })
}, { deep: true })

// 编辑状态
const editingCell = ref<{ date: string; height: number; emotion: EmotionDaily } | null>(null)
const editForm = ref({
  stockName: '',
  selectedStockId: '',
  isBreakthrough: false,
  isMedian: false,
  isIcePoint: false,
  isAnnouncement: false,
  remark: ''
})
const editInputRef = ref<HTMLInputElement | null>(null)

// 计算高度范围（从最高到1）
const heightRange = computed(() => {
  const data = displayEmotions.value
  if (data.length === 0) return []
  const maxH = Math.max(...data.map(e => e.maxBoardHeight || 0), 7)
  const range = []
  for (let i = maxH; i >= 1; i--) {
    range.push(i)
  }
  return range
})

// 动态计算单元格宽度
const cellWidth = computed(() => {
  const count = displayEmotions.value.length
  if (count <= 7) return 90
  if (count <= 10) return 80
  if (count <= 15) return 70
  if (count <= 20) return 60
  return 55
})

// 是否有现有股票
const hasExistingStock = computed(() => {
  if (!editingCell.value) return false
  const { emotion, height } = editingCell.value
  return emotion.spaceBoardStocks?.some(s => s.height === height)
})

// 检查该高度是否有股票
function hasStockAtHeight(e: EmotionDaily, h: number): boolean {
  if (!e.spaceBoardStocks) return false
  return e.spaceBoardStocks.some(s => s.height === h)
}

// 获取该高度的股票信息
function getStockAtHeight(e: EmotionDaily, h: number): SpaceBoardStock | null {
  if (!e.spaceBoardStocks) return null
  return e.spaceBoardStocks.find(s => s.height === h) || null
}

// 获取第一个股票信息（优先返回最高板的股票）
function getFirstStock(e: EmotionDaily): SpaceBoardStock | null {
  if (!e.spaceBoardStocks || e.spaceBoardStocks.length === 0) return null
  // 优先返回height等于maxBoardHeight的股票
  const maxStock = e.spaceBoardStocks.find(s => s.height === e.maxBoardHeight)
  return maxStock || e.spaceBoardStocks[0]
}

// 获取单元格样式类
function getCellClass(e: EmotionDaily, h: number, idx: number): Record<string, boolean> {
  const classes: Record<string, boolean> = {}

  if (h === e.maxBoardHeight) {
    classes['max-height'] = true
    if (e.isBreakthrough) {
      classes['breakthrough'] = true
    } else if (e.isMedian) {
      classes['median'] = true
    } else if (e.isIcePoint) {
      classes['ice-point'] = true
    }
  } else if (hasStockAtHeight(e, h)) {
    classes['has-stock'] = true
  } else if (h <= e.maxBoardHeight) {
    classes['filled'] = true
  }

  return classes
}

// 跳转到个股详情
function goToStock(e: EmotionDaily, h: number) {
  const stock = getStockAtHeight(e, h) || getFirstStock(e)
  if (!stock) return

  // 如果有关联的stockId，跳转到详情页
  if (stock.stockId) {
    router.push(`/stocks/${stock.stockId}`)
  } else {
    // 否则尝试按名称查找
    const found = stockStore.stocks.find(s => s.name === stock.name)
    if (found) {
      router.push(`/stocks/${found.id}`)
    }
  }
}

// 选择个股时自动填充名称
function onStockSelect() {
  if (editForm.value.selectedStockId) {
    const stock = stockStore.stocks.find(s => s.id === editForm.value.selectedStockId)
    if (stock) {
      editForm.value.stockName = stock.name
    }
  }
}

// 点击单元格
function handleCellClick(e: EmotionDaily, h: number) {
  editingCell.value = { date: e.date, height: h, emotion: e }

  // 获取现有股票信息
  const existingStock = getStockAtHeight(e, h) || (h === e.maxBoardHeight ? getFirstStock(e) : null)

  editForm.value = {
    stockName: existingStock?.name || '',
    selectedStockId: existingStock?.stockId || '',
    isBreakthrough: h === e.maxBoardHeight ? e.isBreakthrough : false,
    isMedian: h === e.maxBoardHeight ? e.isMedian : false,
    isIcePoint: h === e.maxBoardHeight ? e.isIcePoint : false,
    isAnnouncement: h === e.maxBoardHeight ? e.isAnnouncement : false,
    remark: e.remark || ''
  }

  // 聚焦输入框
  nextTick(() => {
    editInputRef.value?.focus()
  })
}

// 关闭编辑
function closeEdit() {
  editingCell.value = null
}

// 点击日期，标记/取消出清
function handleDateClick(e: EmotionDaily) {
  emotionStore.addOrUpdateEmotion({
    ...e,
    isClear: !e.isClear
  })
}

// 保存编辑
function saveEdit() {
  if (!editingCell.value) return

  const { emotion, height } = editingCell.value
  const stockName = editForm.value.stockName.trim()

  // 更新空间板股票列表
  const stocks: SpaceBoardStock[] = emotion.spaceBoardStocks ? [...emotion.spaceBoardStocks] : []

  // 移除同高度的旧股票
  const existingIdx = stocks.findIndex(s => s.height === height)
  if (existingIdx >= 0) {
    stocks.splice(existingIdx, 1)
  }

  // 添加新股票
  if (stockName) {
    stocks.push({
      name: stockName,
      height,
      stockId: editForm.value.selectedStockId || undefined
    })
  }

  // 计算新的最高板高度
  const maxBoardHeight = stocks.length > 0
    ? Math.max(...stocks.map(s => s.height))
    : emotion.maxBoardHeight

  // 更新情绪数据
  emotionStore.addOrUpdateEmotion({
    ...emotion,
    maxBoardHeight,
    spaceBoardStocks: stocks,
    isBreakthrough: height === maxBoardHeight ? editForm.value.isBreakthrough : emotion.isBreakthrough,
    isMedian: height === maxBoardHeight ? editForm.value.isMedian : emotion.isMedian,
    isIcePoint: height === maxBoardHeight ? editForm.value.isIcePoint : emotion.isIcePoint,
    isAnnouncement: height === maxBoardHeight ? editForm.value.isAnnouncement : emotion.isAnnouncement,
    remark: editForm.value.remark.trim()
  })

  closeEdit()
}

// 删除股票
function deleteEdit() {
  if (!editingCell.value) return

  const { emotion, height } = editingCell.value

  // 更新空间板股票列表
  const stocks: SpaceBoardStock[] = emotion.spaceBoardStocks
    ? emotion.spaceBoardStocks.filter(s => s.height !== height)
    : []

  // 计算新的最高板高度
  const maxBoardHeight = stocks.length > 0
    ? Math.max(...stocks.map(s => s.height))
    : 0

  // 更新情绪数据
  emotionStore.addOrUpdateEmotion({
    ...emotion,
    maxBoardHeight,
    spaceBoardStocks: stocks,
    isBreakthrough: false
  })

  closeEdit()
}
</script>

<style scoped>
.stair-chart {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 13px;
  font-weight: 500;
}

/* 显示范围控制 */
.stair-range-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stair-range-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stair-range-btn {
  padding: 3px 10px;
  font-size: 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.stair-range-btn:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.stair-range-btn.active {
  background: var(--color-blue);
  color: #fff;
  border-color: var(--color-blue);
}

.stair-custom-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.stair-range-input {
  width: 56px;
  padding: 3px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  text-align: center;
}

.stair-range-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

.chart-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.dot.breakthrough { background: #f85149; }
.dot.median { background: #3fb950; }
.dot.ice { background: #58a6ff; }
.dot.announcement { background: #a855f7; }
.dot.clear { background: #8b949e; }

.chart-body {
  display: flex;
  gap: 8px;
}

.height-labels {
  display: flex;
  flex-direction: column;
  padding-top: 38px;  /* 对齐表头高度 */
}

.height-label {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  color: var(--text-secondary);
  width: 36px;
}

/* 表格容器：垂直排列（表格+滚动条） */
.table-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.table-scroll {
  overflow-x: auto;
}

/* 隐藏原生滚动条 */
.table-scroll {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.table-scroll::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* 自定义拖拽滚动条 */
.custom-scrollbar {
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 5px;
  margin-top: 8px;
  position: relative;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.scrollbar-thumb {
  position: absolute;
  height: 100%;
  background: var(--color-blue);
  border-radius: 5px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.custom-scrollbar:hover .scrollbar-thumb {
  opacity: 1;
}

/* 禁用状态：内容未溢出时 */
.custom-scrollbar.is-disabled {
  cursor: default;
}

.custom-scrollbar.is-disabled .scrollbar-thumb {
  background: var(--text-tertiary);
  opacity: 0.3;
}

.custom-scrollbar.is-disabled:hover .scrollbar-thumb {
  opacity: 0.3;
}

.stair-table {
  border-collapse: collapse;
  table-layout: fixed;
}

.stair-table th,
.stair-table td {
  width: var(--cell-width, 80px);
  height: 38px;
  text-align: center;
  border: 1px solid var(--border-color);
  font-size: 12px;
  box-sizing: border-box;
}

.date-header {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  position: relative;
  height: 38px;
  line-height: 38px;
  padding: 0;
  box-sizing: border-box;
}

.date-header:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.date-header.is-clear {
  background: rgba(139, 148, 158, 0.25);
  color: #8b949e;
}

.clear-badge {
  display: inline-block;
  font-size: 9px;
  background: #8b949e;
  color: #fff;
  padding: 1px 3px;
  border-radius: 3px;
  margin-left: 2px;
  font-weight: 500;
  vertical-align: middle;
}

.cell {
  background: var(--bg-primary);
  transition: background 0.2s;
  position: relative;
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.badge-row {
  display: flex;
  gap: 2px;
}

.cell.filled {
  background: rgba(240, 192, 64, 0.1);
}

.cell.has-stock {
  background: rgba(240, 192, 64, 0.25);
}

.cell.max-height {
  background: rgba(240, 192, 64, 0.35);
  border-color: rgba(240, 192, 64, 0.5);
}

.cell.breakthrough {
  background: rgba(248, 81, 73, 0.25);
  border-color: rgba(248, 81, 73, 0.5);
}

.cell.median {
  background: rgba(63, 185, 80, 0.15);
  border-color: rgba(63, 185, 80, 0.4);
}

.cell.ice-point {
  background: rgba(88, 166, 255, 0.15);
  border-color: rgba(88, 166, 255, 0.4);
}

.median-badge {
  display: inline-block;
  font-size: 9px;
  background: #3fb950;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.ice-badge {
  display: inline-block;
  font-size: 9px;
  background: #58a6ff;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.announcement-badge {
  display: inline-block;
  font-size: 9px;
  background: #a855f7;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.stock-name {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(240, 192, 64, 0.8);
  color: #1a1a1a;
  border-radius: 3px;
  font-weight: 500;
  font-size: 11px;
  max-width: calc(var(--cell-width, 80px) - 8px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-name.clickable {
  cursor: pointer;
}

.stock-name.clickable:hover {
  background: rgba(240, 192, 64, 1);
}

.cell.breakthrough .stock-name {
  background: rgba(248, 81, 73, 0.9);
  color: #fff;
}

.cell.median .stock-name {
  background: rgba(63, 185, 80, 0.9);
  color: #fff;
}

.cell.ice-point .stock-name {
  background: rgba(88, 166, 255, 0.9);
  color: #fff;
}

.edit-hint {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.cell:hover .edit-hint {
  opacity: 1;
}

.edit-hint:hover {
  color: var(--color-blue);
}

.fill-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: rgba(240, 192, 64, 0.5);
  border-radius: 50%;
  cursor: pointer;
}

.fill-dot:hover {
  background: rgba(240, 192, 64, 0.8);
}

.add-hint {
  display: inline-block;
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
}

.add-hint:hover {
  background: var(--color-blue);
  color: #fff;
}

.empty-hint {
  text-align: center;
  padding: 40px;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 编辑弹窗 */
.edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 300px;
  max-width: 90vw;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 500;
}

.btn-close {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1;
}

.edit-body {
  padding: 16px;
}

.edit-row {
  margin-bottom: 12px;
}

.edit-row:last-child {
  margin-bottom: 0;
}

.edit-row label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.edit-row input[type="text"],
.stock-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
}

.stock-select {
  cursor: pointer;
}

.edit-row input[type="checkbox"] {
  margin-right: 6px;
}

.edit-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.edit-footer button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-primary {
  background: var(--color-blue);
  color: #fff;
}

.btn-danger {
  background: rgba(248, 81, 73, 0.2);
  color: #f85149;
}

@media (max-width: 768px) {
  .stair-table th,
  .stair-table td {
    height: 28px;
    font-size: 11px;
  }

  .stock-name {
    font-size: 10px;
  }
}
</style>
