<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">交易模式管理</h1>
      <button class="btn-add" @click="openAdd">+ 新建模式</button>
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
          <button class="btn-edit" @click="openEdit(mode)">编辑</button>
          <button class="btn-del" @click="handleDelete(mode.id)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="tradeModeStore.tradeModes.length === 0" class="empty-state">
      <p>暂无交易模式</p>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-title">{{ editingId ? '编辑模式' : '新建模式' }}</div>
        <div class="modal-body">
          <div class="form-row">
            <label class="form-label">模式名称</label>
            <input type="text" v-model="form.name" class="form-input" placeholder="如：打板、低吸" />
          </div>
          <div class="form-row">
            <label class="form-label">模式说明</label>
            <textarea v-model="form.description" class="form-textarea" placeholder="详细说明该模式的买点、卖点等" rows="3"></textarea>
          </div>
          <div class="form-row">
            <label class="form-label">颜色</label>
            <div class="color-picker">
              <input type="color" v-model="form.color" class="color-input" />
              <span class="color-value">{{ form.color }}</span>
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
                :class="{ active: form.color === c }"
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
import { ref } from 'vue'
import { useTradeModeStore } from '@/stores/tradeMode'
import type { CustomTradeMode } from '@/types'

const tradeModeStore = useTradeModeStore()

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '', color: '#3fb950', description: '' })

const colorPresets = [
  '#f85149', '#3fb950', '#58a6ff', '#a371f5', '#f0883e', '#8b949e',
  '#f97583', '#79c0ff', '#d2a8ff', '#ff7b72', '#7ee787', '#ffc658'
]

function openAdd() {
  editingId.value = null
  form.value = { name: '', color: '#3fb950', description: '' }
  showModal.value = true
}

function openEdit(mode: CustomTradeMode) {
  editingId.value = mode.id
  form.value = { name: mode.name, color: mode.color, description: mode.description }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

function handleSave() {
  if (!form.value.name.trim()) return
  if (editingId.value) {
    tradeModeStore.updateMode(editingId.value, {
      name: form.value.name.trim(),
      color: form.value.color,
      description: form.value.description.trim()
    })
  } else {
    tradeModeStore.addMode(form.value.name.trim(), form.value.color, form.value.description.trim())
  }
  closeModal()
}

function handleDelete(id: string) {
  if (confirm('确定删除该交易模式？已使用的记录将保留模式ID。')) {
    tradeModeStore.deleteMode(id)
  }
}
</script>

<style scoped>
.page-wrap {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.btn-add {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: var(--color-blue);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-add:hover {
  opacity: 0.85;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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
}

.mode-color {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
}

.mode-info {
  flex: 1;
  min-width: 0;
}

.mode-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.mode-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.mode-desc.empty {
  color: var(--text-tertiary);
  font-style: italic;
}

.mode-actions {
  display: flex;
  gap: 6px;
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
}

.btn-edit:hover {
  color: var(--color-blue);
  border-color: var(--color-blue);
}

.btn-del:hover {
  color: #f85149;
  border-color: #f85149;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
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
  max-width: 380px;
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
}

.color-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: monospace;
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
</style>