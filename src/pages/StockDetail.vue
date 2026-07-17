<template>
  <div class="stock-detail" v-if="stock">
    <div class="page-header">
      <div class="header-left">
        <button class="btn-ghost btn-sm" @click="$router.back()">返回</button>
        <h1 class="page-title">{{ stock.name }} {{ stock.code }}</h1>
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
          <span class="info-label">角色</span>
          <span class="tag" :class="roleTagClass(stock.role)">{{ STOCK_ROLE_LABELS[stock.role] }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">题材</span>
          <router-link :to="`/themes/${stock.themeId}`">{{ getThemeName() }}</router-link>
        </div>
        <div class="info-item">
          <span class="info-label">标签</span>
          <div class="tag-list">
            <span v-for="tag in stock.tags" :key="tag" class="tag tag-purple">{{ STOCK_TAG_LABELS[tag] }}</span>
            <span v-if="stock.tags.length === 0" class="muted">-</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">最高连板</span>
          <span class="board-high">{{ maxBoard }}板</span>
        </div>
      </div>
    </div>

    <!-- 打板记录 -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="section-header">
        <span>打板记录</span>
        <button class="btn-primary btn-sm" @click="openAddLimitUp">添加</button>
      </div>
      <div v-if="stock.limitUpRecords.length === 0" class="empty-hint">暂无记录</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>日期</th><th>板数</th><th>封板</th><th>封单</th><th>炸板</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in sortedLimitUps" :key="r.id">
              <td>{{ r.date }}</td>
              <td class="board-num">{{ r.boardCount }}板</td>
              <td>{{ r.limitUpTime || '-' }}</td>
              <td>{{ r.sealAmount || '-' }}</td>
              <td>
                <span v-if="r.broken" class="broken">{{ r.resealed ? '炸→回' : '炸' }}</span>
                <span v-else class="ok">-</span>
              </td>
              <td><button class="btn-link" @click="handleDeleteLimitUp(r.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 买卖记录 -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="section-header">
        <span>买卖记录</span>
        <button class="btn-primary btn-sm" @click="openAddTrade">添加</button>
      </div>
      <div v-if="stock.trades.length === 0" class="empty-hint">暂无记录</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>日期</th><th>方向</th><th>价格</th><th>数量</th><th>金额</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="t in sortedTrades" :key="t.id">
              <td>{{ t.date }}</td>
              <td><span class="tag" :class="t.direction === 'buy' ? 'tag-red' : 'tag-green'">{{ t.direction === 'buy' ? '买' : '卖' }}</span></td>
              <td>{{ t.price.toFixed(2) }}</td>
              <td>{{ t.quantity }}</td>
              <td>{{ (t.price * t.quantity).toFixed(0) }}</td>
              <td><button class="btn-link" @click="handleDeleteTrade(t.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <h3>编辑个股</h3>
        <div class="form-row">
          <div class="form-group">
            <label>代码</label>
            <input v-model="editForm.code" />
          </div>
          <div class="form-group">
            <label>名称</label>
            <input v-model="editForm.name" />
          </div>
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="editForm.role">
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
              <input type="checkbox" :value="key" v-model="editForm.tags" />
              <span class="tag tag-purple">{{ label }}</span>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showEditModal = false">取消</button>
          <button class="btn-primary" @click="handleEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加打板记录弹窗 -->
    <div v-if="showLimitUpModal" class="modal-overlay" @click.self="showLimitUpModal = false">
      <div class="modal">
        <h3>添加打板记录</h3>
        <div class="form-row">
          <div class="form-group">
            <label>日期</label>
            <input v-model="limitUpForm.date" type="date" />
          </div>
          <div class="form-group">
            <label>板数</label>
            <input v-model.number="limitUpForm.boardCount" type="number" min="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>封板时间</label>
            <input v-model="limitUpForm.limitUpTime" type="time" />
          </div>
          <div class="form-group">
            <label>封单量</label>
            <input v-model="limitUpForm.sealAmount" placeholder="如: 8.5亿" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label"><input type="checkbox" v-model="limitUpForm.broken" /> 炸板</label>
          </div>
          <div class="form-group" v-if="limitUpForm.broken">
            <label class="checkbox-label"><input type="checkbox" v-model="limitUpForm.resealed" /> 回封</label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showLimitUpModal = false">取消</button>
          <button class="btn-primary" @click="handleAddLimitUp">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加交易记录弹窗 -->
    <div v-if="showTradeModal" class="modal-overlay" @click.self="showTradeModal = false">
      <div class="modal">
        <h3>添加交易记录</h3>
        <div class="form-row">
          <div class="form-group">
            <label>日期</label>
            <input v-model="tradeForm.date" type="date" />
          </div>
          <div class="form-group">
            <label>方向</label>
            <select v-model="tradeForm.direction">
              <option value="buy">买入</option>
              <option value="sell">卖出</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>价格</label>
            <input v-model.number="tradeForm.price" type="number" step="0.01" />
          </div>
          <div class="form-group">
            <label>数量</label>
            <input v-model.number="tradeForm.quantity" type="number" />
          </div>
        </div>
        <div class="form-group">
          <label>备注</label>
          <input v-model="tradeForm.note" />
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showTradeModal = false">取消</button>
          <button class="btn-primary" @click="handleAddTrade">添加</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除个股"
      :message="`确定删除「${stock.name}」？`"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
  <div v-else class="empty-state">
    <p>个股不存在</p>
    <button class="btn-primary" @click="$router.back()">返回</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stock'
import { useThemeStore } from '@/stores/theme'
import { useTradeModeStore } from '@/stores/tradeMode'
import { STOCK_ROLE_LABELS, STOCK_TAG_LABELS, type StockTag, type StockRole } from '@/types'
import { today } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const stockStore = useStockStore()
const themeStore = useThemeStore()
const tradeModeStore = useTradeModeStore()
const toast = useToast()

const showEditModal = ref(false)
const showLimitUpModal = ref(false)
const showTradeModal = ref(false)
const showDeleteConfirm = ref(false)

const stock = computed(() => stockStore.getStock(route.params.id as string))

const maxBoard = computed(() => {
  if (!stock.value || stock.value.limitUpRecords.length === 0) return 0
  return Math.max(...stock.value.limitUpRecords.map(r => r.boardCount))
})

const sortedLimitUps = computed(() => {
  if (!stock.value) return []
  return [...stock.value.limitUpRecords].sort((a, b) => b.date.localeCompare(a.date))
})

const sortedTrades = computed(() => {
  if (!stock.value) return []
  return [...stock.value.trades].sort((a, b) => b.date.localeCompare(a.date))
})

const editForm = reactive({
  code: '',
  name: '',
  role: 'follower' as StockRole,
  tags: [] as StockTag[]
})

const limitUpForm = reactive({
  date: today(),
  boardCount: 1,
  limitUpTime: '',
  sealAmount: '',
  broken: false,
  resealed: false
})

const tradeForm = reactive({
  date: today(),
  direction: 'buy' as const,
  price: 0,
  quantity: 0,
  note: ''
})

watch(stock, (s) => {
  if (s) {
    editForm.code = s.code
    editForm.name = s.name
    editForm.role = s.role
    editForm.tags = [...s.tags]
  }
}, { immediate: true })

function getThemeName() {
  if (!stock.value) return '-'
  return themeStore.getTheme(stock.value.themeId)?.name ?? '-'
}

function roleTagClass(role: string) {
  return role === 'leader' ? 'tag-gold' : role === 'mid' ? 'tag-blue' : 'tag-yellow'
}

function openAddLimitUp() {
  limitUpForm.date = today()
  limitUpForm.boardCount = 1
  limitUpForm.limitUpTime = ''
  limitUpForm.sealAmount = ''
  limitUpForm.broken = false
  limitUpForm.resealed = false
  showLimitUpModal.value = true
}

function openAddTrade() {
  tradeForm.date = today()
  tradeForm.direction = 'buy'
  tradeForm.price = 0
  tradeForm.quantity = 0
  tradeForm.note = ''
  showTradeModal.value = true
}

function handleEdit() {
  if (!stock.value) return
  stockStore.updateStock(stock.value.id, {
    code: editForm.code.trim(),
    name: editForm.name.trim(),
    role: editForm.role,
    tags: editForm.tags
  })
  toast.success('已保存')
  showEditModal.value = false
}

function handleDelete() {
  if (!stock.value) return
  stockStore.deleteStock(stock.value.id)
  toast.success('已删除')
  router.back()
}

function handleAddLimitUp() {
  if (!stock.value) return
  stockStore.addLimitUpRecord(stock.value.id, {
    date: limitUpForm.date,
    boardCount: limitUpForm.boardCount,
    limitUpTime: limitUpForm.limitUpTime,
    sealAmount: limitUpForm.sealAmount,
    broken: limitUpForm.broken,
    resealed: limitUpForm.resealed
  })
  toast.success('已添加')
  showLimitUpModal.value = false
}

function handleDeleteLimitUp(recordId: string) {
  if (!stock.value) return
  stockStore.deleteLimitUpRecord(stock.value.id, recordId)
  toast.success('已删除')
}

function handleAddTrade() {
  if (!stock.value) return
  if (tradeForm.price <= 0 || tradeForm.quantity <= 0) {
    toast.error('请输入有效价格和数量')
    return
  }
  stockStore.addTradeRecord(stock.value.id, {
    date: tradeForm.date,
    direction: tradeForm.direction,
    price: tradeForm.price,
    quantity: tradeForm.quantity,
    modeId: tradeModeStore.tradeModes[0]?.id || '',
    note: tradeForm.note
  })
  toast.success('已添加')
  showTradeModal.value = false
}

function handleDeleteTrade(recordId: string) {
  if (!stock.value) return
  stockStore.deleteTradeRecord(stock.value.id, recordId)
  toast.success('已删除')
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
.tag-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.muted { color: var(--text-tertiary); }
.board-high {
  color: var(--color-red);
  font-weight: 600;
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

.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.data-table th, .data-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}
.data-table th {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 11px;
}
.board-num {
  color: var(--color-red);
  font-weight: 600;
}
.broken { color: var(--color-yellow); }
.ok { color: var(--text-tertiary); }
.btn-link {
  background: none;
  color: var(--text-tertiary);
  padding: 2px 6px;
  font-size: 11px;
}
.btn-link:hover { color: var(--color-red); }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

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
</style>
