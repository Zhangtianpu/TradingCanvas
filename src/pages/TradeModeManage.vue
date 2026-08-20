<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">标签管理</h1>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- 交易模式 -->
    <div v-if="activeTab === 'tradeMode'" class="tab-content">
      <div class="content-header">
        <span class="content-title">交易模式</span>
        <button class="btn-add" @click="openAdd('tradeMode')">+ 新建</button>
      </div>
      <div class="mode-grid">
        <div v-for="mode in tradeModeStore.tradeModes" :key="mode.id" class="mode-card">
          <div class="mode-color" :style="{ background: mode.color }"></div>
          <div class="mode-info">
            <div class="mode-name">{{ mode.name }}</div>
            <div class="mode-desc" v-if="mode.description">{{ mode.description }}</div>
            <div class="mode-desc empty" v-else>暂无说明</div>
          </div>
          <div class="mode-actions">
            <button class="btn-edit" @click="openEdit('tradeMode', mode)">编辑</button>
            <button class="btn-del" @click="handleDelete('tradeMode', mode.id)">删除</button>
          </div>
        </div>
      </div>
      <div v-if="tradeModeStore.tradeModes.length === 0" class="empty-state">暂无交易模式</div>
    </div>

    <!-- 交易风格 -->
    <div v-if="activeTab === 'tradeStyle'" class="tab-content">
      <div class="content-header">
        <span class="content-title">交易风格</span>
        <button class="btn-add" @click="openAdd('tradeStyle')">+ 新建</button>
      </div>
      <div class="mode-grid">
        <div v-for="style in customTradeStyleStore.sortedStyles" :key="style.id" class="mode-card">
          <div class="mode-color" :style="{ background: style.color }"></div>
          <div class="mode-info">
            <div class="mode-name">
              {{ style.name }}
              <span v-if="style.isDefault" class="default-tag">默认</span>
            </div>
            <div class="mode-desc" v-if="style.description">{{ style.description }}</div>
            <div class="mode-desc empty" v-else>暂无说明</div>
          </div>
          <div class="mode-actions">
            <button class="btn-edit" @click="openEdit('tradeStyle', style)">编辑</button>
            <button
              v-if="!style.isDefault"
              class="btn-del"
              @click="handleDelete('tradeStyle', style.id)"
            >删除</button>
            <span v-else class="lock-hint" title="默认项不可删除">🔒</span>
          </div>
        </div>
      </div>
      <div v-if="customTradeStyleStore.sortedStyles.length === 0" class="empty-state">暂无交易风格</div>
    </div>

    <!-- 情绪阶段 -->
    <div v-if="activeTab === 'cyclePhase'" class="tab-content">
      <div class="content-header">
        <span class="content-title">情绪阶段</span>
        <button class="btn-add" @click="openAdd('cyclePhase')">+ 新建</button>
      </div>
      <div class="mode-grid">
        <div v-for="phase in customCyclePhaseStore.sortedPhases" :key="phase.id" class="mode-card">
          <div class="mode-color" :style="{ background: phase.color }"></div>
          <div class="mode-info">
            <div class="mode-name">
              {{ phase.name }}
              <span v-if="phase.isDefault" class="default-tag">默认</span>
            </div>
            <div class="mode-desc" v-if="phase.description">{{ phase.description }}</div>
            <div class="mode-desc empty" v-else>暂无说明</div>
          </div>
          <div class="mode-actions">
            <button class="btn-edit" @click="openEdit('cyclePhase', phase)">编辑</button>
            <button
              v-if="!phase.isDefault"
              class="btn-del"
              @click="handleDelete('cyclePhase', phase.id)"
            >删除</button>
            <span v-else class="lock-hint" title="默认项不可删除">🔒</span>
          </div>
        </div>
      </div>
      <div v-if="customCyclePhaseStore.sortedPhases.length === 0" class="empty-state">暂无情绪阶段</div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-title">{{ modalTitle }}</div>
        <div class="modal-body">
          <div class="form-row">
            <label class="form-label">名称</label>
            <input
              type="text"
              v-model="form.name"
              class="form-input"
              :placeholder="namePlaceholder"
              @keyup.enter="handleSave"
            />
          </div>
          <div class="form-row">
            <label class="form-label">说明</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              placeholder="可选：详细说明"
              rows="3"
            ></textarea>
          </div>
          <div class="form-row">
            <div class="color-row">
              <label class="form-label">颜色</label>
              <button class="btn-random" @click="randomizeColor" title="随机配色">🎲 随机</button>
            </div>
            <div class="color-picker">
              <input type="color" v-model="form.color" class="color-input" />
              <span class="color-value">{{ form.color }}</span>
              <div
                class="color-preview"
                :style="{ background: form.color }"
              >预览</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">预设颜色</label>
            <div class="color-presets">
              <button
                v-for="c in colorPresets"
                :key="c"
                class="color-preset"
                :style="{ background: c }"
                :class="{ active: form.color.toLowerCase() === c.toLowerCase() }"
                @click="form.color = c"
              ></button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-save" @click="handleSave" :disabled="!form.name.trim()">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTradeModeStore } from '@/stores/tradeMode'
import { useCustomTradeStyleStore, TRADE_STYLE_COLOR_POOL } from '@/stores/customTradeStyle'
import { useCustomCyclePhaseStore, CYCLE_PHASE_COLOR_POOL } from '@/stores/customCyclePhase'
import type { CustomTradeMode, CustomTradeStyle, CustomCyclePhase } from '@/types'

const tradeModeStore = useTradeModeStore()
const customTradeStyleStore = useCustomTradeStyleStore()
const customCyclePhaseStore = useCustomCyclePhaseStore()

type TabKey = 'tradeMode' | 'tradeStyle' | 'cyclePhase'

const tabs = [
  { key: 'tradeMode' as TabKey, label: '交易模式' },
  { key: 'tradeStyle' as TabKey, label: '交易风格' },
  { key: 'cyclePhase' as TabKey, label: '情绪阶段' }
]

const activeTab = ref<TabKey>('tradeMode')

// 当前激活 tab 的颜色池
const currentColorPool = computed(() => {
  if (activeTab.value === 'tradeStyle') return TRADE_STYLE_COLOR_POOL
  if (activeTab.value === 'cyclePhase') return CYCLE_PHASE_COLOR_POOL
  return defaultColorPresets
})

const defaultColorPresets = [
  '#f85149', '#3fb950', '#58a6ff', '#a371f5', '#f0883e', '#8b949e',
  '#f97583', '#79c0ff', '#d2a8ff', '#ff7b72', '#7ee787', '#ffc658'
]

// 颜色预设：合并当前类型颜色池 + 通用预设，去重
const colorPresets = computed(() => {
  const all = [...currentColorPool.value, ...defaultColorPresets]
  return Array.from(new Set(all))
})

// 弹窗状态
const showModal = ref(false)
const editingType = ref<TabKey>('tradeMode')
const editingId = ref<string | null>(null)
const form = ref({ name: '', color: '#3fb950', description: '' })

const modalTitle = computed(() => {
  const action = editingId.value ? '编辑' : '新建'
  const label = tabs.find(t => t.key === editingType.value)?.label || ''
  return `${action}${label}`
})

const namePlaceholder = computed(() => {
  if (editingType.value === 'tradeMode') return '如：打板、低吸'
  if (editingType.value === 'tradeStyle') return '如：趋势、连板、接力'
  return '如：启动、主升、分歧、退潮'
})

function openAdd(type: TabKey) {
  editingType.value = type
  editingId.value = null
  // 默认颜色：用对应类型的随机色
  const pool = type === 'tradeStyle' ? TRADE_STYLE_COLOR_POOL
    : type === 'cyclePhase' ? CYCLE_PHASE_COLOR_POOL
    : defaultColorPresets
  form.value = {
    name: '',
    color: pool[Math.floor(Math.random() * pool.length)],
    description: ''
  }
  showModal.value = true
}

function openEdit(type: TabKey, item: CustomTradeMode | CustomTradeStyle | CustomCyclePhase) {
  editingType.value = type
  editingId.value = item.id
  form.value = {
    name: item.name,
    color: item.color,
    description: item.description || ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

function randomizeColor() {
  const pool = currentColorPool.value
  // 避免和当前颜色相同
  let color = form.value.color
  let tries = 0
  while (color.toLowerCase() === form.value.color.toLowerCase() && tries < 10) {
    color = pool[Math.floor(Math.random() * pool.length)]
    tries++
  }
  form.value.color = color
}

function handleSave() {
  if (!form.value.name.trim()) return
  const payload = {
    name: form.value.name.trim(),
    color: form.value.color,
    description: form.value.description.trim()
  }

  if (editingType.value === 'tradeMode') {
    if (editingId.value) {
      tradeModeStore.updateMode(editingId.value, payload)
    } else {
      tradeModeStore.addMode(payload.name, payload.color, payload.description)
    }
  } else if (editingType.value === 'tradeStyle') {
    if (editingId.value) {
      customTradeStyleStore.updateStyle(editingId.value, payload)
    } else {
      customTradeStyleStore.addStyle(payload)
    }
  } else if (editingType.value === 'cyclePhase') {
    if (editingId.value) {
      customCyclePhaseStore.updatePhase(editingId.value, payload)
    } else {
      customCyclePhaseStore.addPhase(payload)
    }
  }
  closeModal()
}

function handleDelete(type: TabKey, id: string) {
  const label = tabs.find(t => t.key === type)?.label || ''
  if (!confirm(`确定删除该${label}？已使用的记录将保留。`)) return
  if (type === 'tradeMode') tradeModeStore.deleteMode(id)
  else if (type === 'tradeStyle') customTradeStyleStore.deleteStyle(id)
  else if (type === 'cyclePhase') customCyclePhaseStore.deletePhase(id)
}
</script>

<style scoped>
.page-wrap {
  padding: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--color-blue);
  border-bottom-color: var(--color-blue);
  font-weight: 600;
}

.tab-content {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.content-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-add {
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  background: var(--color-blue);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-add:hover {
  opacity: 0.85;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.mode-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: border-color 0.15s;
}

.mode-card:hover {
  border-color: rgba(88,166,255,0.4);
}

.mode-color {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}

.mode-info {
  flex: 1;
  min-width: 0;
}

.mode-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.default-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(139,148,158,0.15);
  color: var(--text-tertiary);
  font-weight: 400;
}

.mode-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mode-desc.empty {
  color: var(--text-tertiary);
  font-style: italic;
}

.mode-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-edit,
.btn-del {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-edit:hover {
  color: var(--color-blue);
  border-color: var(--color-blue);
}

.btn-del:hover {
  color: #f85149;
  border-color: #f85149;
}

.lock-hint {
  font-size: 14px;
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
}

.modal-title {
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.modal-body {
  padding: 16px 20px;
}

.form-row {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.color-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.color-row .form-label {
  margin-bottom: 0;
}

.btn-random {
  padding: 3px 10px;
  font-size: 11px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-random:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.form-input {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

.form-textarea {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-blue);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input {
  width: 50px;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.color-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: monospace;
}

.color-preview {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  font-weight: 500;
  margin-left: auto;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-preset {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s;
}

.color-preset:hover {
  transform: scale(1.1);
}

.color-preset.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--color-blue);
}

.modal-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  color: var(--text-primary);
}

.btn-save {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: var(--color-blue);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-save:not(:disabled):hover {
  opacity: 0.85;
}

@media (max-width: 600px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
