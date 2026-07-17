<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">设置</h1>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <h3 style="margin-bottom: 16px;">外观设置</h3>
      <div class="action-row">
        <div>
          <div style="font-weight: 500;">主题模式</div>
          <div style="font-size: 12px; color: var(--text-secondary);">切换深色/浅色主题</div>
        </div>
        <div class="theme-toggle">
          <button
            class="theme-btn"
            :class="{ active: currentTheme === 'dark' }"
            @click="setTheme('dark')"
          >
            深色
          </button>
          <button
            class="theme-btn"
            :class="{ active: currentTheme === 'light' }"
            @click="setTheme('light')"
          >
            浅色
          </button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <h3 style="margin-bottom: 16px;">数据管理</h3>

      <div class="action-row">
        <div>
          <div style="font-weight: 500;">自动备份</div>
          <div style="font-size: 12px; color: var(--text-secondary);">开启后，数据变化时自动下载JSON备份到浏览器下载目录</div>
        </div>
        <div class="toggle-switch">
          <button class="toggle-btn" :class="{ active: settings.autoBackup }" @click="toggleAutoBackup">
            {{ settings.autoBackup ? '已开启' : '已关闭' }}
          </button>
        </div>
      </div>

      <div class="action-row" v-if="settings.autoBackup">
        <div>
          <div style="font-weight: 500;">备份间隔</div>
          <div style="font-size: 12px; color: var(--text-secondary);">自动备份的时间间隔</div>
        </div>
        <select v-model="backupInterval" class="interval-select" @change="updateBackupInterval">
          <option value="30">30分钟</option>
          <option value="60">1小时</option>
          <option value="120">2小时</option>
          <option value="360">6小时</option>
          <option value="720">12小时</option>
          <option value="1440">24小时</option>
        </select>
      </div>

      <div class="action-row" v-if="settings.lastAutoBackup">
        <div>
          <div style="font-weight: 500;">上次备份</div>
          <div style="font-size: 12px; color: var(--text-secondary);">{{ formatBackupTime(settings.lastAutoBackup) }}</div>
        </div>
      </div>

      <div class="action-row">
        <div>
          <div style="font-weight: 500;">加载测试数据</div>
          <div style="font-size: 12px; color: var(--text-secondary);">生成模拟数据查看效果（会覆盖现有数据）</div>
        </div>
        <button class="btn-primary" @click="handleLoadTestData">加载</button>
      </div>
      <div class="action-row">
        <div>
          <div style="font-weight: 500;">导出数据</div>
          <div style="font-size: 12px; color: var(--text-secondary);">将所有数据导出为JSON文件备份</div>
        </div>
        <button class="btn-primary" @click="handleExport">导出数据</button>
      </div>
      <div class="action-row">
        <div>
          <div style="font-weight: 500;">导入数据</div>
          <div style="font-size: 12px; color: var(--text-secondary);">从JSON备份文件恢复数据（导入前会自动备份当前数据）</div>
        </div>
        <div>
          <input ref="fileInput" type="file" accept=".json" style="display: none;" @change="handleImport" />
          <button class="btn-primary" @click="($refs.fileInput as HTMLInputElement).click()">导入数据</button>
        </div>
      </div>
      <div class="action-row danger">
        <div>
          <div style="font-weight: 500; color: var(--color-red);">清空数据</div>
          <div style="font-size: 12px; color: var(--text-secondary);">删除所有数据，此操作不可恢复</div>
        </div>
        <button class="btn-danger" @click="showClearConfirm = true">清空数据</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 12px;">关于</h3>
      <div style="color: var(--text-secondary); font-size: 13px; line-height: 1.8;">
        <p><strong>TradingCanvas</strong> v1.0.0</p>
        <p>A股超短题材情绪复盘工具</p>
        <p>帮助追踪 "题材 → 龙头/中军 → 情绪周期" 主线</p>
        <p>数据存储于浏览器本地，请定期导出备份</p>
      </div>
    </div>

    <ConfirmDialog
      :show="showClearConfirm"
      title="清空所有数据"
      message="此操作将删除所有题材、个股、情绪和复盘数据，且不可恢复！建议先导出备份。"
      @confirm="handleClear"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { exportData, importData, clearData, generateTestData, saveData, loadData, updateSettings, autoBackupIfNeeded } from '@/composables/useStorage'
import { useThemeStore } from '@/stores/theme'
import { useStockStore } from '@/stores/stock'
import { useEmotionStore } from '@/stores/emotion'
import { useReviewStore } from '@/stores/review'
import { useTradeModeStore } from '@/stores/tradeMode'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { AppSettings } from '@/types'

const themeStore = useThemeStore()
const stockStore = useStockStore()
const emotionStore = useEmotionStore()
const reviewStore = useReviewStore()
const tradeModeStore = useTradeModeStore()
const toast = useToast()
const { currentTheme, setTheme } = useTheme()

const showClearConfirm = ref(false)
const settings = ref<AppSettings>(loadData().settings)
const backupInterval = ref(String(settings.value.autoBackupInterval))

// 定时检查自动备份
let backupTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // 每30秒检查一次是否需要自动备份
  backupTimer = setInterval(() => {
    autoBackupIfNeeded()
    // 刷新设置显示
    settings.value = loadData().settings
  }, 30000)
})

onUnmounted(() => {
  if (backupTimer) clearInterval(backupTimer)
})

function toggleAutoBackup() {
  settings.value.autoBackup = !settings.value.autoBackup
  updateSettings({ autoBackup: settings.value.autoBackup })
  toast.success(settings.value.autoBackup ? '自动备份已开启' : '自动备份已关闭')
}

function updateBackupInterval() {
  const interval = parseInt(backupInterval.value)
  settings.value.autoBackupInterval = interval
  updateSettings({ autoBackupInterval: interval })
  toast.success(`备份间隔已设置为 ${interval} 分钟`)
}

function formatBackupTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleExport() {
  exportData()
  toast.success('数据已导出')
}

async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // 先备份
  exportData()

  try {
    await importData(file)
    themeStore.reload()
    stockStore.reload()
    emotionStore.reload()
    reviewStore.reload()
    tradeModeStore.reload()
    settings.value = loadData().settings
    toast.success('数据导入成功')
  } catch (e: any) {
    toast.error(e.message || '导入失败')
  }

  // 重置file input
  ;(event.target as HTMLInputElement).value = ''
}

function handleClear() {
  clearData()
  themeStore.reload()
  stockStore.reload()
  emotionStore.reload()
  reviewStore.reload()
  tradeModeStore.reload()
  settings.value = loadData().settings
  toast.success('数据已清空')
  showClearConfirm.value = false
}

function handleLoadTestData() {
  const data = generateTestData()
  saveData(data)
  themeStore.reload()
  stockStore.reload()
  emotionStore.reload()
  reviewStore.reload()
  tradeModeStore.reload()
  settings.value = loadData().settings
  toast.success('测试数据已加载')
}
</script>

<style scoped>
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}
.action-row:last-child {
  border-bottom: none;
}
.action-row.danger {
  border-top: 1px solid rgba(248,81,73,0.3);
  margin-top: 8px;
  padding-top: 20px;
}

.theme-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: 6px;
}

.theme-btn {
  padding: 6px 16px;
  font-size: 13px;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
}

.theme-btn.active {
  background: var(--color-blue);
  color: #fff;
}

.toggle-switch {
  flex-shrink: 0;
}

.toggle-btn {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn.active {
  background: var(--color-blue);
  border-color: var(--color-blue);
  color: #fff;
}

.interval-select {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
}

.interval-select:focus {
  outline: none;
  border-color: var(--color-blue);
}
</style>
