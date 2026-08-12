<template>
  <div class="stair-chart">
    <div class="chart-header">
      <div class="title-wrapper">
        <input
          v-if="editingTitle"
          v-model="customTitle"
          class="title-input"
          @blur="saveTitle"
          @keyup.enter="saveTitle"
          @keyup.esc="cancelEditTitle"
          ref="titleInputRef"
        />
        <span v-else class="chart-title clickable" @click="startEditTitle" title="点击修改名称">
          {{ displayTitle }}
          <span class="edit-icon">✎</span>
        </span>
      </div>
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
        <div class="height-adjust">
          <button class="height-btn" @click="addHeightLevel" title="增加板高">+</button>
          <button class="height-btn" @click="removeHeightLevel" title="减少板高">−</button>
        </div>
      </div>
      <!-- 表格主体 -->
      <div class="table-container">
        <!-- 表格（含高度输入行，同步滚动） -->
        <div class="table-wrapper">
          <div class="table-scroll" ref="scrollContainerRef" @scroll="onScroll">
            <!-- 高度计算输入行（与表格同步滚动） -->
            <div class="height-input-bar" :style="{ width: displayEmotions.length * cellWidth + 'px' }">
              <input
                v-for="e in displayEmotions"
                :key="e.id"
                type="text"
                :value="getHeightCalc(e)"
                @change="(ev) => updateHeightCalc(e, (ev.target as HTMLInputElement).value)"
                @mousedown.stop
                draggable="false"
                class="height-input"
                :style="{ width: cellWidth + 'px' }"
                :placeholder="String(e.maxBoardHeight)"
                title="高度计算结果（如4进5，不影响表格）"
              />
            </div>
            <table class="stair-table" :style="{ '--cell-width': cellWidth + 'px', width: displayEmotions.length * cellWidth + 'px' }">
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
                        <div class="badge-row">
                          <span v-if="getStockAtHeight(e, h)?.isAnnouncement" class="announcement-badge">公</span>
                          <span v-if="getStockAtHeight(e, h)?.isIcePoint" class="ice-badge">冰</span>
                          <span v-if="getStockAtHeight(e, h)?.isMedian" class="median-badge">中</span>
                          <span v-if="getStockAtHeight(e, h)?.isBreakthrough" class="breakthrough-badge">突</span>
                          <span v-if="getStockAtHeight(e, h)?.isSpaceFirst" class="space-first-badge">先</span>
                          <span v-if="getStockAtHeight(e, h)?.isSpace" class="space-badge">空</span>
                          <span v-if="getStockAtHeight(e, h)?.isNextDayBroken" class="broken-badge">炸</span>
                          <span v-if="getStockAtHeight(e, h)?.isNextDayNoPremium" class="no-premium-badge">无</span>
                          <span v-if="getStockAtHeight(e, h)?.isNextDayPremium" class="premium-badge">溢</span>
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
                          <span v-if="getFirstStock(e)?.isAnnouncement" class="announcement-badge">公</span>
                          <span v-if="getFirstStock(e)?.isIcePoint" class="ice-badge">冰</span>
                          <span v-if="getFirstStock(e)?.isMedian" class="median-badge">中</span>
                          <span v-if="getFirstStock(e)?.isBreakthrough" class="breakthrough-badge">突</span>
                          <span v-if="getFirstStock(e)?.isSpaceFirst" class="space-first-badge">先</span>
                          <span v-if="getFirstStock(e)?.isSpace" class="space-badge">空</span>
                          <span v-if="getFirstStock(e)?.isNextDayBroken" class="broken-badge">炸</span>
                          <span v-if="getFirstStock(e)?.isNextDayNoPremium" class="no-premium-badge">无</span>
                          <span v-if="getFirstStock(e)?.isNextDayPremium" class="premium-badge">溢</span>
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
          <div class="tag-grid">
            <div class="tag-col">
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
                  <input type="checkbox" v-model="editForm.isAnnouncement" />
                  公告标记
                </label>
              </div>
              <div class="edit-row">
                <label>
                  <input type="checkbox" v-model="editForm.isIcePoint" />
                  冰点标记
                </label>
              </div>
            </div>
            <div class="tag-col">
              <div class="edit-row">
                <label>
                  <input type="checkbox" v-model="editForm.isNextDayBroken" />
                  次日炸板
                </label>
              </div>
              <div class="edit-row">
                <label>
                  <input type="checkbox" v-model="editForm.isNextDayNoPremium" />
                  次日无溢价
                </label>
              </div>
              <div class="edit-row">
                <label>
                  <input type="checkbox" v-model="editForm.isNextDayPremium" />
                  次日有溢价
                </label>
              </div>
            </div>
            <div class="tag-col">
              <div class="edit-row">
                <label>
                  <input type="checkbox" v-model="editForm.isSpaceFirst" />
                  空间板先手
                </label>
              </div>
              <div class="edit-row">
                <label>
                  <input type="checkbox" v-model="editForm.isSpace" />
                  空间板
                </label>
              </div>
            </div>
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
  title?: string
  chartId?: string
}>()

// 自定义标题（支持持久化，每个chartId独立存储）
const storageKey = computed(() => `stairChartTitle_${props.chartId || props.title || 'default'}`)
const customTitle = ref('')
const editingTitle = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)

// 从localStorage加载自定义标题
function loadCustomTitle() {
  const saved = localStorage.getItem(storageKey.value)
  customTitle.value = saved || props.title || '连板楼梯图'
}

// 显示标题：优先显示自定义标题
const displayTitle = computed(() => customTitle.value || props.title || '连板楼梯图')

// 兼容旧代码
const title = computed(() => displayTitle.value)

function startEditTitle() {
  editingTitle.value = true
  customTitle.value = displayTitle.value
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function saveTitle() {
  const trimmed = customTitle.value.trim()
  if (trimmed) {
    localStorage.setItem(storageKey.value, trimmed)
    customTitle.value = trimmed
  } else {
    // 空值时恢复默认
    localStorage.removeItem(storageKey.value)
    customTitle.value = props.title || '连板楼梯图'
  }
  editingTitle.value = false
}

function cancelEditTitle() {
  editingTitle.value = false
  customTitle.value = displayTitle.value
}

// 初始化加载
loadCustomTitle()

const router = useRouter()
const emotionStore = useEmotionStore()
const stockStore = useStockStore()

// ===== 独立标签管理系统 =====
// 每个图表实例独立存储标签数据，不共享
interface TagFlags {
  isBreakthrough: boolean
  isMedian: boolean
  isIcePoint: boolean
  isAnnouncement: boolean
  isSpaceFirst: boolean
  isSpace: boolean
  isNextDayBroken: boolean
  isNextDayNoPremium: boolean
  isNextDayPremium: boolean
}

const tagStorageKey = computed(() => `stairChartTags_${props.chartId || 'default'}`)
const tagOverrides = ref<Record<string, Record<string, TagFlags>>>({})

// 从localStorage加载标签覆盖数据
function loadTagOverrides() {
  const saved = localStorage.getItem(tagStorageKey.value)
  if (saved) {
    try {
      tagOverrides.value = JSON.parse(saved)
    } catch {
      tagOverrides.value = {}
    }
  }
}

// 保存标签覆盖数据到localStorage
function persistTagOverrides() {
  localStorage.setItem(tagStorageKey.value, JSON.stringify(tagOverrides.value))
  // 通知其他组件标签已更新
  window.dispatchEvent(new CustomEvent('stairChartTagsUpdated', { detail: { chartId: props.chartId } }))
}

// 生成个股标签的key
function getStockTagKey(stockName: string, height: number): string {
  return `${stockName}_${height}`
}

// 获取某只股票的标签覆盖
function getStockTags(date: string, stockName: string, height: number): TagFlags | null {
  const dateTags = tagOverrides.value[date]
  if (!dateTags) return null
  return dateTags[getStockTagKey(stockName, height)] || null
}

// 设置某只股票的标签覆盖
function setStockTags(date: string, stockName: string, height: number, tags: TagFlags) {
  if (!tagOverrides.value[date]) {
    tagOverrides.value[date] = {}
  }
  tagOverrides.value[date][getStockTagKey(stockName, height)] = tags
  persistTagOverrides()
}

// 删除某只股票的标签覆盖
function removeStockTags(date: string, stockName: string, height: number) {
  if (tagOverrides.value[date]) {
    delete tagOverrides.value[date][getStockTagKey(stockName, height)]
    persistTagOverrides()
  }
}

// 合并基础数据和标签覆盖
function applyTagOverrides(e: EmotionDaily, stock: SpaceBoardStock | null): SpaceBoardStock | null {
  if (!stock) return null
  const tags = getStockTags(e.date, stock.name, stock.height)
  if (tags) {
    return {
      ...stock,
      isBreakthrough: tags.isBreakthrough,
      isMedian: tags.isMedian,
      isIcePoint: tags.isIcePoint,
      isAnnouncement: tags.isAnnouncement,
      isSpaceFirst: tags.isSpaceFirst,
      isSpace: tags.isSpace,
      isNextDayBroken: tags.isNextDayBroken,
      isNextDayNoPremium: tags.isNextDayNoPremium,
      isNextDayPremium: tags.isNextDayPremium
    }
  }
  // 没有覆盖表时使用基础数据中的标签
  return stock
}

// 初始化加载标签数据
loadTagOverrides()

// ===== 独立高度计算存储 =====
// 每个图表实例独立存储heightCalc，不共享
const heightCalcStorageKey = computed(() => `stairChartHeightCalc_${props.chartId || 'default'}`)
const heightCalcOverrides = ref<Record<string, string>>({})

function loadHeightCalcOverrides() {
  const saved = localStorage.getItem(heightCalcStorageKey.value)
  if (saved) {
    try {
      heightCalcOverrides.value = JSON.parse(saved)
    } catch {
      heightCalcOverrides.value = {}
    }
  }
}

function persistHeightCalcOverrides() {
  localStorage.setItem(heightCalcStorageKey.value, JSON.stringify(heightCalcOverrides.value))
}

// 获取某日的高度计算值（优先使用独立覆盖表）
function getHeightCalc(e: EmotionDaily): string {
  return heightCalcOverrides.value[e.date] ?? e.heightCalc ?? ''
}

// 更新高度计算结果（独立存储，不共享）
function updateHeightCalc(e: EmotionDaily, value: string) {
  heightCalcOverrides.value[e.date] = value.trim()
  persistHeightCalcOverrides()
}

// 初始化加载高度计算数据
loadHeightCalcOverrides()

// 连板楼梯图独立的显示范围控制
const timeRanges = [
  { label: '10天', value: 10 },
  { label: '20天', value: 20 },
  { label: '30天', value: 30 },
  { label: '60天', value: 60 },
  { label: '全部', value: 'all' }
]
const stairRange = ref<number | string>(20)
const customStairRange = ref<number | null>(null)

// 根据独立 range 截取的显示数据（props.emotions 为从旧到新的全部数据）
const displayEmotions = computed(() => {
  if (stairRange.value === 'all') {
    return props.emotions
  }
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
  
  // 强制重新计算布局
  el.offsetHeight // 触发 reflow
  
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
  // 拖动时也需要更新 thumb 位置（提供视觉反馈）
  updateScrollbar()
}

function onScrollbarMouseDown(e: MouseEvent) {
  const el = scrollContainerRef.value
  const bar = scrollbarRef.value
  const thumb = bar?.querySelector('.scrollbar-thumb') as HTMLElement | null
  if (!el || !bar || !showScrollbar.value) return
  
  // 判断点击位置是否在 thumb 上
  const barRect = bar.getBoundingClientRect()
  const clickX = e.clientX - barRect.left
  const thumbWidthPx = (thumbWidth.value / 100) * barRect.width
  const thumbLeftPx = (thumbLeft.value / 100) * barRect.width
  
  let dragStartScrollLeft = el.scrollLeft
  let dragStartClientX = e.clientX
  
  if (clickX >= thumbLeftPx && clickX <= thumbLeftPx + thumbWidthPx) {
    // 点击在 thumb 上：记录 thumb 内偏移，实现精准拖动
    const thumbOffset = clickX - thumbLeftPx
    dragStartScrollLeft = el.scrollLeft
    dragStartClientX = e.clientX
    
    isDragging.value = true
    e.preventDefault()
    document.body.style.userSelect = 'none'
    
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartClientX
      // 将像素位移转换为滚动比例
      const maxScroll = el.scrollWidth - el.clientWidth
      // thumb 可移动范围 = 轨道宽度 - thumb 宽度
      const thumbMovablePx = barRect.width - thumbWidthPx
      if (thumbMovablePx <= 0) return
      // 滚动量 = 像素位移 × (最大滚动量 / thumb可移动范围)
      const scrollDelta = dx * (maxScroll / thumbMovablePx)
      el.scrollLeft = Math.max(0, Math.min(maxScroll, dragStartScrollLeft + scrollDelta))
    }
    
    const onUp = () => {
      isDragging.value = false
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  } else {
    // 点击在轨道空白处：跳转使该位置位于 thumb 中心
    const thumbCenterRatio = clickX / barRect.width - thumbWidth.value / 200
    const targetRatio = Math.max(0, Math.min(1 - thumbWidth.value / 100, thumbCenterRatio))
    const maxScroll = el.scrollWidth - el.clientWidth
    el.scrollLeft = targetRatio * maxScroll
  }
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
  isSpaceFirst: false,
  isSpace: false,
  isNextDayBroken: false,
  isNextDayNoPremium: false,
  isNextDayPremium: false,
  remark: ''
})
const editInputRef = ref<HTMLInputElement | null>(null)

// 手动增加的额外高度层级
const extraHeight = ref(0)

// 计算高度范围：基于实际股票高度、maxBoardHeight 和手动调整的最大值
const heightRange = computed(() => {
  const data = displayEmotions.value
  if (data.length === 0) return []
  // 取所有股票的最大高度和 maxBoardHeight 中的最大值，最低7板
  let maxH = 7
  for (const e of data) {
    if (e.maxBoardHeight > maxH) maxH = e.maxBoardHeight
    if (e.spaceBoardStocks) {
      for (const s of e.spaceBoardStocks) {
        if (s.height > maxH) maxH = s.height
      }
    }
  }
  // 加上手动增加的层级
  maxH += extraHeight.value
  const range = []
  for (let i = maxH; i >= 1; i--) {
    range.push(i)
  }
  return range
})

// 增加高度层级
function addHeightLevel() {
  extraHeight.value++
}

// 减少高度层级
function removeHeightLevel() {
  if (extraHeight.value > 0) {
    extraHeight.value--
  }
}

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

// 获取该高度的股票信息（合并独立标签）
function getStockAtHeight(e: EmotionDaily, h: number): SpaceBoardStock | null {
  if (!e.spaceBoardStocks) return null
  const stock = e.spaceBoardStocks.find(s => s.height === h) || null
  return applyTagOverrides(e, stock)
}

// 获取第一个股票信息（优先返回最高板的股票，合并独立标签）
function getFirstStock(e: EmotionDaily): SpaceBoardStock | null {
  if (!e.spaceBoardStocks || e.spaceBoardStocks.length === 0) return null
  // 优先返回height等于maxBoardHeight的股票
  const maxStock = e.spaceBoardStocks.find(s => s.height === e.maxBoardHeight)
  return applyTagOverrides(e, maxStock || e.spaceBoardStocks[0])
}

// 获取单元格样式类
function getCellClass(e: EmotionDaily, h: number, idx: number): Record<string, boolean> {
  const classes: Record<string, boolean> = {}
  const stock = getStockAtHeight(e, h) || (h === e.maxBoardHeight ? getFirstStock(e) : null)

  if (stock) {
    classes['has-stock'] = true
    if (h === e.maxBoardHeight) {
      classes['max-height'] = true
    }
    // 从股票对象读取标签
    if (stock.isBreakthrough) {
      classes['breakthrough'] = true
    } else if (stock.isMedian) {
      classes['median'] = true
    } else if (stock.isIcePoint) {
      classes['ice-point'] = true
    }
    if (stock.isAnnouncement) {
      classes['announcement'] = true
    }
    if (stock.isSpaceFirst) {
      classes['space-first'] = true
    }
    if (stock.isSpace) {
      classes['space-board'] = true
    }
    if (stock.isNextDayBroken) {
      classes['next-day-broken'] = true
    }
    if (stock.isNextDayNoPremium) {
      classes['next-day-no-premium'] = true
    }
    if (stock.isNextDayPremium) {
      classes['next-day-premium'] = true
    }
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
    // 从股票对象读取标签（如果存在）
    isBreakthrough: existingStock?.isBreakthrough || false,
    isMedian: existingStock?.isMedian || false,
    isIcePoint: existingStock?.isIcePoint || false,
    isAnnouncement: existingStock?.isAnnouncement || false,
    isSpaceFirst: existingStock?.isSpaceFirst || false,
    isSpace: existingStock?.isSpace || false,
    isNextDayBroken: existingStock?.isNextDayBroken || false,
    isNextDayNoPremium: existingStock?.isNextDayNoPremium || false,
    isNextDayPremium: existingStock?.isNextDayPremium || false,
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

  // 更新空间板股票列表（基础数据共享，不含标签）
  const stocks: SpaceBoardStock[] = emotion.spaceBoardStocks ? [...emotion.spaceBoardStocks] : []

  // 移除同高度的旧股票
  const existingIdx = stocks.findIndex(s => s.height === height)
  if (existingIdx >= 0) {
    stocks.splice(existingIdx, 1)
  }

  // 添加新股票（基础数据，标签独立存储）
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

  // 更新情绪数据（基础数据，不含标签）
  emotionStore.addOrUpdateEmotion({
    ...emotion,
    maxBoardHeight,
    spaceBoardStocks: stocks,
    remark: editForm.value.remark.trim()
  })

  // 保存标签到独立的覆盖表（每个图表实例独立）
  if (stockName) {
    setStockTags(emotion.date, stockName, height, {
      isBreakthrough: editForm.value.isBreakthrough,
      isMedian: editForm.value.isMedian,
      isIcePoint: editForm.value.isIcePoint,
      isAnnouncement: editForm.value.isAnnouncement,
      isSpaceFirst: editForm.value.isSpaceFirst,
      isSpace: editForm.value.isSpace,
      isNextDayBroken: editForm.value.isNextDayBroken,
      isNextDayNoPremium: editForm.value.isNextDayNoPremium,
      isNextDayPremium: editForm.value.isNextDayPremium
    })
  }

  closeEdit()
}

// 删除股票
function deleteEdit() {
  if (!editingCell.value) return

  const { emotion, height } = editingCell.value

  // 获取要删除的股票名称（用于清理标签覆盖）
  const stockToDelete = emotion.spaceBoardStocks?.find(s => s.height === height)

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
    spaceBoardStocks: stocks
  })

  // 删除该图表实例中该股票的标签覆盖
  if (stockToDelete) {
    removeStockTags(emotion.date, stockToDelete.name, height)
  }

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

.chart-title.clickable {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.chart-title.clickable:hover {
  background: var(--bg-tertiary);
}

.edit-icon {
  font-size: 11px;
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.2s;
}

.chart-title.clickable:hover .edit-icon {
  opacity: 1;
}

.title-wrapper {
  display: flex;
  align-items: center;
}

.title-input {
  font-size: 13px;
  font-weight: 500;
  padding: 2px 6px;
  background: var(--bg-primary);
  border: 1px solid var(--color-blue);
  border-radius: 4px;
  color: var(--text-primary);
  outline: none;
  width: 160px;
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
  padding-top: 70px;  /* 对齐高度输入行(32px) + 表头(38px) */
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

.height-adjust {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  justify-content: center;
  width: 36px;
}

.height-btn {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.height-btn:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
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

/* 高度输入行（与表格同步滚动） */
.height-input-bar {
  display: flex;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.height-input {
  height: 28px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  text-align: center;
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 500;
  box-sizing: border-box;
  flex-shrink: 0;
  -webkit-user-select: text;
  user-select: text;
}

.height-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

.height-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

.height-input:hover {
  border-color: var(--color-blue);
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

.cell.announcement {
  border-color: rgba(168, 85, 247, 0.5);
}

.cell.space-first {
  background: rgba(255, 140, 0, 0.2);
  border-color: rgba(255, 140, 0, 0.5);
}

.cell.space-board {
  background: rgba(0, 191, 255, 0.15);
  border-color: rgba(0, 191, 255, 0.4);
}

.cell.next-day-broken {
  background: rgba(255, 69, 0, 0.2);
  border-color: rgba(255, 69, 0, 0.5);
}

.cell.next-day-no-premium {
  background: rgba(128, 128, 128, 0.2);
  border-color: rgba(128, 128, 128, 0.5);
}

.cell.next-day-premium {
  background: rgba(255, 215, 0, 0.2);
  border-color: rgba(255, 215, 0, 0.5);
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

.breakthrough-badge {
  display: inline-block;
  font-size: 9px;
  background: #f85149;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.space-first-badge {
  display: inline-block;
  font-size: 9px;
  background: #ff8c00;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.space-badge {
  display: inline-block;
  font-size: 9px;
  background: #00bfff;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.broken-badge {
  display: inline-block;
  font-size: 9px;
  background: #ff4500;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.no-premium-badge {
  display: inline-block;
  font-size: 9px;
  background: #808080;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.premium-badge {
  display: inline-block;
  font-size: 9px;
  background: #ffd700;
  color: #1a1a1a;
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

.cell.announcement .stock-name {
  background: rgba(168, 85, 247, 0.9);
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
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  flex: 1;
}

.tag-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-col .edit-row {
  margin-bottom: 8px;
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
