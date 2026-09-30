<template>
  <div class="pattern-page">
    <div class="page-heading">
      <div>
        <h1>模式挖掘</h1>
        <p>用虚拟买卖验证交易模式，不影响真实持仓与收益统计。</p>
      </div>
      <router-link to="/trade-modes" class="manage-link">管理交易模式</router-link>
    </div>
    <PatternMiningPanel />
  </div>
</template>

<script setup lang="ts">
import PatternMiningPanel from '@/components/PatternMiningPanel.vue'
</script>

<style scoped>
.pattern-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-heading h1 {
  font-size: 20px;
  margin-bottom: 5px;
}

.page-heading p {
  color: var(--text-secondary);
  font-size: 13px;
}

.manage-link {
  flex-shrink: 0;
  padding: 7px 12px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 12px;
}

.manage-link:hover {
  border-color: var(--color-blue);
}

@media (max-width: 560px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
