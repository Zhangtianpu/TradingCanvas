<template>
  <div class="theme-detail" v-if="theme">
    <div class="page-header">
      <div class="header-left">
        <button class="btn-ghost btn-sm" @click="$router.push('/themes')">返回</button>
        <h1 class="page-title">{{ theme.name }}</h1>
      </div>
      <div class="header-actions">
        <button class="btn-ghost btn-sm" @click="showEditModal = true">编辑</button>
        <button class="btn-danger btn-sm" @click="showDeleteConfirm = true">删除</button>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">等级</span>
          <span class="tag" :class="levelTagClass(theme.level)">{{ THEME_LEVEL_LABELS[theme.level] }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">状态</span>
          <div class="status-selector">
            <span
              v-for="s in statusOptions"
              :key="s.value"
              class="status-option"
              :class="[`status-${s.value}`, { active: theme.status === s.value }]"
              @click="changeStatus(s.value)"
            >{{ s.label }}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">板块</span>
          <span>{{ theme.sector || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">爆发日</span>
          <span>{{ theme.burstDate }}</span>
        </div>
        <div class="info-item" v-if="theme.level === 'sub'">
          <span class="info-label">所属主线</span>
          <span v-if="parentTheme">{{ parentTheme.name }}</span>
          <span v-else class="text-muted">无</span>
        </div>
      </div>
    </div>

    <!-- 分支题材 -->
    <div class="card" style="margin-bottom: 12px;" v-if="theme.level === 'main'">
      <div class="section-header">
        <span>分支题材</span>
        <button class="btn-primary btn-sm" @click="showSubThemeModal = true">添加分支</button>
      </div>
      <div v-if="subThemes.length === 0" class="empty-hint">暂无分支题材</div>
      <div v-else>
        <div v-for="sub in subThemes" :key="sub.id" class="sub-theme-row" @click="$router.push(`/themes/${sub.id}`)">
          <span class="sub-arrow">└</span>
          <span class="sub-name">{{ sub.name }}</span>
          <span class="tag" :class="statusTagClass(sub.status)">{{ THEME_STATUS_LABELS[sub.status] }}</span>
          <span class="sub-date">{{ sub.burstDate }}</span>
          <span v-if="sub.endDate" class="sub-date">~ {{ sub.endDate }}</span>
        </div>
      </div>
    </div>

    <!-- 关联个股 -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="section-header">
        <span>关联个股</span>
        <button class="btn-primary btn-sm" @click="openAddStock">添加</button>
      </div>
      <div v-if="themeStocks.length === 0" class="empty-hint">暂无个股</div>
      <div v-else>
        <div v-for="s in themeStocks" :key="s.id" class="stock-row" @click="$router.push(`/stocks/${s.id}`)">
          <span class="stock-name">{{ s.name }}</span>
          <span class="stock-code">{{ s.code }}</span>
          <span class="tag" :class="roleTagClass(s.role)">{{ STOCK_ROLE_LABELS[s.role] }}</span>
          <span v-for="tag in s.tags" :key="tag" class="tag tag-purple">{{ STOCK_TAG_LABELS[tag] }}</span>
          <span v-if="getMaxBoard(s)" class="board-count">{{ getMaxBoard(s) }}板</span>
        </div>
      </div>
    </div>

    <!-- 题材事件 -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="section-header">
        <span>题材事件</span>
        <button class="btn-ghost btn-sm" @click="showEventModal = true">添加</button>
      </div>
      <div v-if="theme.events.length === 0" class="empty-hint">暂无事件</div>
      <div v-else class="event-list">
        <div v-for="e in sortedEvents" :key="e.id" class="event-row">
          <span class="event-date">{{ e.date }}</span>
          <span class="event-content">{{ e.content }}</span>
          <button class="btn-link" @click="handleDeleteEvent(e.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <h3>编辑题材</h3>
        <div class="form-group">
          <label>题材名称</label>
          <input v-model="editForm.name" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>所属板块</label>
            <input v-model="editForm.sector" />
          </div>
          <div class="form-group">
            <label>题材等级</label>
            <select v-model="editForm.level">
              <option value="main">主线</option>
              <option value="sub">支线</option>
              <option value="rotation">轮动</option>
            </select>
          </div>
        </div>
        <!-- 支线题材选择所属主线 -->
        <div class="form-group" v-if="editForm.level === 'sub'">
          <label>所属主线</label>
          <select v-model="editForm.parentId">
            <option value="">无</option>
            <option v-for="mt in availableMainThemes" :key="mt.id" :value="mt.id">{{ mt.name }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>爆发日期</label>
            <input v-model="editForm.burstDate" type="date" />
          </div>
          <div class="form-group">
            <label>当前状态</label>
            <select v-model="editForm.status">
              <option value="burst">爆发</option>
              <option value="ferment">发酵</option>
              <option value="climax">高潮</option>
              <option value="diverge">分歧</option>
              <option value="retreat">退潮</option>
              <option value="rebound">反弹</option>
              <option value="adjust">调整</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showEditModal = false">取消</button>
          <button class="btn-primary" @click="handleEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加个股弹窗 -->
    <div v-if="showStockModal" class="modal-overlay" @click.self="showStockModal = false">
      <div class="modal">
        <h3>添加个股</h3>
        <div class="form-row">
          <div class="form-group">
            <label>股票代码</label>
            <input v-model="stockForm.code" placeholder="000001" />
          </div>
          <div class="form-group">
            <label>股票名称</label>
            <input v-model="stockForm.name" placeholder="平安银行" />
          </div>
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="stockForm.role">
            <option value="leader">龙头</option>
            <option value="mid">中军</option>
            <option value="follower">跟风</option>
            <option value="catchup">补涨</option>
          </select>
        </div>
        <div class="form-group">
          <label>标签</label>
          <div class="tag-select">
            <label v-for="(label, key) in STOCK_TAG_LABELS" :key="key" class="tag-option">
              <input type="checkbox" :value="key" v-model="stockForm.tags" />
              <span class="tag tag-purple">{{ label }}</span>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showStockModal = false">取消</button>
          <button class="btn-primary" @click="handleAddStock">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加事件弹窗 -->
    <div v-if="showEventModal" class="modal-overlay" @click.self="showEventModal = false">
      <div class="modal">
        <h3>添加事件</h3>
        <div class="form-group">
          <label>日期</label>
          <input v-model="eventForm.date" type="date" />
        </div>
        <div class="form-group">
          <label>事件内容</label>
          <textarea v-model="eventForm.content" rows="2"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showEventModal = false">取消</button>
          <button class="btn-primary" @click="handleAddEvent">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加分支题材弹窗 -->
    <div v-if="showSubThemeModal" class="modal-overlay" @click.self="showSubThemeModal = false">
      <div class="modal">
        <h3>添加分支题材</h3>
        <div class="form-group">
          <label>题材名称</label>
          <input v-model="subThemeForm.name" placeholder="分支题材名称" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>所属板块</label>
            <input v-model="subThemeForm.sector" placeholder="板块" />
          </div>
          <div class="form-group">
            <label>爆发日期</label>
            <input v-model="subThemeForm.burstDate" type="date" />
          </div>
        </div>
        <div class="form-group">
          <label>初始状态</label>
          <select v-model="subThemeForm.status">
            <option value="burst">爆发</option>
            <option value="ferment">发酵</option>
            <option value="climax">高潮</option>
            <option value="diverge">分歧</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showSubThemeModal = false">取消</button>
          <button class="btn-primary" @click="handleAddSubTheme">添加</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除题材"
      :message="`确定删除「${theme.name}」？关联个股也会被删除。`"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
  <div v-else class="empty-state">
    <p>题材不存在</p>
    <button class="btn-primary" @click="$router.push('/themes')">返回</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { THEME_LEVEL_LABELS, THEME_STATUS_LABELS, STOCK_ROLE_LABELS, STOCK_TAG_LABELS, type StockTag, type ThemeStatus } from '@/types'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const stockStore = useStockStore()
const toast = useToast()

const showEditModal = ref(false)
const showStockModal = ref(false)
const showEventModal = ref(false)
const showDeleteConfirm = ref(false)
const showSubThemeModal = ref(false)

const theme = computed(() => themeStore.getTheme(route.params.id as string))
const themeStocks = computed(() => {
  if (!theme.value) return []
  return stockStore.stocksByTheme(theme.value.id).value.sort((a, b) => {
    const order = { leader: 0, mid: 1, follower: 2, catchup: 3 }
    return order[a.role] - order[b.role]
  })
})

// 分支题材
const subThemes = computed(() => {
  if (!theme.value) return []
  return themeStore.themes
    .filter(t => t.parentId === theme.value!.id)
    .sort((a, b) => a.burstDate.localeCompare(b.burstDate))
})

// 父题材（所属主线）
const parentTheme = computed(() => {
  if (!theme.value || !theme.value.parentId) return null
  return themeStore.getTheme(theme.value.parentId)
})

// 可选择的主线题材（排除当前题材自身）
const availableMainThemes = computed(() => {
  if (!theme.value) return []
  return themeStore.themes.filter(t => t.level === 'main' && t.id !== theme.value!.id)
})

// 状态选项
const statusOptions = [
  { value: 'burst' as ThemeStatus, label: '爆发' },
  { value: 'ferment' as ThemeStatus, label: '发酵' },
  { value: 'climax' as ThemeStatus, label: '高潮' },
  { value: 'diverge' as ThemeStatus, label: '分歧' },
  { value: 'retreat' as ThemeStatus, label: '退潮' },
  { value: 'rebound' as ThemeStatus, label: '反弹' }
]

function changeStatus(status: ThemeStatus) {
  if (!theme.value) return
  themeStore.updateTheme(theme.value.id, { status })
  toast.success(`状态已改为${THEME_STATUS_LABELS[status]}`)
}

function statusTagClass(status: string) {
  const map: Record<string, string> = {
    burst: 'tag-red', ferment: 'tag-blue', climax: 'tag-gold',
    diverge: 'tag-purple', retreat: 'tag-gray', rebound: 'tag-green', adjust: 'tag-gray'
  }
  return map[status] || 'tag-gray'
}

const sortedEvents = computed(() => {
  if (!theme.value) return []
  return [...theme.value.events].sort((a, b) => b.date.localeCompare(a.date))
})

const editForm = reactive({
  name: '',
  sector: '',
  level: 'main' as const,
  status: 'burst' as const,
  burstDate: '',
  parentId: ''
})

const stockForm = reactive({
  code: '',
  name: '',
  role: 'follower' as const,
  tags: [] as StockTag[]
})

const eventForm = reactive({
  date: today(),
  content: ''
})

const subThemeForm = reactive({
  name: '',
  sector: '',
  burstDate: today(),
  status: 'ferment' as ThemeStatus
})

watch(theme, (t) => {
  if (t) {
    editForm.name = t.name
    editForm.sector = t.sector
    editForm.level = t.level
    editForm.status = t.status
    editForm.burstDate = t.burstDate
    editForm.parentId = t.parentId || ''
  }
}, { immediate: true })

function levelTagClass(level: string) {
  return level === 'main' ? 'tag-red' : level === 'sub' ? 'tag-blue' : 'tag-yellow'
}

function roleTagClass(role: string) {
  return role === 'leader' ? 'tag-gold' : role === 'mid' ? 'tag-blue' : 'tag-yellow'
}

function getMaxBoard(stock: { limitUpRecords: { boardCount: number }[] }) {
  if (stock.limitUpRecords.length === 0) return 0
  return Math.max(...stock.limitUpRecords.map(r => r.boardCount))
}

function openAddStock() {
  stockForm.code = ''
  stockForm.name = ''
  stockForm.role = 'follower'
  stockForm.tags = []
  showStockModal.value = true
}

function handleEdit() {
  if (!theme.value) return
  themeStore.updateTheme(theme.value.id, {
    name: editForm.name.trim(),
    sector: editForm.sector.trim(),
    level: editForm.level,
    status: editForm.status,
    burstDate: editForm.burstDate,
    parentId: editForm.level === 'sub' && editForm.parentId ? editForm.parentId : undefined
  })
  toast.success('已保存')
  showEditModal.value = false
}

function handleDelete() {
  if (!theme.value) return
  stockStore.deleteStocksByTheme(theme.value.id)
  themeStore.deleteTheme(theme.value.id)
  toast.success('已删除')
  router.push('/themes')
}

function handleAddStock() {
  if (!theme.value) return
  if (!stockForm.code.trim() || !stockForm.name.trim()) {
    toast.error('请输入代码和名称')
    return
  }
  stockStore.addStock({
    code: stockForm.code.trim(),
    name: stockForm.name.trim(),
    themeId: theme.value.id,
    role: stockForm.role,
    tags: stockForm.tags
  })
  toast.success('已添加')
  showStockModal.value = false
}

function handleAddEvent() {
  if (!theme.value) return
  if (!eventForm.content.trim()) {
    toast.error('请输入事件内容')
    return
  }
  themeStore.addEvent(theme.value.id, {
    date: eventForm.date,
    content: eventForm.content.trim()
  })
  toast.success('已添加')
  showEventModal.value = false
  eventForm.content = ''
  eventForm.date = today()
}

function handleDeleteEvent(eventId: string) {
  if (!theme.value) return
  themeStore.deleteEvent(theme.value.id, eventId)
  toast.success('已删除')
}

function handleAddSubTheme() {
  if (!theme.value) return
  if (!subThemeForm.name.trim()) {
    toast.error('请输入题材名称')
    return
  }
  themeStore.addTheme({
    name: subThemeForm.name.trim(),
    sector: subThemeForm.sector.trim(),
    level: 'sub',
    status: subThemeForm.status,
    parentId: theme.value.id,
    burstDate: subThemeForm.burstDate
  })
  toast.success('分支题材已添加')
  showSubThemeModal.value = false
  subThemeForm.name = ''
  subThemeForm.sector = ''
  subThemeForm.burstDate = today()
  subThemeForm.status = 'ferment'
}
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-actions {
  display: flex;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-hint {
  color: var(--text-tertiary);
  text-align: center;
  padding: 16px;
  font-size: 13px;
}

.stock-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}
.stock-row:last-child { border-bottom: none; }
.stock-row:hover { color: var(--color-blue); }
.stock-name { font-weight: 500; }
.stock-code {
  color: var(--text-tertiary);
  font-size: 12px;
}
.board-count {
  margin-left: auto;
  color: var(--color-red);
  font-size: 12px;
  font-weight: 500;
}

.event-list { font-size: 13px; }
.event-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
}
.event-row:last-child { border-bottom: none; }
.event-date {
  color: var(--text-tertiary);
  font-size: 11px;
  min-width: 70px;
}
.event-content { flex: 1; }
.btn-link {
  background: none;
  color: var(--text-tertiary);
  padding: 2px 6px;
  font-size: 11px;
}
.btn-link:hover { color: var(--color-red); }

.tag-select {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-option {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.tag-option input { display: none; }
.tag-option:has(input:checked) .tag {
  outline: 2px solid var(--color-blue);
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 状态选择器 */
.status-selector {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.status-option {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-tertiary);
  border: 1px solid var(--border-color);
  transition: all 0.15s;
}

.status-option:hover {
  color: var(--text-primary);
}

.status-option.active {
  color: #fff;
  border-color: transparent;
}

.status-option.status-burst.active { background: #f85149; }
.status-option.status-ferment.active { background: #58a6ff; }
.status-option.status-climax.active { background: #f0c040; color: #1f2328 !important; }
.status-option.status-diverge.active { background: #a371f7; }
.status-option.status-retreat.active { background: #8b949e; }
.status-option.status-rebound.active { background: #3fb950; }

/* 分支题材行 */
.sub-theme-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.sub-theme-row:last-child { border-bottom: none; }
.sub-theme-row:hover { color: var(--color-blue); }

.sub-arrow { color: var(--text-tertiary); font-size: 13px; }
.sub-name { font-weight: 500; }
.sub-date { color: var(--text-tertiary); font-size: 11px; margin-left: auto; }

.tag-gray { background: #8b949e; color: #fff; }
.tag-purple { background: #a371f7; color: #fff; }
.tag-gold { background: #f0c040; color: #1f2328; }
</style>
