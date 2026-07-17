<template>
  <div class="theme-list-page">
    <div class="page-header">
      <h1 class="page-title">题材管理</h1>
      <div class="header-actions">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索题材..."
        />
        <button class="btn-primary" @click="showAddModal = true">新建</button>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <span class="tab-count">{{ getTabCount(tab.value) }}</span>
      </button>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <select v-model="filterLevel" class="filter-select">
        <option value="">全部等级</option>
        <option value="main">主线</option>
        <option value="sub">支线</option>
        <option value="rotation">轮动</option>
      </select>
      <select v-model="filterStatus" class="filter-select">
        <option value="">全部状态</option>
        <option value="burst">爆发</option>
        <option value="ferment">发酵</option>
        <option value="climax">高潮</option>
        <option value="diverge">分歧</option>
        <option value="retreat">退潮</option>
        <option value="rebound">反弹</option>
        <option value="adjust">调整</option>
      </select>
      <select v-model="sortBy" class="filter-select">
        <option value="date-desc">日期 ↓</option>
        <option value="date-asc">日期 ↑</option>
        <option value="name">名称</option>
      </select>
    </div>

    <!-- 空状态 -->
    <div v-if="displayThemes.length === 0" class="empty-state card">
      <p>暂无题材</p>
      <button class="btn-primary" @click="showAddModal = true">添加题材</button>
    </div>

    <!-- 运行中 & 全部：主线分组展示 -->
    <div v-else-if="activeTab !== 'ended'" class="theme-groups">
      <template v-for="group in groupedThemes" :key="group.key">
        <!-- 主线分组 -->
        <div v-if="group.themes.length > 0" class="theme-group">
          <div class="group-header" @click="toggleGroup(group.key)">
            <span class="group-toggle">{{ collapsedGroups.has(group.key) ? '▶' : '▼' }}</span>
            <span class="group-title">{{ group.title }}</span>
            <span class="group-count">{{ group.themes.length }}</span>
          </div>
          <div v-if="!collapsedGroups.has(group.key)" class="group-body">
            <div
              v-for="t in group.themes"
              :key="t.id"
              class="theme-card"
              :class="{ 'is-ended': !!t.endDate }"
              @click="$router.push(`/themes/${t.id}`)"
            >
              <div class="card-left">
                <span class="status-dot" :class="`dot-${t.status}`"></span>
              </div>
              <div class="card-main">
                <div class="card-title-row">
                  <span class="theme-name">{{ t.name }}</span>
                  <span class="tag tag-sm" :class="levelTagClass(t.level)">{{ THEME_LEVEL_LABELS[t.level] }}</span>
                  <span class="tag tag-sm" :class="statusTagClass(t.status)">{{ THEME_STATUS_LABELS[t.status] }}</span>
                </div>
                <div class="card-info-row">
                  <span class="info-item" v-if="t.sector">{{ t.sector }}</span>
                  <span class="info-item">{{ t.burstDate }}</span>
                  <span v-if="t.endDate" class="info-item ended-text">~ {{ t.endDate }}</span>
                  <span v-if="getLeader(t.id)" class="info-item leader-text">
                    {{ getLeader(t.id)?.name }}
                  </span>
                </div>
              </div>
              <div class="card-right">
                <span class="stock-count">{{ stockStore.stocksByTheme(t.id).value.length }}只</span>
                <button
                  v-if="!t.endDate"
                  class="btn-action btn-end"
                  @click.stop="endTheme(t)"
                  title="结束题材"
                >结束</button>
                <button
                  v-else
                  class="btn-action btn-restart"
                  @click.stop="restartTheme(t)"
                  title="重新开始"
                >重启</button>
              </div>
              <!-- 支线题材 -->
              <div v-if="getSubThemes(t.id).length > 0" class="sub-themes" @click.stop>
                <div
                  v-for="sub in getSubThemes(t.id)"
                  :key="sub.id"
                  class="sub-theme-card"
                  @click="$router.push(`/themes/${sub.id}`)"
                >
                  <span class="sub-arrow">└</span>
                  <span class="sub-status-dot" :class="`dot-${sub.status}`"></span>
                  <span class="sub-theme-name">{{ sub.name }}</span>
                  <span class="tag tag-sm" :class="statusTagClass(sub.status)">{{ THEME_STATUS_LABELS[sub.status] }}</span>
                  <span class="sub-theme-date">{{ sub.burstDate }}</span>
                  <span class="sub-theme-count">{{ stockStore.stocksByTheme(sub.id).value.length }}只</span>
                  <button
                    v-if="!sub.endDate"
                    class="btn-action btn-end btn-xs"
                    @click.stop="endTheme(sub)"
                  >结束</button>
                  <button
                    v-else
                    class="btn-action btn-restart btn-xs"
                    @click.stop="restartTheme(sub)"
                  >重启</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 已结束：列表展示 -->
    <div v-else class="ended-list">
      <div
        v-for="t in displayThemes"
        :key="t.id"
        class="theme-card ended-card"
        @click="$router.push(`/themes/${t.id}`)"
      >
        <div class="card-left">
          <span class="status-dot" :class="`dot-${t.status}`"></span>
        </div>
        <div class="card-main">
          <div class="card-title-row">
            <span class="theme-name">{{ t.name }}</span>
            <span class="tag tag-sm" :class="levelTagClass(t.level)">{{ THEME_LEVEL_LABELS[t.level] }}</span>
          </div>
          <div class="card-info-row">
            <span class="info-item">{{ t.burstDate }}</span>
            <span class="info-item ended-text">~ {{ t.endDate }}</span>
            <span v-if="getLeader(t.id)" class="info-item leader-text">{{ getLeader(t.id)?.name }}</span>
            <span class="info-item">{{ stockStore.stocksByTheme(t.id).value.length }}只</span>
          </div>
        </div>
        <div class="card-right">
          <button class="btn-action btn-restart" @click.stop="restartTheme(t)">重启</button>
        </div>
      </div>
    </div>

    <!-- 新建题材弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <h3>新建题材</h3>
        <div class="form-group">
          <label>题材名称</label>
          <input v-model="form.name" placeholder="如：AI算力" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>所属板块</label>
            <input v-model="form.sector" placeholder="如：科技" />
          </div>
          <div class="form-group">
            <label>题材等级</label>
            <select v-model="form.level">
              <option value="main">主线</option>
              <option value="sub">支线</option>
              <option value="rotation">轮动</option>
            </select>
          </div>
        </div>
        <div class="form-group" v-if="form.level === 'sub'">
          <label>所属主线</label>
          <select v-model="form.parentId">
            <option value="">无</option>
            <option v-for="mt in mainThemes" :key="mt.id" :value="mt.id">{{ mt.name }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>爆发日期</label>
            <input v-model="form.burstDate" type="date" />
          </div>
          <div class="form-group">
            <label>当前状态</label>
            <select v-model="form.status">
              <option value="burst">爆发</option>
              <option value="ferment">发酵</option>
              <option value="climax">高潮</option>
              <option value="diverge">分歧</option>
              <option value="retreat">退潮</option>
              <option value="adjust">调整</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showAddModal = false">取消</button>
          <button class="btn-primary" @click="handleAdd">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { THEME_LEVEL_LABELS, THEME_STATUS_LABELS, type Theme, type ThemeLevel, type ThemeStatus } from '@/types'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'

const themeStore = useThemeStore()
const stockStore = useStockStore()
const toast = useToast()

const showAddModal = ref(false)
const searchKeyword = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const sortBy = ref('date-desc')
const activeTab = ref<'active' | 'ended' | 'all'>('active')
const collapsedGroups = ref(new Set<string>())

const tabs = [
  { value: 'active' as const, label: '运行中' },
  { value: 'ended' as const, label: '已结束' },
  { value: 'all' as const, label: '全部' }
]

const form = reactive({
  name: '',
  sector: '',
  level: 'main' as ThemeLevel,
  status: 'burst' as ThemeStatus,
  burstDate: today(),
  parentId: ''
})

const mainThemes = computed(() => {
  return themeStore.themes.filter(t => t.level === 'main')
})

// 搜索+筛选后的题材
const baseFilteredThemes = computed(() => {
  return themeStore.themes.filter(t => {
    if (searchKeyword.value && !t.name.includes(searchKeyword.value)) return false
    if (filterLevel.value && t.level !== filterLevel.value) return false
    if (filterStatus.value && t.status !== filterStatus.value) return false
    return true
  })
})

// 按标签过滤
const displayThemes = computed(() => {
  let list = baseFilteredThemes.value
  if (activeTab.value === 'active') {
    list = list.filter(t => !t.endDate)
  } else if (activeTab.value === 'ended') {
    list = list.filter(t => !!t.endDate)
  }
  // 排序
  const sorted = [...list]
  if (sortBy.value === 'date-desc') {
    sorted.sort((a, b) => b.burstDate.localeCompare(a.burstDate))
  } else if (sortBy.value === 'date-asc') {
    sorted.sort((a, b) => a.burstDate.localeCompare(b.burstDate))
  } else if (sortBy.value === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  }
  return sorted
})

// 分组展示：主线题材 + 其下支线，轮动题材单独一组，无主线支线单独一组
const groupedThemes = computed(() => {
  const themes = displayThemes.value
  const groups: { key: string; title: string; themes: Theme[] }[] = []

  // 主线题材组
  const mainList = themes.filter(t => t.level === 'main')
  if (mainList.length > 0) {
    groups.push({ key: 'main', title: '主线题材', themes: mainList })
  }

  // 轮动题材组
  const rotationList = themes.filter(t => t.level === 'rotation')
  if (rotationList.length > 0) {
    groups.push({ key: 'rotation', title: '轮动题材', themes: rotationList })
  }

  // 无主线支线题材组
  const orphanSubList = themes.filter(t => t.level === 'sub' && !t.parentId)
  if (orphanSubList.length > 0) {
    groups.push({ key: 'orphan-sub', title: '其他支线', themes: orphanSubList })
  }

  return groups
})

function getTabCount(tab: string): number {
  if (tab === 'active') return baseFilteredThemes.value.filter(t => !t.endDate).length
  if (tab === 'ended') return baseFilteredThemes.value.filter(t => !!t.endDate).length
  return baseFilteredThemes.value.length
}

function getLeader(themeId: string) {
  return stockStore.stocks.find(s => s.themeId === themeId && s.role === 'leader')
}

function getSubThemes(themeId: string): Theme[] {
  return displayThemes.value
    .filter(t => t.parentId === themeId)
    .sort((a, b) => a.burstDate.localeCompare(b.burstDate))
}

function toggleGroup(key: string) {
  if (collapsedGroups.value.has(key)) {
    collapsedGroups.value.delete(key)
  } else {
    collapsedGroups.value.add(key)
  }
  // 触发响应式更新
  collapsedGroups.value = new Set(collapsedGroups.value)
}

function levelTagClass(level: string) {
  return level === 'main' ? 'tag-red' : level === 'sub' ? 'tag-blue' : 'tag-yellow'
}

function statusTagClass(status: string) {
  const map: Record<string, string> = {
    burst: 'tag-red', ferment: 'tag-blue', climax: 'tag-gold',
    diverge: 'tag-purple', retreat: 'tag-gray', rebound: 'tag-green', adjust: 'tag-gray'
  }
  return map[status] || 'tag-gray'
}

function endTheme(t: Theme) {
  const date = today()
  themeStore.updateTheme(t.id, { endDate: date })
  // 如果是主线，级联结束其下所有未结束的支线
  if (t.level === 'main') {
    const subs = themeStore.themes.filter(s => s.parentId === t.id && !s.endDate)
    subs.forEach(sub => {
      themeStore.updateTheme(sub.id, { endDate: date })
    })
    if (subs.length > 0) {
      toast.success(`${t.name} 及 ${subs.length} 个支线已结束`)
      return
    }
  }
  toast.success(`${t.name} 已结束`)
}

function restartTheme(t: Theme) {
  themeStore.updateTheme(t.id, { endDate: undefined })
  // 如果是主线，级联重启其下所有支线
  if (t.level === 'main') {
    const subs = themeStore.themes.filter(s => s.parentId === t.id && s.endDate)
    subs.forEach(sub => {
      themeStore.updateTheme(sub.id, { endDate: undefined })
    })
    if (subs.length > 0) {
      toast.success(`${t.name} 及 ${subs.length} 个支线已重启`)
      return
    }
  }
  toast.success(`${t.name} 已重启`)
}

function handleAdd() {
  if (!form.name.trim()) {
    toast.error('请输入题材名称')
    return
  }
  themeStore.addTheme({
    name: form.name.trim(),
    sector: form.sector.trim(),
    level: form.level,
    status: form.status,
    burstDate: form.burstDate,
    parentId: form.level === 'sub' && form.parentId ? form.parentId : undefined
  })
  toast.success('已创建')
  showAddModal.value = false
  form.name = ''
  form.sector = ''
  form.level = 'main'
  form.status = 'burst'
  form.burstDate = today()
  form.parentId = ''
}
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  width: 160px;
  padding: 6px 10px;
  font-size: 13px;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}

.tab-item {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--color-blue);
  border-bottom-color: var(--color-blue);
}

.tab-count {
  font-size: 11px;
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 8px;
  color: var(--text-tertiary);
}

.tab-item.active .tab-count {
  background: rgba(88, 166, 255, 0.15);
  color: var(--color-blue);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-select {
  padding: 6px 10px;
  font-size: 13px;
}

/* 分组 */
.theme-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.theme-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
}

.group-toggle {
  font-size: 10px;
  color: var(--text-tertiary);
  width: 12px;
}

.group-title {
  color: var(--text-primary);
}

.group-count {
  font-size: 11px;
  background: var(--bg-primary);
  padding: 1px 8px;
  border-radius: 8px;
  color: var(--text-secondary);
}

.group-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 题材卡片 */
.theme-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  position: relative;
}

.theme-card:hover {
  border-color: var(--color-blue);
  background: var(--bg-tertiary);
}

.theme-card.is-ended {
  opacity: 0.6;
}

.ended-card {
  margin-bottom: 6px;
}

.card-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-top: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-burst { background: #f85149; }
.dot-ferment { background: #58a6ff; }
.dot-climax { background: #f0c040; }
.dot-diverge { background: #a371f7; }
.dot-retreat { background: #8b949e; }
.dot-rebound { background: #3fb950; }
.dot-adjust { background: #6e7681; }

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.theme-name {
  font-weight: 600;
  font-size: 14px;
}

.tag-sm {
  font-size: 11px;
  padding: 1px 6px;
}

.card-info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.leader-text {
  color: var(--color-gold);
  font-weight: 500;
}

.ended-text {
  color: var(--text-tertiary);
}

.card-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 8px;
}

/* 操作按钮 */
.btn-action {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: transparent;
  transition: all 0.15s;
}

.btn-action:hover {
  border-color: transparent;
}

.btn-end {
  color: var(--text-secondary);
}

.btn-end:hover {
  background: rgba(139, 148, 158, 0.2);
  color: var(--text-primary);
}

.btn-restart {
  color: var(--color-green);
}

.btn-restart:hover {
  background: rgba(63, 185, 80, 0.15);
}

.btn-xs {
  padding: 1px 8px;
  font-size: 10px;
}

/* 支线题材 */
.sub-themes {
  flex-basis: 100%;
  margin-top: 4px;
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-theme-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.sub-theme-card:hover {
  background: var(--bg-tertiary);
}

.sub-arrow {
  color: var(--text-tertiary);
  font-size: 11px;
}

.sub-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.sub-theme-name {
  font-weight: 500;
}

.sub-theme-date {
  color: var(--text-tertiary);
  font-size: 10px;
  margin-left: auto;
}

.sub-theme-count {
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 6px;
}

/* 已结束列表 */
.ended-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* tag 补充 */
.tag-gray {
  background: rgba(139, 148, 158, 0.15);
  color: var(--text-secondary);
}

.tag-gold {
  background: rgba(240, 192, 64, 0.15);
  color: var(--color-gold);
}

.tag-purple {
  background: rgba(163, 113, 247, 0.15);
  color: #a371f7;
}

@media (max-width: 768px) {
  .header-actions {
    flex-wrap: wrap;
  }
  .search-input {
    flex: 1;
    min-width: 100px;
  }
  .filter-bar {
    flex-wrap: wrap;
  }
  .filter-select {
    flex: 1;
    min-width: 80px;
  }
  .sub-themes {
    padding-left: 12px;
  }
}
</style>
