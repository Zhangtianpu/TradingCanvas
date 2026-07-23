<template>
  <div class="theme-tree-container">
    <div class="tree-header">
      <span class="header-title">活跃题材</span>
      <router-link to="/themes" class="view-all">管理题材 →</router-link>
    </div>

    <div class="tree-body" v-if="mainThemes.length > 0">
      <transition-group name="theme-flip" tag="div">
      <template v-for="mainTheme in mainThemes" :key="mainTheme.id">
        <!-- 主题材时间条 -->
        <div
          class="theme-row"
          :class="{ ended: !!mainTheme.endDate, dragging: draggedThemeId === mainTheme.id, 'drag-over': dragOverThemeId === mainTheme.id }"
          draggable="true"
          @dragstart="onThemeDragStart(mainTheme.id, $event)"
          @dragend="onThemeDragEnd"
          @dragover="onThemeDragOver(mainTheme.id, $event)"
          @dragleave="onThemeDragLeave(mainTheme.id)"
          @drop="onThemeDrop(mainTheme.id, $event)"
        >
          <div class="theme-bar" :class="[getStatusClass(mainTheme.status), { ended: !!mainTheme.endDate }]">
            <!-- 左侧：题材信息 -->
            <div class="bar-left">
              <span class="collapse-toggle" @click.stop="toggleCollapse(mainTheme.id)">
                {{ collapsedThemes.has(mainTheme.id) ? '▶' : '▼' }}
              </span>
              <span class="bar-name" @click="$router.push(`/themes/${mainTheme.id}`)">{{ mainTheme.name }}</span>
              <div class="status-dropdown-wrapper" v-if="!mainTheme.endDate">
                <span class="bar-status" @click.stop="toggleStatusDropdown(mainTheme.id)">{{ getStatusLabel(mainTheme.status) }} ▾</span>
                <div class="status-dropdown" v-if="openStatusDropdown === mainTheme.id" @click.stop>
                  <div
                    v-for="s in statusOptions"
                    :key="s.value"
                    class="status-dropdown-item"
                    :class="[`shi-${s.value}`, { active: mainTheme.status === s.value }]"
                    @click.stop="selectStatus(mainTheme.id, s.value)"
                  >
                    <span class="shi-dot"></span>
                    <span>{{ s.label }}</span>
                  </div>
                </div>
              </div>
              <span v-else class="bar-status">已结束</span>
            </div>
            <!-- 中间：时间条 -->
            <div class="bar-timeline">
              <span class="tl-start editable" @click="openEditThemeDate(mainTheme)" title="点击编辑启动时间">{{ mainTheme.burstDate.slice(5) }}</span>
              <div class="tl-track">
                <div class="tl-fill" :class="{ ended: !!mainTheme.endDate }"></div>
                <!-- 状态变化节点 -->
                <template v-if="mainTheme.statusHistory && mainTheme.statusHistory.length > 0">
                  <span
                    v-for="(sh, si) in getVisibleStatusHistory(mainTheme)"
                    :key="si"
                    class="status-node"
                    :class="`node-${sh.status}`"
                    :style="getStatusNodePosition(mainTheme, sh)"
                    :title="`${sh.date.slice(5)} → ${getStatusLabel(sh.status)}`"
                  ></span>
                </template>
                <span class="tl-duration">{{ getDuration(mainTheme) }}天</span>
              </div>
              <span class="tl-end" v-if="mainTheme.endDate">{{ mainTheme.endDate.slice(5) }}</span>
              <span class="tl-end active" v-else>至今</span>
            </div>
            <!-- 右侧：操作按钮 -->
            <div class="bar-right">
              <button v-if="!mainTheme.endDate" class="btn-end" @click.stop="endTheme(mainTheme.id)">结束</button>
              <button v-else class="btn-start" @click.stop="restartTheme(mainTheme.id)">开始</button>
              <button class="btn-remove" @click.stop="removeTheme(mainTheme.id)">移除</button>
            </div>
          </div>

          <!-- 状态变更历史 -->
          <div class="status-history-bar" v-if="!collapsedThemes.has(mainTheme.id) && mainTheme.statusHistory && mainTheme.statusHistory.length > 0">
            <div class="status-history-track">
              <template v-for="(sh, si) in mainTheme.statusHistory" :key="si">
                <div class="status-history-item editable" :class="`shi-${sh.status}`" @click.stop="openEditStatusHistory(mainTheme.id, si)">
                  <span class="shi-dot"></span>
                  <span class="shi-label">{{ getStatusLabel(sh.status) }}</span>
                  <span class="shi-date">{{ sh.date.slice(5) }}</span>
                  <span class="shi-duration">{{ getStatusDuration(mainTheme, si) }}</span>
                </div>
                <span v-if="si < mainTheme.statusHistory!.length - 1" class="shi-arrow">→</span>
              </template>
              <button class="btn-add-status" @click.stop="openAddStatusHistory(mainTheme.id)" title="添加状态">+</button>
            </div>
          </div>

          <!-- 主题材个股（时间线错位排列） -->
          <div class="stocks-timeline" v-if="!collapsedThemes.has(mainTheme.id) && getThemeStocks(mainTheme.id).length > 0">
            <div class="stocks-header">
              <span class="sh-label">个股</span>
              <span class="sh-role">角色</span>
              <span class="sh-start">开始</span>
              <span class="sh-arrow">→</span>
              <span class="sh-end">结束</span>
              <span class="sh-height">高度</span>
              <span class="sh-actions">操作</span>
            </div>
            <div
              v-for="(stock, idx) in getThemeStocks(mainTheme.id)"
              :key="stock.id"
              class="stock-row"
              :class="[getStockRoleClass(stock.role), { ended: !!stock.endDate }]"
              :style="{ marginLeft: (idx * 20) + 'px' }"
            >
              <span class="stock-dot"></span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-role-tag">{{ getStockRoleLabel(stock.role) }}</span>
              <span class="stock-start editable" @click="openEditStartDate(stock)" title="点击编辑启动时间">{{ getStockStartDate(stock).slice(5) }}</span>
              <span class="stock-sep">→</span>
              <span class="stock-end" v-if="stock.endDate">{{ stock.endDate.slice(5) }}</span>
              <span class="stock-end active" v-else>进行中</span>
              <span class="stock-height" v-if="getMaxBoardHeight(stock) > 0">{{ getMaxBoardHeight(stock) }}板</span>
              <span class="stock-actions">
                <button v-if="!stock.endDate" class="btn-end sm" @click.stop="endStock(stock.id)">结束</button>
                <button v-else class="btn-start sm" @click.stop="restartStock(stock.id)">开始</button>
                <button class="btn-remove sm" @click.stop="removeStock(stock.id)">移除</button>
              </span>
            </div>
          </div>

          <!-- 分支题材 -->
          <div class="sub-themes" v-if="!collapsedThemes.has(mainTheme.id) && getSubThemes(mainTheme.id).length > 0">
            <div
              v-for="subTheme in getSubThemes(mainTheme.id)"
              :key="subTheme.id"
              class="sub-theme-row"
              :class="{ ended: !!subTheme.endDate }"
            >
              <div class="sub-theme-bar" :class="[getStatusClass(subTheme.status), { ended: !!subTheme.endDate }]">
                <div class="bar-left">
                  <span class="sub-arrow">└</span>
                  <span class="collapse-toggle small" @click.stop="toggleCollapse(subTheme.id)">
                    {{ collapsedThemes.has(subTheme.id) ? '▶' : '▼' }}
                  </span>
                  <span class="bar-name small" @click="$router.push(`/themes/${subTheme.id}`)">{{ subTheme.name }}</span>
                  <div class="status-dropdown-wrapper" v-if="!subTheme.endDate">
                    <span class="bar-status small" @click.stop="toggleStatusDropdown(subTheme.id)">{{ getStatusLabel(subTheme.status) }} ▾</span>
                    <div class="status-dropdown" v-if="openStatusDropdown === subTheme.id" @click.stop>
                      <div
                        v-for="s in statusOptions"
                        :key="s.value"
                        class="status-dropdown-item"
                        :class="[`shi-${s.value}`, { active: subTheme.status === s.value }]"
                        @click.stop="selectStatus(subTheme.id, s.value)"
                      >
                        <span class="shi-dot"></span>
                        <span>{{ s.label }}</span>
                      </div>
                    </div>
                  </div>
                  <span v-else class="bar-status small">已结束</span>
                </div>
                <div class="bar-timeline small">
                  <span class="tl-start editable" @click="openEditThemeDate(subTheme)" title="点击编辑启动时间">{{ subTheme.burstDate.slice(5) }}</span>
                  <div class="tl-track">
                    <div class="tl-fill" :class="{ ended: !!subTheme.endDate }"></div>
                    <!-- 状态变化节点 -->
                    <template v-if="subTheme.statusHistory && subTheme.statusHistory.length > 0">
                      <span
                        v-for="(sh, si) in getVisibleStatusHistory(subTheme)"
                        :key="si"
                        class="status-node"
                        :class="`node-${sh.status}`"
                        :style="getStatusNodePosition(subTheme, sh)"
                        :title="`${sh.date.slice(5)} → ${getStatusLabel(sh.status)}`"
                      ></span>
                    </template>
                  </div>
                  <span class="tl-end" v-if="subTheme.endDate">{{ subTheme.endDate.slice(5) }}</span>
                  <span class="tl-end active" v-else>至今</span>
                </div>
                <div class="bar-right">
                  <button v-if="!subTheme.endDate" class="btn-end sm" @click.stop="endTheme(subTheme.id)">结束</button>
                  <button v-else class="btn-start sm" @click.stop="restartTheme(subTheme.id)">开始</button>
                  <button class="btn-remove sm" @click.stop="removeTheme(subTheme.id)">移除</button>
                </div>
              </div>

              <!-- 分支题材状态变更历史 -->
              <div class="status-history-bar sub-history" v-if="!collapsedThemes.has(subTheme.id) && subTheme.statusHistory && subTheme.statusHistory.length > 0">
                <div class="status-history-track">
                  <template v-for="(sh, si) in subTheme.statusHistory" :key="si">
                    <div class="status-history-item editable" :class="`shi-${sh.status}`" @click.stop="openEditStatusHistory(subTheme.id, si)">
                      <span class="shi-dot"></span>
                      <span class="shi-label">{{ getStatusLabel(sh.status) }}</span>
                      <span class="shi-date">{{ sh.date.slice(5) }}</span>
                      <span class="shi-duration">{{ getStatusDuration(subTheme, si) }}</span>
                    </div>
                    <span v-if="si < subTheme.statusHistory!.length - 1" class="shi-arrow">→</span>
                  </template>
                  <button class="btn-add-status" @click.stop="openAddStatusHistory(subTheme.id)" title="添加状态">+</button>
                </div>
              </div>

              <!-- 分支题材个股 -->
              <div class="stocks-timeline sub-stocks" v-if="!collapsedThemes.has(subTheme.id) && getThemeStocks(subTheme.id).length > 0">
                <div
                  v-for="(stock, idx) in getThemeStocks(subTheme.id)"
                  :key="stock.id"
                  class="stock-row"
                  :class="[getStockRoleClass(stock.role), { ended: !!stock.endDate }]"
                  :style="{ marginLeft: (idx * 20) + 'px' }"
                >
                  <span class="stock-dot"></span>
                  <span class="stock-name">{{ stock.name }}</span>
                  <span class="stock-role-tag">{{ getStockRoleLabel(stock.role) }}</span>
                  <span class="stock-start editable" @click="openEditStartDate(stock)" title="点击编辑启动时间">{{ getStockStartDate(stock).slice(5) }}</span>
                  <span class="stock-sep">→</span>
                  <span class="stock-end" v-if="stock.endDate">{{ stock.endDate.slice(5) }}</span>
                  <span class="stock-end active" v-else>进行中</span>
                  <span class="stock-height" v-if="getMaxBoardHeight(stock) > 0">{{ getMaxBoardHeight(stock) }}板</span>
                  <span class="stock-actions">
                    <button v-if="!stock.endDate" class="btn-end sm" @click.stop="endStock(stock.id)">结束</button>
                    <button v-else class="btn-start sm" @click.stop="restartStock(stock.id)">开始</button>
                    <button class="btn-remove sm" @click.stop="removeStock(stock.id)">移除</button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      </transition-group>
    </div>

    <!-- 无题材提示 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-text">暂无活跃题材</div>
      <router-link to="/themes"><button class="btn-primary">添加题材</button></router-link>
    </div>

    <!-- 图例 -->
    <div class="tree-footer" v-if="mainThemes.length > 0">
      <div class="legend">
        <span class="legend-item"><span class="dot leader"></span>龙头</span>
        <span class="legend-item"><span class="dot mid"></span>中军</span>
        <span class="legend-item"><span class="dot follower"></span>跟风</span>
        <span class="legend-sep">|</span>
        <span class="legend-item"><span class="bar-sample burst"></span>爆发</span>
        <span class="legend-item"><span class="bar-sample ferment"></span>发酵</span>
        <span class="legend-item"><span class="bar-sample climax"></span>高潮</span>
        <span class="legend-item"><span class="bar-sample ended"></span>已结束</span>
      </div>
    </div>

    <!-- 编辑启动时间弹窗 -->
    <div class="edit-modal" v-if="editingStock" @click.self="editingStock = null">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">编辑启动时间</span>
          <span class="modal-stock">{{ editingStock.name }}</span>
        </div>
        <div class="modal-body">
          <label class="input-label">启动日期</label>
          <input type="date" v-model="editStartDate" class="date-input" />
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="editingStock = null">取消</button>
          <button class="btn-save" @click="saveStartDate">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑题材启动时间弹窗 -->
    <div class="edit-modal" v-if="editingTheme" @click.self="editingTheme = null">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">编辑题材启动时间</span>
          <span class="modal-stock">{{ editingTheme.name }}</span>
        </div>
        <div class="modal-body">
          <label class="input-label">启动日期</label>
          <input type="date" v-model="editThemeDate" class="date-input" />
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="editingTheme = null">取消</button>
          <button class="btn-save" @click="saveThemeDate">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑状态历史弹窗 -->
    <div class="edit-modal" v-if="editingStatusHistory" @click.self="editingStatusHistory = null">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">{{ editingStatusHistory.isNew ? '添加状态记录' : '编辑状态记录' }}</span>
        </div>
        <div class="modal-body">
          <label class="input-label">状态类型</label>
          <select v-model="editingStatusHistory.status" class="date-input">
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <label class="input-label" style="margin-top: 12px;">变更日期</label>
          <input type="date" v-model="editingStatusHistory.date" class="date-input" />
        </div>
        <div class="modal-footer">
          <button v-if="!editingStatusHistory.isNew" class="btn-danger-sm" @click="deleteStatusHistory">删除</button>
          <button class="btn-cancel" @click="editingStatusHistory = null">取消</button>
          <button class="btn-save" @click="saveStatusHistory">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import type { Theme, ThemeStatus, StockRole, Stock, StatusHistory } from '@/types'

const themeStore = useThemeStore()
const stockStore = useStockStore()

const activeStatuses: ThemeStatus[] = ['burst', 'ferment', 'climax', 'diverge', 'retreat', 'rebound']

// 折叠状态
const collapsedThemes = ref(new Set<string>())

function toggleCollapse(themeId: string) {
  if (collapsedThemes.value.has(themeId)) {
    collapsedThemes.value.delete(themeId)
  } else {
    collapsedThemes.value.add(themeId)
  }
  collapsedThemes.value = new Set(collapsedThemes.value)
}

// 状态下拉菜单
const openStatusDropdown = ref<string | null>(null)
const statusOptions = [
  { value: 'burst' as ThemeStatus, label: '爆发' },
  { value: 'ferment' as ThemeStatus, label: '发酵' },
  { value: 'climax' as ThemeStatus, label: '高潮' },
  { value: 'diverge' as ThemeStatus, label: '分歧' },
  { value: 'retreat' as ThemeStatus, label: '退潮' },
  { value: 'rebound' as ThemeStatus, label: '反弹' }
]

function toggleStatusDropdown(themeId: string) {
  openStatusDropdown.value = openStatusDropdown.value === themeId ? null : themeId
}

function selectStatus(themeId: string, status: ThemeStatus) {
  const theme = themeStore.getTheme(themeId)
  if (!theme || theme.status === status) {
    openStatusDropdown.value = null
    return
  }
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const history = theme.statusHistory ? [...theme.statusHistory] : []
  history.push({ status, date: dateStr })
  themeStore.updateTheme(themeId, { status, statusHistory: history })
  openStatusDropdown.value = null
}

// 点击外部关闭下拉菜单
function closeDropdown() {
  openStatusDropdown.value = null
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

// 编辑启动时间
const editingStock = ref<Stock | null>(null)
const editStartDate = ref('')

// 编辑题材启动时间
const editingTheme = ref<Theme | null>(null)
const editThemeDate = ref('')

function openEditStartDate(stock: Stock) {
  editingStock.value = stock
  editStartDate.value = getStockStartDate(stock)
}

function saveStartDate() {
  if (editingStock.value && editStartDate.value) {
    stockStore.updateStock(editingStock.value.id, { startDate: editStartDate.value })
    editingStock.value = null
  }
}

function openEditThemeDate(theme: Theme) {
  editingTheme.value = theme
  editThemeDate.value = theme.burstDate
}

function saveThemeDate() {
  if (editingTheme.value && editThemeDate.value) {
    themeStore.updateTheme(editingTheme.value.id, { burstDate: editThemeDate.value })
    editingTheme.value = null
  }
}

// 编辑状态历史
const editingStatusHistory = ref<{ themeId: string; index: number; status: ThemeStatus; date: string; isNew?: boolean } | null>(null)

function openEditStatusHistory(themeId: string, index: number) {
  const theme = themeStore.getTheme(themeId)
  if (!theme || !theme.statusHistory || index >= theme.statusHistory.length) return
  const sh = theme.statusHistory[index]
  editingStatusHistory.value = { themeId, index, status: sh.status, date: sh.date, isNew: false }
}

function openAddStatusHistory(themeId: string) {
  editingStatusHistory.value = { themeId, index: -1, status: 'burst', date: new Date().toISOString().slice(0, 10), isNew: true }
}

function saveStatusHistory() {
  if (!editingStatusHistory.value) return
  const { themeId, index, status, date, isNew } = editingStatusHistory.value
  const theme = themeStore.getTheme(themeId)
  if (!theme) return

  let history = [...(theme.statusHistory || [])]
  if (isNew) {
    history.push({ status, date })
  } else {
    history[index] = { status, date }
  }

  // 按时间排序
  history.sort((a, b) => a.date.localeCompare(b.date))

  const updates: Partial<Theme> = { statusHistory: history }
  // 更新当前状态为最新的状态
  if (history.length > 0) {
    updates.status = history[history.length - 1].status
  }

  themeStore.updateTheme(themeId, updates)
  editingStatusHistory.value = null
}

function deleteStatusHistory() {
  if (!editingStatusHistory.value) return
  const { themeId, index } = editingStatusHistory.value
  const theme = themeStore.getTheme(themeId)
  if (!theme || !theme.statusHistory) return

  let history = theme.statusHistory.filter((_, i) => i !== index)

  // 按时间排序（确保顺序正确）
  history.sort((a, b) => a.date.localeCompare(b.date))

  const updates: Partial<Theme> = { statusHistory: history }
  // 更新当前状态为最新的状态
  if (history.length > 0) {
    updates.status = history[history.length - 1].status
  }

  themeStore.updateTheme(themeId, updates)
  editingStatusHistory.value = null
}

const mainThemes = computed(() => {
  // 使用store原始顺序（拖拽排序后的顺序），不按日期重排
  return themeStore.themes
    .filter(t => activeStatuses.includes(t.status) && t.level === 'main')
})

function getSubThemes(parentId: string) {
  return [...themeStore.themes]
    .filter(t => activeStatuses.includes(t.status) && t.parentId === parentId)
    .sort((a, b) => a.burstDate.localeCompare(b.burstDate))
}

function getThemeStocks(themeId: string) {
  return stockStore.stocks
    .filter(s => s.themeId === themeId)
    .sort((a, b) => {
      const aDate = getStockStartDate(a)
      const bDate = getStockStartDate(b)
      return aDate.localeCompare(bDate)
    })
}

function getStockStartDate(stock: Stock) {
  if (stock.startDate) return stock.startDate
  if (stock.limitUpRecords && stock.limitUpRecords.length > 0) {
    const sorted = [...stock.limitUpRecords].sort((a, b) => a.date.localeCompare(b.date))
    return sorted[0].date
  }
  return stock.createdAt.slice(0, 10)
}

function getMaxBoardHeight(stock: Stock) {
  if (!stock.limitUpRecords || stock.limitUpRecords.length === 0) return 0
  return Math.max(...stock.limitUpRecords.map(r => r.boardCount))
}

// 获取可见的状态历史（排除第一个，因为第一个是初始状态）
function getVisibleStatusHistory(theme: Theme): StatusHistory[] {
  if (!theme.statusHistory || theme.statusHistory.length === 0) return []
  return theme.statusHistory
}

// 计算状态节点在时间条上的位置
function getStatusNodePosition(theme: Theme, sh: StatusHistory): Record<string, string> {
  const start = new Date(theme.burstDate)
  const end = theme.endDate ? new Date(theme.endDate) : new Date()
  const nodeDate = new Date(sh.date)
  const total = end.getTime() - start.getTime()
  if (total <= 0) return { left: '0%' }
  const offset = nodeDate.getTime() - start.getTime()
  const percent = Math.max(0, Math.min(100, (offset / total) * 100))
  return { left: percent + '%' }
}

function endTheme(themeId: string) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  // 结束当前题材
  themeStore.updateTheme(themeId, { endDate: dateStr })
  // 级联结束其下所有未结束的分支题材，使用相同结束日期
  const subs = themeStore.themes.filter(t => t.parentId === themeId && !t.endDate)
  subs.forEach(sub => {
    themeStore.updateTheme(sub.id, { endDate: dateStr })
  })
}

function restartTheme(themeId: string) {
  // 重启当前题材
  themeStore.updateTheme(themeId, { endDate: undefined })
  // 级联重启其下所有已结束的分支题材
  const subs = themeStore.themes.filter(t => t.parentId === themeId && t.endDate)
  subs.forEach(sub => {
    themeStore.updateTheme(sub.id, { endDate: undefined })
  })
}

function removeTheme(themeId: string) {
  themeStore.updateTheme(themeId, { status: 'adjust' })
}

function endStock(stockId: string) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  stockStore.updateStock(stockId, { endDate: dateStr })
}

function restartStock(stockId: string) {
  stockStore.updateStock(stockId, { endDate: undefined })
}

function removeStock(stockId: string) {
  stockStore.deleteStock(stockId)
}

function getStatusLabel(status: ThemeStatus) {
  const labels: Record<ThemeStatus, string> = {
    burst: '爆发', ferment: '发酵', climax: '高潮',
    diverge: '分歧', retreat: '退潮', rebound: '反弹', adjust: '调整'
  }
  return labels[status]
}

function getStatusClass(status: ThemeStatus) {
  return `status-${status}`
}

function getStockRoleLabel(role: StockRole) {
  const labels: Record<StockRole, string> = {
    leader: '龙头', mid: '中军', follower: '跟风', catchup: '补涨'
  }
  return labels[role]
}

function getStockRoleClass(role: StockRole) {
  return `role-${role}`
}

function getDuration(theme: Theme) {
  const start = new Date(theme.burstDate)
  const end = theme.endDate ? new Date(theme.endDate) : new Date()
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? days : 1
}

function getStatusDuration(theme: Theme, index: number) {
  if (!theme.statusHistory || index >= theme.statusHistory.length) return ''
  const history = theme.statusHistory
  const start = new Date(history[index].date)
  let end: Date
  if (index < history.length - 1) {
    end = new Date(history[index + 1].date)
  } else {
    end = theme.endDate ? new Date(theme.endDate) : new Date()
  }
  // 计算交易日数量（排除周末）
  let tradingDays = 0
  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 排除周日(0)和周六(6)
      tradingDays++
    }
    current.setDate(current.getDate() + 1)
  }
  tradingDays = Math.max(tradingDays, 1)
  return `${tradingDays}天`
}

// ===== 题材拖拽排序 =====
const draggedThemeId = ref<string | null>(null)
const dragOverThemeId = ref<string | null>(null)

function onThemeDragStart(themeId: string, e: DragEvent) {
  draggedThemeId.value = themeId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', themeId)
  }
}

function onThemeDragEnd() {
  draggedThemeId.value = null
  dragOverThemeId.value = null
}

function onThemeDragOver(themeId: string, e: DragEvent) {
  e.preventDefault()
  if (draggedThemeId.value && draggedThemeId.value !== themeId) {
    dragOverThemeId.value = themeId
  }
}

function onThemeDragLeave(themeId: string) {
  if (dragOverThemeId.value === themeId) {
    dragOverThemeId.value = null
  }
}

function onThemeDrop(targetId: string, e: DragEvent) {
  e.preventDefault()
  if (!draggedThemeId.value || draggedThemeId.value === targetId) return
  themeStore.reorderThemes(draggedThemeId.value, targetId)
  draggedThemeId.value = null
  dragOverThemeId.value = null
}
</script>

<style scoped>
.theme-tree-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.header-title { font-size: 15px; font-weight: 600; }
.view-all { font-size: 12px; color: var(--color-blue); text-decoration: none; }
.view-all:hover { text-decoration: underline; }
.tree-body { padding: 12px; }

/* 主题材行 */
.theme-row { margin-bottom: 14px; }
.theme-row.ended { opacity: 0.6; }
.theme-row.dragging { opacity: 0.5; }
.theme-row[draggable="true"] { cursor: grab; }
.theme-row[draggable="true"]:active { cursor: grabbing; }

/* 时间条 */
.theme-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border-left: 4px solid transparent;
  background: var(--bg-tertiary);
}

.bar-left { display: flex; align-items: center; gap: 8px; min-width: 120px; }

.collapse-toggle {
  font-size: 10px;
  color: var(--text-tertiary);
  cursor: pointer;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
  transition: color 0.15s;
}

.collapse-toggle:hover {
  color: var(--text-primary);
}

.bar-name { font-size: 15px; font-weight: 600; cursor: pointer; transition: color 0.2s; }
.bar-name:hover { color: var(--color-blue); }
.bar-name.small { font-size: 13px; }

.bar-status {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  color: #fff; font-weight: 500; white-space: nowrap; cursor: pointer;
  transition: filter 0.15s;
}
.bar-status:hover { filter: brightness(1.15); }
.bar-status.small { font-size: 10px; padding: 1px 6px; }

/* 时间轴 */
.bar-timeline {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bar-timeline.small { gap: 6px; }

.tl-start, .tl-end {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  font-weight: 500;
}

.tl-start.editable {
  cursor: pointer;
  color: var(--color-blue);
  transition: color 0.15s;
}

.tl-start.editable:hover {
  color: #79c0ff;
  text-decoration: underline;
}

.tl-end.active { color: #3fb950; }

.tl-track {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  min-width: 40px;
}

.tl-fill {
  height: 100%;
  width: 100%;
  border-radius: 4px;
  transition: all 0.3s;
}

.tl-fill.ended {
  background: #8b949e !important;
}

.tl-duration {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  white-space: nowrap;
}

/* 状态变化节点 */
.status-node {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
  z-index: 2;
  cursor: pointer;
  transition: transform 0.15s;
}

.status-node:hover {
  transform: translate(-50%, -50%) scale(1.4);
}

.node-burst { background: #f85149; }
.node-ferment { background: #58a6ff; }
.node-climax { background: #f0c040; }
.node-diverge { background: #a371f7; }
.node-retreat { background: #8b949e; }
.node-rebound { background: #3fb950; }

/* 状态变更历史条 */
.status-history-bar {
  margin-left: 18px;
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.status-history-track {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.status-history-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-history-item.editable {
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
}

.status-history-item.editable:hover {
  filter: brightness(1.3);
  transform: scale(1.05);
}

.btn-add-status {
  padding: 2px 8px;
  margin-left: 8px;
  border-radius: 4px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add-status:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
  background: rgba(88,166,255,0.1);
}

.shi-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.shi-label {
  color: var(--text-primary);
}

.shi-date {
  color: var(--text-tertiary);
  font-size: 10px;
}

.shi-duration {
  font-size: 9px;
  color: var(--text-secondary);
  margin-left: 4px;
  padding: 1px 4px;
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.shi-arrow {
  color: var(--text-tertiary);
  font-size: 11px;
}

.shi-burst { background: rgba(248,81,73,0.12); }
.shi-burst .shi-dot { background: #f85149; }
.shi-ferment { background: rgba(88,166,255,0.12); }
.shi-ferment .shi-dot { background: #58a6ff; }
.shi-climax { background: rgba(240,192,64,0.12); }
.shi-climax .shi-dot { background: #f0c040; }
.shi-diverge { background: rgba(163,113,247,0.12); }
.shi-diverge .shi-dot { background: #a371f7; }
.shi-retreat { background: rgba(139,148,158,0.12); }
.shi-retreat .shi-dot { background: #8b949e; }
.shi-rebound { background: rgba(63,185,80,0.12); }
.shi-rebound .shi-dot { background: #3fb950; }

.status-history-bar.sub-history {
  margin-left: 36px;
  padding: 6px 10px;
}

.collapse-toggle.small {
  font-size: 9px;
}

/* 状态下拉菜单 */
.status-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.status-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  z-index: 100;
  min-width: 90px;
  overflow: hidden;
}

.status-dropdown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.status-dropdown-item:hover {
  background: var(--bg-tertiary);
}

.status-dropdown-item.active {
  font-weight: 600;
  color: var(--color-blue);
}

.bar-right { display: flex; align-items: center; gap: 4px; }

/* 按钮 */
.btn-end, .btn-start, .btn-remove {
  padding: 3px 10px; font-size: 11px; background: transparent;
  border: 1px solid var(--border-color); border-radius: 4px;
  cursor: pointer; color: var(--text-secondary); transition: all 0.15s; white-space: nowrap;
}
.btn-end.sm, .btn-start.sm, .btn-remove.sm { padding: 2px 8px; font-size: 10px; }

.btn-end:hover { background: rgba(248,81,73,0.1); border-color: #f85149; color: #f85149; }
.btn-start:hover { background: rgba(63,185,80,0.1); border-color: #3fb950; color: #3fb950; }
.btn-remove:hover { background: rgba(139,148,158,0.15); border-color: #8b949e; color: #f85149; }

/* 已结束状态 */
.theme-bar.ended, .sub-theme-bar.ended {
  background: var(--bg-primary);
  border-left-color: #8b949e !important;
}
.theme-bar.ended .bar-status, .sub-theme-bar.ended .bar-status { background: #8b949e !important; }
.theme-bar.ended .bar-name, .sub-theme-bar.ended .bar-name { text-decoration: line-through; color: var(--text-tertiary); }

/* 个股时间线 */
.stocks-timeline {
  margin-left: 18px;
  margin-top: 8px;
  padding-left: 14px;
  border-left: 2px dashed var(--border-color);
}

.sub-stocks { margin-left: 18px; }

/* 个股表头 */
.stocks-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 6px 0;
  font-size: 10px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 4px;
}

.sh-label { min-width: 60px; }
.sh-role { min-width: 36px; }
.sh-start { min-width: 36px; }
.sh-arrow { min-width: 8px; }
.sh-end { min-width: 36px; }
.sh-height { min-width: 30px; }
.sh-actions { margin-left: auto; }

.stock-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
  color: var(--text-secondary);
  transition: opacity 0.2s;
}

.stock-row.ended { opacity: 0.5; }

.stock-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--bg-secondary); }
.stock-name { font-weight: 500; color: var(--text-primary); min-width: 60px; }

.stock-role-tag {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  font-weight: 600; white-space: nowrap; min-width: 36px; text-align: center;
}

.stock-start, .stock-end { font-size: 11px; color: var(--text-tertiary); min-width: 36px; }
.stock-start.editable {
  cursor: pointer;
  color: var(--color-blue);
  transition: color 0.15s;
}
.stock-start.editable:hover {
  color: #79c0ff;
  text-decoration: underline;
}
.stock-end.active { color: #3fb950; font-weight: 500; }
.stock-sep { color: var(--text-tertiary); font-size: 10px; }

.stock-height {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  background: rgba(240,192,64,0.2); color: #f0c040; font-weight: 600; min-width: 30px; text-align: center;
}

.stock-actions { margin-left: auto; display: flex; gap: 2px; }

.stock-row.ended .stock-name { text-decoration: line-through; }

/* 分支题材 */
.sub-themes { margin-left: 18px; margin-top: 8px; }
.sub-theme-row { margin-bottom: 8px; }
.sub-theme-row.ended { opacity: 0.6; }

.sub-theme-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid transparent;
  background: var(--bg-primary);
}

.sub-arrow { color: var(--text-tertiary); font-size: 13px; }

/* 角色颜色 */
.role-leader .stock-dot { background: #f0c040; border-color: #f0c040; }
.role-leader .stock-role-tag { background: #f0c040; color: #1f2328; }
.role-mid .stock-dot { background: #58a6ff; border-color: #58a6ff; }
.role-mid .stock-role-tag { background: #58a6ff; color: #fff; }
.role-follower .stock-dot { background: #8b949e; border-color: #8b949e; }
.role-follower .stock-role-tag { background: #8b949e; color: #fff; }
.role-catchup .stock-dot { background: #a371f7; border-color: #a371f7; }
.role-catchup .stock-role-tag { background: #a371f7; color: #fff; }

/* 状态颜色 - 时间条填充 */
.status-burst { border-left-color: #f85149; }
.status-burst .bar-status { background: #f85149; }
.status-burst .tl-fill { background: linear-gradient(90deg, #f85149, #ff7b72); }

.status-ferment { border-left-color: #58a6ff; }
.status-ferment .bar-status { background: #58a6ff; }
.status-ferment .tl-fill { background: linear-gradient(90deg, #58a6ff, #79c0ff); }

.status-climax { border-left-color: #f0c040; }
.status-climax .bar-status { background: #f0c040; color: #1f2328; }
.status-climax .tl-fill { background: linear-gradient(90deg, #f0c040, #ffd700); }

.status-diverge { border-left-color: #a371f7; }
.status-diverge .bar-status { background: #a371f7; }
.status-diverge .tl-fill { background: linear-gradient(90deg, #a371f7, #c297ff); }

.status-retreat { border-left-color: #8b949e; }
.status-retreat .bar-status { background: #8b949e; }
.status-retreat .tl-fill { background: #8b949e; }

.status-rebound { border-left-color: #3fb950; }
.status-rebound .bar-status { background: #3fb950; }
.status-rebound .tl-fill { background: linear-gradient(90deg, #3fb950, #56d364); }

/* 底部图例 */
.tree-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.legend {
  display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;
}

.legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); }
.legend-sep { color: var(--text-tertiary); margin: 0 4px; }

.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.leader { background: #f0c040; }
.dot.mid { background: #58a6ff; }
.dot.follower { background: #8b949e; }

.bar-sample { width: 20px; height: 8px; border-radius: 2px; }
.bar-sample.burst { background: linear-gradient(90deg, #f85149, #ff7b72); }
.bar-sample.ferment { background: linear-gradient(90deg, #58a6ff, #79c0ff); }
.bar-sample.climax { background: linear-gradient(90deg, #f0c040, #ffd700); }
.bar-sample.ended { background: #8b949e; }

/* 空状态 */
.empty-state { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-text { color: var(--text-tertiary); margin-bottom: 16px; }

/* 编辑弹窗 */
.edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 320px;
  max-width: 90vw;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
}

.modal-stock {
  font-size: 13px;
  color: var(--color-blue);
  font-weight: 500;
}

.modal-body {
  padding: 16px;
}

.input-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.date-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  outline: none;
}

.date-input:focus {
  border-color: var(--color-blue);
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel, .btn-save {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-danger-sm {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  background: rgba(248,81,73,0.15);
  border: 1px solid rgba(248,81,73,0.3);
  color: #f85149;
  margin-right: auto;
}

.btn-danger-sm:hover {
  background: rgba(248,81,73,0.25);
}

.btn-save {
  background: var(--color-blue);
  border: none;
  color: #fff;
}

.btn-save:hover {
  filter: brightness(1.1);
}

/* 拖拽排序动画 */
.theme-flip-move {
  transition: transform 0.4s ease;
}

.theme-row.dragging {
  opacity: 0.4;
  transform: scale(0.98);
}

.theme-row.drag-over {
  border-top: 2px solid var(--color-blue);
  margin-top: 4px;
}

@media (max-width: 768px) {
  .theme-bar { flex-wrap: wrap; gap: 8px; padding: 10px; }
  .bar-left { min-width: 100px; }
  .bar-timeline { flex: 1 1 100%; order: 3; }
  .bar-name { font-size: 13px; }
  .stocks-timeline { margin-left: 10px; }
  .stock-name { min-width: 50px; }
  .sub-themes { margin-left: 10px; }
  .legend { gap: 8px; }
  .stock-row { flex-wrap: wrap; }
  .stock-actions { margin-left: 0; }
}
</style>