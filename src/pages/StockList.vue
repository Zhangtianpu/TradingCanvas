<template>
  <div class="stock-list-page">
    <div class="page-header">
      <h1 class="page-title">个股复盘</h1>
      <div class="header-actions">
        <select v-model="filterRole" class="filter-select">
          <option value="">全部角色</option>
          <option value="leader">龙头</option>
          <option value="mid">中军</option>
          <option value="follower">跟风</option>
          <option value="catchup">补涨</option>
        </select>
        <select v-model="filterTheme" class="filter-select">
          <option value="">全部题材</option>
          <option v-for="t in themeStore.themes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="filteredStocks.length === 0" class="empty-state card">
      <p>暂无个股</p>
      <p class="hint">在题材详情页添加个股</p>
    </div>

    <div v-else class="stock-list">
      <div v-for="s in filteredStocks" :key="s.id" class="card stock-card" @click="$router.push(`/stocks/${s.id}`)">
        <div class="stock-header">
          <span class="stock-name">{{ s.name }}</span>
          <span class="stock-code">{{ s.code }}</span>
          <span class="tag" :class="roleTagClass(s.role)">{{ STOCK_ROLE_LABELS[s.role] }}</span>
          <span v-for="tag in s.tags" :key="tag" class="tag tag-purple">{{ STOCK_TAG_LABELS[tag] }}</span>
        </div>
        <div class="stock-meta">
          <span>{{ getThemeName(s.themeId) }}</span>
          <span v-if="getMaxBoard(s)" class="board-count">{{ getMaxBoard(s) }}板</span>
          <span class="record-count">{{ s.limitUpRecords.length }}条</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStockStore } from '@/stores/stock'
import { useThemeStore } from '@/stores/theme'
import { STOCK_ROLE_LABELS, STOCK_TAG_LABELS } from '@/types'

const stockStore = useStockStore()
const themeStore = useThemeStore()

const filterRole = ref('')
const filterTheme = ref('')

const filteredStocks = computed(() => {
  return stockStore.stocks.filter(s => {
    if (filterRole.value && s.role !== filterRole.value) return false
    if (filterTheme.value && s.themeId !== filterTheme.value) return false
    return true
  }).sort((a, b) => {
    const order = { leader: 0, mid: 1, follower: 2, catchup: 3 }
    return order[a.role] - order[b.role]
  })
})

function getThemeName(themeId: string) {
  return themeStore.getTheme(themeId)?.name ?? '-'
}

function roleTagClass(role: string) {
  return role === 'leader' ? 'tag-gold' : role === 'mid' ? 'tag-blue' : 'tag-yellow'
}

function getMaxBoard(stock: { limitUpRecords: { boardCount: number }[] }) {
  if (stock.limitUpRecords.length === 0) return 0
  return Math.max(...stock.limitUpRecords.map(r => r.boardCount))
}
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}
.filter-select {
  padding: 6px 10px;
  font-size: 13px;
}
.hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}
.stock-card {
  cursor: pointer;
  margin-bottom: 8px;
  padding: 12px;
}
.stock-card:hover {
  background: var(--bg-tertiary);
}
.stock-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.stock-name { font-weight: 500; }
.stock-code {
  color: var(--text-tertiary);
  font-size: 12px;
}
.stock-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
.board-count {
  color: var(--color-red);
  font-weight: 500;
}
.record-count {
  margin-left: auto;
}

@media (max-width: 768px) {
  .header-actions {
    flex-wrap: wrap;
  }
  .filter-select {
    flex: 1;
    min-width: 80px;
  }
}
</style>
