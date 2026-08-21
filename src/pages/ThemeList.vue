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

    <!-- 题材展示（与看板一致的 ThemeTree 组件） -->
    <ThemeTree v-else :themes="displayThemes" :hide-header="true" />

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
import { type ThemeLevel, type ThemeStatus } from '@/types'
import ThemeTree from '@/components/ThemeTree.vue'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'

const themeStore = useThemeStore()
const toast = useToast()

const showAddModal = ref(false)
const searchKeyword = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const sortBy = ref('date-desc')
const activeTab = ref<'active' | 'ended' | 'all'>('active')

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

// 按标签过滤 + 排序，传给 ThemeTree 展示
const displayThemes = computed(() => {
  let list = baseFilteredThemes.value
  if (activeTab.value === 'active') {
    list = list.filter(t => !t.endDate)
  } else if (activeTab.value === 'ended') {
    list = list.filter(t => !!t.endDate)
  }
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

function getTabCount(tab: string): number {
  if (tab === 'active') return baseFilteredThemes.value.filter(t => !t.endDate).length
  if (tab === 'ended') return baseFilteredThemes.value.filter(t => !!t.endDate).length
  return baseFilteredThemes.value.length
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

/* 题材展示使用 ThemeTree 组件，无需额外卡片样式 */

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
}
</style>
