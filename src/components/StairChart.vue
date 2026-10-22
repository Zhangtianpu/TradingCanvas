<template>
  <div class="stair-chart">
    <div class="chart-header">
      <div class="title-wrapper">
        <input
          v-if="editingTitle"
          v-model="customTitle"
          class="title-input"
          @blur="saveTitle"
          @keyup.enter="saveTitle"
          @keyup.esc="cancelEditTitle"
          ref="titleInputRef"
        />
        <span v-else class="chart-title" :class="{ clickable: !readOnly }" @click="!readOnly && startEditTitle()" :title="readOnly ? '' : '点击修改名称'">
          {{ displayTitle }}
          <span v-if="!readOnly" class="edit-icon">✎</span>
        </span>
      </div>
      <div class="chart-legend">
        <span class="legend-item"><span class="dot breakthrough"></span>突破</span>
        <span class="legend-item"><span class="dot median"></span>中位</span>
        <span class="legend-item"><span class="dot ice"></span>冰点</span>
        <span class="legend-item"><span class="dot announcement"></span>公告</span>
        <span v-for="def in stairDateTagDefs" :key="def.key" class="legend-item">
          <span class="date-legend-badge" :style="{ background: def.color }">{{ def.badge || def.name.slice(0, 1) }}</span>{{ def.name }}
        </span>
      </div>
    </div>
    <!-- 显示范围控制 -->
    <div class="stair-range-controls">
      <span class="stair-range-label">显示范围：</span>
      <button
        v-for="r in timeRanges"
        :key="r.value"
        class="stair-range-btn"
        :class="{ active: stairRange === r.value }"
        @click="stairRange = r.value"
      >{{ r.label }}</button>
      <div class="stair-custom-range">
        <input
          type="number"
          v-model.number="customStairRange"
          min="1"
          max="365"
          class="stair-range-input"
          placeholder="天数"
        />
        <button class="stair-range-btn" @click="applyCustomStairRange">确定</button>
      </div>
    </div>
    <div class="chart-body" v-if="displayEmotions.length > 0">
      <!-- 高度标签 -->
      <div class="height-labels">
        <div class="market-overview-label up">上涨</div>
        <div class="market-overview-label limit-up">涨停</div>
        <div class="market-overview-label limit-down">跌停</div>
        <div class="market-overview-label board-count" title="连板家数">连板</div>
        <div class="market-overview-label promotion-rate" title="连板晋级率">晋级率</div>
        <div class="market-overview-label seal-rate" title="封板率">封板率</div>
        <div class="market-overview-label target-stocks" title="目标标的">目标</div>
        <div class="market-overview-label anchor-result" title="情绪锚定结果">锚定</div>
        <div class="height-axis-spacer"></div>
        <div v-for="h in heightRange" :key="h" class="height-label" :class="{ 'row-highlight': hoveredHeight === h }">{{ h }}板</div>
        <div class="height-adjust">
          <button class="height-btn" @click="addHeightLevel" title="增加板高">+</button>
          <button class="height-btn" @click="removeHeightLevel" title="减少板高">−</button>
        </div>
      </div>
      <!-- 表格主体 -->
      <div class="table-container">
        <!-- 表格（含高度输入行，同步滚动） -->
        <div class="table-wrapper">
          <div class="table-scroll" ref="scrollContainerRef" @scroll="onScroll">
            <!-- 涨跌概况（与日期列和天梯表同步滚动） -->
            <div class="market-overview-table" :style="{ width: displayEmotions.length * cellWidth + 'px' }">
              <div class="market-overview-row up">
                <div v-for="e in displayEmotions" :key="`up-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ e.upCount || 0 }}</div>
              </div>
              <div class="market-overview-row limit-up">
                <div v-for="e in displayEmotions" :key="`limit-up-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ e.limitUpCount || 0 }}</div>
              </div>
              <div class="market-overview-row limit-down">
                <div v-for="e in displayEmotions" :key="`limit-down-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ e.limitDownCount || 0 }}</div>
              </div>
              <div class="market-overview-row board-count">
                <div v-for="e in displayEmotions" :key="`board-count-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ e.continuousBoardCount || 0 }}</div>
              </div>
              <div class="market-overview-row promotion-rate">
                <div v-for="e in displayEmotions" :key="`promotion-rate-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ formatPercent(promotionRates[e.date] || 0) }}</div>
              </div>
              <div class="market-overview-row seal-rate">
                <div v-for="e in displayEmotions" :key="`seal-rate-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ formatPercent(e.sealRate || 0) }}</div>
              </div>
              <div class="market-overview-row target-stocks">
                <div v-for="e in displayEmotions" :key="`target-stocks-${e.id}`" class="market-overview-cell" :style="{ width: cellWidth + 'px' }">{{ reviewStore.getReviewByDate(e.date)?.targetStocks || 0 }}</div>
              </div>
              <div class="market-overview-row anchor-result">
                <div
                  v-for="e in displayEmotions"
                  :key="`anchor-result-${e.id}`"
                  class="market-overview-cell"
                  :style="{ width: cellWidth + 'px' }"
                  :title="getAnchorResultTitle(e.date)"
                >
                  <span v-if="getAnchorResult(e.date)" class="anchor-result-badge" :class="getAnchorResultClass(e.date)">
                    {{ getAnchorResult(e.date)?.label }}
                  </span>
                  <span v-else class="anchor-result-empty">—</span>
                </div>
              </div>
            </div>
            <!-- 高度计算输入行（与表格同步滚动） -->
            <div class="height-input-bar" :style="{ width: displayEmotions.length * cellWidth + 'px' }">
              <input
                v-for="e in displayEmotions"
                :key="e.id"
                type="text"
                :value="getHeightCalc(e)"
                :disabled="readOnly"
                @change="(ev) => updateHeightCalc(e, (ev.target as HTMLInputElement).value)"
                @mousedown.stop
                draggable="false"
                class="height-input"
                :style="{ width: cellWidth + 'px' }"
                :placeholder="String(e.maxBoardHeight)"
                title="高度计算结果（如4进5，不影响表格）"
              />
            </div>
            <table class="stair-table" :style="{ '--cell-width': cellWidth + 'px', width: displayEmotions.length * cellWidth + 'px' }">
              <thead>
                <tr>
                  <th
                    v-for="e in displayEmotions"
                    :key="e.id"
                    class="date-header"
                  :class="{ 'has-date-tag': getActiveDateTagDefs(e).length > 0 }"
                  @click="!readOnly && handleDateClick(e)"
                  :title="readOnly ? '' : '点击设置日期节点标签'"
                >
                    {{ e.date.slice(5) }}
                    <span class="date-badges">
                      <span
                        v-for="def in getActiveDateTagDefs(e)"
                        :key="def.key"
                        class="date-tag-badge"
                        :style="{ background: def.color }"
                      >{{ def.badge || def.name.slice(0, 1) }}</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="h in heightRange"
                  :key="h"
                  :class="{ 'row-highlight': hoveredHeight === h }"
                  @mouseenter="hoveredHeight = h"
                  @mouseleave="hoveredHeight = null"
                >
                  <td
                    v-for="(e, idx) in displayEmotions"
                    :key="e.id"
                    class="cell"
                    :class="[getCellClass(e, h, idx), { 'is-editable': !readOnly }]"
                    :title="readOnly ? (e.remark || '') : (e.remark || '点击录入该网格数据')"
                    @click="!readOnly && handleCellClick(e, h)"
                  >
                    <template v-if="hasStockAtHeight(e, h)">
                      <div class="cell-content">
                        <span
                          class="stock-name"
                          :class="{ clickable: !readOnly }"
                          @click.stop="!readOnly && handleCellClick(e, h)"
                          :title="readOnly ? '' : '点击编辑'"
                        >
                          {{ getStockAtHeight(e, h)?.name }}
                        </span>
                        <div class="badge-row">
                          <span
                            v-for="tag in getActiveTagDefs(e, h)"
                            :key="tag.key"
                            class="dynamic-badge"
                            :style="{ background: tag.color }"
                          >{{ tag.badge || tag.name.slice(0, 1) }}</span>
                        </div>
                      </div>
                      <span v-if="!readOnly" class="edit-hint" @click.stop="handleCellClick(e, h)">✎</span>
                    </template>
                    <template v-else-if="h === e.maxBoardHeight">
                      <div class="cell-content">
                        <span
                          class="stock-name"
                          :class="{ clickable: !readOnly }"
                          @click.stop="!readOnly && handleCellClick(e, h)"
                          :title="readOnly ? '' : '点击编辑'"
                        >
                          {{ getFirstStock(e)?.name || '-' }}
                        </span>
                        <div class="badge-row">
                          <span
                            v-for="tag in getActiveTagDefs(e, h)"
                            :key="tag.key"
                            class="dynamic-badge"
                            :style="{ background: tag.color }"
                          >{{ tag.badge || tag.name.slice(0, 1) }}</span>
                        </div>
                      </div>
                      <span v-if="!readOnly" class="edit-hint" @click.stop="handleCellClick(e, h)">✎</span>
                    </template>
                    <template v-else-if="h <= e.maxBoardHeight">
                      <span class="fill-dot" @click.stop="!readOnly && handleCellClick(e, h)"></span>
                    </template>
                    <template v-else-if="!readOnly">
                      <span
                        class="add-hint"
                        :class="{ visible: h === e.maxBoardHeight + 1 }"
                        @click.stop="handleCellClick(e, h)"
                      >+</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 拖拽滚动条 -->
        <div
          class="custom-scrollbar"
          :class="{ 'is-disabled': !showScrollbar }"
          ref="scrollbarRef"
          @mousedown="onScrollbarMouseDown"
        >
          <div
            class="scrollbar-thumb"
            :style="{ width: thumbWidth + '%', left: thumbLeft + '%' }"
          ></div>
        </div>
      </div>
    </div>
    <div v-else class="empty-hint">暂无数据</div>

    <!-- 抱团标的：日期列与上方天梯图保持同步 -->
    <section v-if="displayEmotions.length > 0" class="cluster-section">
      <div class="cluster-header">
        <div class="cluster-heading">
          <strong>抱团标的</strong>
          <small>逐日记录走势与涨跌幅</small>
          <router-link to="/emotion-cluster" class="cluster-module-link">进入情绪抱团 →</router-link>
        </div>
        <form v-if="!readOnly" class="cluster-add-form" @submit.prevent="addClusterTarget">
          <input v-model.trim="newClusterTargetName" type="text" placeholder="输入标的名称" maxlength="30" />
          <button type="submit" class="btn-primary">+ 添加标的</button>
        </form>
      </div>

      <div v-if="clusterTargets.length > 0" class="cluster-matrix">
        <div class="cluster-target-column">
          <div class="cluster-corner">标的 / 日期</div>
          <div v-for="(target, targetIndex) in clusterTargets" :key="target.id" class="cluster-target-name" :title="target.name">
            <span>{{ target.name }}</span>
            <div v-if="!readOnly" class="cluster-target-controls">
              <button
                type="button"
                title="上移"
                :disabled="targetIndex === 0"
                @click="moveClusterTarget(target, 'up')"
              >↑</button>
              <button
                type="button"
                title="下移"
                :disabled="targetIndex === clusterTargets.length - 1"
                @click="moveClusterTarget(target, 'down')"
              >↓</button>
              <button
                type="button"
                class="cluster-archive-button"
                title="保存到历史"
                @click="archiveClusterTarget(target)"
              >存</button>
              <button
                type="button"
                class="cluster-delete-button"
                title="删除标的"
                @click="removeClusterTarget(target)"
              >×</button>
            </div>
          </div>
        </div>

        <div ref="clusterScrollRef" class="cluster-scroll" @scroll="onClusterScroll">
          <div class="cluster-grid" :style="{ width: displayEmotions.length * cellWidth + 'px' }">
            <div class="cluster-date-row">
              <div
                v-for="e in displayEmotions"
                :key="`cluster-date-${e.id}`"
                class="cluster-date-cell"
                :style="{ width: cellWidth + 'px' }"
              >{{ e.date.slice(5) }}</div>
            </div>
            <div v-for="target in clusterTargets" :key="target.id" class="cluster-target-row">
              <button
                v-for="e in displayEmotions"
                :key="`${target.id}-${e.date}`"
                type="button"
                class="cluster-cell"
                :class="getClusterCellClass(target, e.date)"
                :style="{ width: cellWidth + 'px' }"
                :disabled="readOnly"
                :title="getClusterCellTitle(target, e.date)"
                @click="openClusterEntry(target, e.date)"
              >
                <template v-if="target.entries[e.date]">
                  <span class="cluster-trend">{{ target.entries[e.date].trend || '—' }}</span>
                  <b v-if="target.entries[e.date].changePercent !== null" class="cluster-change">
                    {{ formatChangePercent(target.entries[e.date].changePercent) }}
                  </b>
                </template>
                <span v-else class="cluster-empty-cell">{{ readOnly ? '—' : '+' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="cluster-empty">
        {{ readOnly ? '暂无抱团标的记录' : '添加标的后，可按日期填写走势和涨跌幅。' }}
      </div>
    </section>

    <!-- 题材梯队热力概览：与天梯图和抱团标的共用日期轴 -->
    <section v-if="displayEmotions.length > 0" class="theme-ladder-section">
      <div class="theme-ladder-header">
        <div class="theme-ladder-heading">
          <strong>题材梯队记录</strong>
          <small>按日期自由记录题材、梯队和核心标的</small>
        </div>
      </div>

      <div class="theme-ladder-matrix">
        <div ref="themeScrollRef" class="theme-ladder-scroll" @scroll="onThemeScroll">
          <div class="theme-ladder-grid" :style="{ width: displayEmotions.length * cellWidth + 'px' }">
            <div class="theme-ladder-date-row">
              <div v-for="e in displayEmotions" :key="`theme-date-${e.id}`" class="theme-ladder-date" :style="{ width: cellWidth + 'px' }">
                {{ e.date.slice(5) }}
              </div>
            </div>
            <div class="theme-ladder-card-row">
              <div v-for="e in displayEmotions" :key="`theme-day-${e.id}`" class="theme-day-column" :style="{ width: cellWidth + 'px' }">
                <button
                  :key="`theme-card-${e.date}`"
                  type="button"
                  class="theme-topic-card"
                  :class="{ empty: !getThemeDailyContent(e.date), active: editingThemeCell?.date === e.date }"
                  :title="getThemeDailyContent(e.date) || '点击记录当天全部题材梯队'"
                  @click="openThemeEntry(e.date)"
                >
                  <span class="theme-card-topic-name">当日题材梯队</span>
                  <span class="theme-card-content">{{ getThemeDailyContent(e.date) || (readOnly ? '—' : '+ 点击记录') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="editingThemeCell" ref="themeExpandedRef" class="theme-expanded-card">
        <div class="theme-expanded-header">
          <div>
            <strong>{{ editingThemeCell.date }} · 当日题材梯队</strong>
            <small>{{ readOnly ? '放大查看' : '可直接编辑当天全部内容' }}</small>
          </div>
          <button type="button" class="btn-close" title="收起" @click="closeThemeEntry">×</button>
        </div>
        <div class="theme-expanded-body">
          <textarea
            v-model="themeEntryForm.content"
            :readonly="readOnly"
            rows="12"
            placeholder="自由填写，例如：&#10;机器人：5板A公司，3板B公司、C公司，首板12家&#10;低空经济：4板D公司（分支龙头），2板3家&#10;端侧AI：3板E公司（同梯队唯一）"
          ></textarea>
        </div>
        <div class="theme-expanded-footer">
          <template v-if="!readOnly">
            <button class="btn-danger" @click="clearThemeEntry">清空当天</button>
            <button class="btn-secondary" @click="closeThemeEntry">取消</button>
            <button class="btn-primary" @click="saveThemeEntry">保存梯队</button>
          </template>
          <button v-else class="btn-secondary" @click="closeThemeEntry">收起</button>
        </div>
      </div>
    </section>

    <!-- 日期节点标签弹窗 -->
    <div v-if="editingDate" class="edit-modal" @click.self="closeDateEdit">
      <div class="edit-dialog date-tag-dialog">
        <div class="edit-header">
          <span>{{ editingDate.date }} · 日期节点</span>
          <button class="btn-close" @click="closeDateEdit">×</button>
        </div>
        <div class="edit-body">
          <p class="date-tag-help">可选择一个或多个节点标签，保存后同步到折线图。</p>
          <div class="date-tag-grid">
            <label v-for="def in stairDateTagDefs" :key="def.key" class="date-tag-option">
              <input v-model="dateTagKeys" type="checkbox" :value="def.key" />
              <span :style="{ background: def.color }">{{ def.badge || def.name.slice(0, 1) }}</span>
              <b>{{ def.name }}</b>
              <small>{{ def.description }}</small>
            </label>
          </div>
          <div v-if="stairDateTagDefs.length === 0" class="empty-hint">请先在标签管理中创建天梯日期标签。</div>
        </div>
        <div class="edit-footer">
          <button class="btn-danger" @click="clearDateTags">清除标记</button>
          <button class="btn-secondary" @click="closeDateEdit">取消</button>
          <button class="btn-primary" @click="saveDateTags">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editingCell" class="edit-modal" @click.self="closeEdit">
      <div class="edit-dialog">
        <div class="edit-header">
          <span>{{ editingCell.date.slice(5) }} - {{ editingCell.height }}板</span>
          <button class="btn-close" @click="closeEdit">×</button>
        </div>
        <div class="edit-body">
          <div class="edit-row">
            <label>选择个股</label>
            <select v-model="editForm.selectedStockId" @change="onStockSelect" class="stock-select">
              <option value="">手动输入</option>
              <option v-for="s in stockStore.stocks" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.code }})
              </option>
            </select>
          </div>
          <div class="edit-row" v-if="!editForm.selectedStockId">
            <label>股票名称</label>
            <input
              v-model="editForm.stockName"
              type="text"
              placeholder="输入股票名称"
              @keyup.enter="saveEdit"
              ref="editInputRef"
            />
          </div>
          <div class="tag-grid">
            <label v-for="def in stairTagDefs" :key="def.key" class="dynamic-tag-option">
              <input type="checkbox" :value="def.key" v-model="editForm.tagKeys" />
              <span class="tag-preview" :style="{ background: def.color }">{{ def.badge || def.name.slice(0, 1) }}</span>
              {{ def.name }}
            </label>
          </div>
          <div class="edit-row">
            <label>备注信息</label>
            <textarea v-model="editForm.remark" placeholder="输入备注..." rows="2"></textarea>
          </div>
        </div>
        <div class="edit-footer">
          <button class="btn-danger" v-if="hasExistingStock" @click="deleteEdit">删除</button>
          <button class="btn-secondary" @click="closeEdit">取消</button>
          <button class="btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 抱团标的每日记录弹窗 -->
    <div v-if="editingClusterCell" class="edit-modal" @click.self="closeClusterEntry">
      <div class="edit-dialog cluster-edit-dialog">
        <div class="edit-header">
          <span>{{ editingClusterCell.targetName }} · {{ editingClusterCell.date }}</span>
          <button class="btn-close" @click="closeClusterEntry">×</button>
        </div>
        <div class="edit-body">
          <div class="edit-row">
            <label>当日走势</label>
            <input
              v-model.trim="clusterEntryForm.trend"
              type="text"
              maxlength="40"
              placeholder="例如：高开回落、弱转强、横盘震荡"
              @keyup.enter="saveClusterEntry"
            />
          </div>
          <div class="edit-row">
            <label>涨跌幅（%）</label>
            <input
              ref="clusterChangeInputRef"
              v-model="clusterEntryForm.changePercent"
              type="number"
              step="0.01"
              placeholder="例如：5.68 或 -3.20"
              @keyup.enter="saveClusterEntry"
            />
          </div>
        </div>
        <div class="edit-footer">
          <button class="btn-danger" @click="clearClusterEntry">清空当天</button>
          <button class="btn-secondary" @click="closeClusterEntry">取消</button>
          <button class="btn-primary" @click="saveClusterEntry">保存</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { EmotionClusterTarget, EmotionDaily, SpaceBoardStock, ThemeLadderTopic } from '@/types'
import { useEmotionStore } from '@/stores/emotion'
import { useStockStore } from '@/stores/stock'
import { useReviewStore } from '@/stores/review'
import { useIndependentLabelStore } from '@/stores/independentLabel'
import { useEmotionClusterStore } from '@/stores/emotionCluster'
import { useEmotionAnchorStore } from '@/stores/emotionAnchor'
import { useThemeLadderStore } from '@/stores/themeLadder'
import { buildContinuousBoardPromotionRates } from '@/composables/useEmotionMetrics'

const props = defineProps<{
  emotions: EmotionDaily[]
  dateRange?: number
  title?: string
  chartId?: string
  readOnly?: boolean
}>()

// 自定义标题（支持持久化，每个chartId独立存储）
const storageKey = computed(() => `stairChartTitle_${props.chartId || props.title || 'default'}`)
const customTitle = ref('')
const editingTitle = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)

// 从localStorage加载自定义标题
function loadCustomTitle() {
  const saved = localStorage.getItem(storageKey.value)
  customTitle.value = saved || props.title || '连板楼梯图'
}

// 显示标题：优先显示自定义标题
const displayTitle = computed(() => customTitle.value || props.title || '连板楼梯图')

// 兼容旧代码
const title = computed(() => displayTitle.value)

function startEditTitle() {
  editingTitle.value = true
  customTitle.value = displayTitle.value
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function saveTitle() {
  const trimmed = customTitle.value.trim()
  if (trimmed) {
    localStorage.setItem(storageKey.value, trimmed)
    customTitle.value = trimmed
  } else {
    // 空值时恢复默认
    localStorage.removeItem(storageKey.value)
    customTitle.value = props.title || '连板楼梯图'
  }
  editingTitle.value = false
}

function cancelEditTitle() {
  editingTitle.value = false
  customTitle.value = displayTitle.value
}

// 初始化加载
loadCustomTitle()

const router = useRouter()
const emotionStore = useEmotionStore()
const stockStore = useStockStore()
const reviewStore = useReviewStore()
const labelStore = useIndependentLabelStore()
const clusterStore = useEmotionClusterStore()
const anchorStore = useEmotionAnchorStore()
const themeLadderStore = useThemeLadderStore()
const stairTagDefs = computed(() => labelStore.sortedLabels.filter(l => l.category === 'stair'))
const stairDateTagDefs = computed(() => labelStore.sortedLabels.filter(l => l.category === 'stairDate'))
const promotionRates = computed(() => buildContinuousBoardPromotionRates(props.emotions))

function formatPercent(value: number) {
  return `${Number(value.toFixed(1))}%`
}

function getAnchorResult(date: string) {
  const record = anchorStore.records.find(item => item.date === date)
  if (!record) return null
  const result = anchorStore.stats(record)
  return result.judged > 0 ? result : null
}

function getAnchorResultTitle(date: string) {
  const result = getAnchorResult(date)
  if (!result) return '当日暂无情绪锚定判断'
  return `${result.label} · 综合得分 ${result.score} · 超预期 ${result.above} · 符合预期 ${result.match} · 低预期 ${result.below}`
}

function getAnchorResultClass(date: string) {
  const label = getAnchorResult(date)?.label
  return {
    'strong-repair': label === '强修复',
    'weak-repair': label === '弱修复',
    'weak-diverge': label === '弱分歧',
    'strong-diverge': label === '强分歧'
  }
}

function getDateTagKeys(e: EmotionDaily) {
  const keys = new Set(e.stairDateTags || [])
  // 兼容旧版已保存的布尔标记。
  if (e.isClear) keys.add('isClear')
  if (e.isLeaderBreak) keys.add('isLeaderBreak')
  return [...keys]
}

function getActiveDateTagDefs(e: EmotionDaily) {
  const active = getDateTagKeys(e)
  return stairDateTagDefs.value.filter(def => active.includes(def.key))
}

// ===== 独立标签管理系统 =====
// 每个图表实例独立存储标签数据，不共享
interface TagFlags {
  isBreakthrough: boolean
  isMedian: boolean
  isIcePoint: boolean
  isAnnouncement: boolean
  isSpaceFirst: boolean
  isSpace: boolean
  isNextDayBroken: boolean
  isNextDayNoPremium: boolean
  isNextDayPremium: boolean
  tags?: string[]
}

const STAIR_FLAG_KEYS = [
  'isBreakthrough',
  'isMedian',
  'isIcePoint',
  'isAnnouncement',
  'isSpaceFirst',
  'isSpace',
  'isNextDayBroken',
  'isNextDayNoPremium',
  'isNextDayPremium'
]

const tagStorageKey = computed(() => `stairChartTags_${props.chartId || 'default'}`)
const tagOverrides = ref<Record<string, Record<string, TagFlags>>>({})

// 从localStorage加载标签覆盖数据
function loadTagOverrides() {
  const saved = localStorage.getItem(tagStorageKey.value)
  if (saved) {
    try {
      tagOverrides.value = JSON.parse(saved)
    } catch {
      tagOverrides.value = {}
    }
  }
}

// 保存标签覆盖数据到localStorage
function persistTagOverrides() {
  localStorage.setItem(tagStorageKey.value, JSON.stringify(tagOverrides.value))
  // 通知其他组件标签已更新
  window.dispatchEvent(new CustomEvent('stairChartTagsUpdated', { detail: { chartId: props.chartId } }))
}

// 生成个股标签的key
function getStockTagKey(stockName: string, height: number): string {
  return `${stockName}_${height}`
}

// 获取某只股票的标签覆盖
function getStockTags(date: string, stockName: string, height: number): TagFlags | null {
  const dateTags = tagOverrides.value[date]
  if (!dateTags) return null
  return dateTags[getStockTagKey(stockName, height)] || null
}

// 设置某只股票的标签覆盖
function setStockTags(date: string, stockName: string, height: number, tags: TagFlags) {
  if (!tagOverrides.value[date]) {
    tagOverrides.value[date] = {}
  }
  tagOverrides.value[date][getStockTagKey(stockName, height)] = tags
  persistTagOverrides()
}

// 删除某只股票的标签覆盖
function removeStockTags(date: string, stockName: string, height: number) {
  if (tagOverrides.value[date]) {
    delete tagOverrides.value[date][getStockTagKey(stockName, height)]
    persistTagOverrides()
  }
}

// 合并基础数据和标签覆盖
function applyTagOverrides(e: EmotionDaily, stock: SpaceBoardStock | null): SpaceBoardStock | null {
  if (!stock) return null
  const tags = getStockTags(e.date, stock.name, stock.height)
  if (tags) {
    return {
      ...stock,
      isBreakthrough: tags.isBreakthrough,
      isMedian: tags.isMedian,
      isIcePoint: tags.isIcePoint,
      isAnnouncement: tags.isAnnouncement,
      isSpaceFirst: tags.isSpaceFirst,
      isSpace: tags.isSpace,
      isNextDayBroken: tags.isNextDayBroken,
      isNextDayNoPremium: tags.isNextDayNoPremium,
      isNextDayPremium: tags.isNextDayPremium
    }
  }
  // 没有覆盖表时使用基础数据中的标签
  return stock
}

// 初始化加载标签数据
loadTagOverrides()

// ===== 独立高度计算存储 =====
// 每个图表实例独立存储heightCalc，不共享
const heightCalcStorageKey = computed(() => `stairChartHeightCalc_${props.chartId || 'default'}`)
const heightCalcOverrides = ref<Record<string, string>>({})

function loadHeightCalcOverrides() {
  const saved = localStorage.getItem(heightCalcStorageKey.value)
  if (saved) {
    try {
      heightCalcOverrides.value = JSON.parse(saved)
    } catch {
      heightCalcOverrides.value = {}
    }
  }
}

function persistHeightCalcOverrides() {
  localStorage.setItem(heightCalcStorageKey.value, JSON.stringify(heightCalcOverrides.value))
}

// 获取某日的高度计算值（优先使用独立覆盖表）
function getHeightCalc(e: EmotionDaily): string {
  return heightCalcOverrides.value[e.date] ?? e.heightCalc ?? ''
}

// 更新高度计算结果（独立存储，不共享）
function updateHeightCalc(e: EmotionDaily, value: string) {
  heightCalcOverrides.value[e.date] = value.trim()
  persistHeightCalcOverrides()
}

// 初始化加载高度计算数据
loadHeightCalcOverrides()

// ===== 抱团标的逐日记录（与“情绪抱团”模块共用数据） =====
const clusterTargets = computed(() => clusterStore.activeTargets)
const newClusterTargetName = ref('')
const editingClusterCell = ref<{ targetId: string; targetName: string; date: string } | null>(null)
const clusterChangeInputRef = ref<HTMLInputElement | null>(null)
const clusterEntryForm = ref<{ trend: string; changePercent: string | number }>({
  trend: '',
  changePercent: ''
})

function addClusterTarget() {
  const name = newClusterTargetName.value.trim()
  if (!name) return
  if (clusterStore.targets.some(target => target.name === name)) {
    window.alert('该抱团标的已存在。')
    return
  }
  clusterStore.addTarget({ name, code: undefined, theme: undefined, note: '' })
  newClusterTargetName.value = ''
}

function removeClusterTarget(target: EmotionClusterTarget) {
  if (!window.confirm(`确定删除抱团标的“${target.name}”及其全部每日记录吗？`)) return
  clusterStore.deleteTarget(target.id)
}

function moveClusterTarget(target: EmotionClusterTarget, direction: 'up' | 'down') {
  clusterStore.moveTarget(target.id, direction)
}

function archiveClusterTarget(target: EmotionClusterTarget) {
  clusterStore.archiveTarget(target.id)
}

function openClusterEntry(target: EmotionClusterTarget, date: string) {
  if (props.readOnly) return
  const entry = target.entries[date]
  editingClusterCell.value = { targetId: target.id, targetName: target.name, date }
  clusterEntryForm.value = {
    trend: entry?.trend || '',
    changePercent: entry?.changePercent === null || entry?.changePercent === undefined
      ? ''
      : String(entry.changePercent)
  }
  nextTick(() => {
    clusterChangeInputRef.value?.focus()
    clusterChangeInputRef.value?.select()
  })
}

function closeClusterEntry() {
  editingClusterCell.value = null
  clusterEntryForm.value = { trend: '', changePercent: '' }
}

function saveClusterEntry() {
  if (!editingClusterCell.value) return
  const target = clusterStore.targets.find(item => item.id === editingClusterCell.value?.targetId)
  if (!target) return
  const rawChange = String(clusterEntryForm.value.changePercent ?? '').trim()
  const parsedChange = rawChange === '' ? null : Number(rawChange)
  if (parsedChange !== null && !Number.isFinite(parsedChange)) {
    window.alert('请输入正确的涨跌幅。')
    return
  }
  const trend = clusterEntryForm.value.trend.trim()
  if (!trend && parsedChange === null) {
    clusterStore.clearEntry(target.id, editingClusterCell.value.date)
  } else {
    clusterStore.saveEntry(target.id, editingClusterCell.value.date, {
      trend,
      changePercent: parsedChange,
      note: target.entries[editingClusterCell.value.date]?.note || ''
    })
  }
  closeClusterEntry()
}

function clearClusterEntry() {
  if (!editingClusterCell.value) return
  const target = clusterStore.targets.find(item => item.id === editingClusterCell.value?.targetId)
  if (target) {
    clusterStore.clearEntry(target.id, editingClusterCell.value.date)
  }
  closeClusterEntry()
}

function formatChangePercent(value: number | null) {
  if (value === null) return '—'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${Number(value.toFixed(2))}%`
}

function getClusterCellClass(target: EmotionClusterTarget, date: string) {
  const value = target.entries[date]?.changePercent
  return {
    'has-entry': !!target.entries[date],
    gain: typeof value === 'number' && value > 0,
    loss: typeof value === 'number' && value < 0,
    flat: value === 0
  }
}

function getClusterCellTitle(target: EmotionClusterTarget, date: string) {
  const entry = target.entries[date]
  if (!entry) return props.readOnly ? '暂无记录' : '点击记录当日走势和涨跌幅'
  return [entry.trend, entry.changePercent === null ? '' : formatChangePercent(entry.changePercent)]
    .filter(Boolean)
    .join(' · ')
}

// ===== 题材梯队热力概览 =====
const DAILY_THEME_TOPIC_NAME = '__daily_theme_ladder__'
const editingThemeCell = ref<{ date: string } | null>(null)
const themeEntryForm = ref({ content: '' })
const themeExpandedRef = ref<HTMLElement | null>(null)

function openThemeEntry(date: string) {
  editingThemeCell.value = { date }
  themeEntryForm.value = { content: getThemeDailyContent(date) }
  nextTick(() => themeExpandedRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

function closeThemeEntry() {
  editingThemeCell.value = null
  themeEntryForm.value = { content: '' }
}

function saveThemeEntry() {
  if (!editingThemeCell.value) return
  const date = editingThemeCell.value.date
  const content = themeEntryForm.value.content.trim()
  if (!content) {
    clearThemeDateEntries(date)
    closeThemeEntry()
    return
  }
  let targetTopic = themeLadderStore.topics.find(topic => topic.name === DAILY_THEME_TOPIC_NAME)
  targetTopic ||= themeLadderStore.addTopic(DAILY_THEME_TOPIC_NAME) || undefined
  if (!targetTopic) return
  const oldTopicIds = themeLadderStore.topics
    .filter(topic => topic.id !== targetTopic?.id && !!topic.entries[date])
    .map(topic => topic.id)
  for (const topicId of oldTopicIds) themeLadderStore.clearEntry(topicId, date)
  themeLadderStore.saveEntry(targetTopic.id, date, {
    content,
    stocks: [],
    heightCounts: {},
    note: ''
  })
  for (const topicId of oldTopicIds) removeThemeTopicIfEmpty(topicId)
  closeThemeEntry()
}

function removeThemeTopicIfEmpty(topicId: string) {
  const topic = themeLadderStore.topics.find(item => item.id === topicId)
  if (topic && Object.keys(topic.entries).length === 0) themeLadderStore.deleteTopic(topicId)
}

function clearThemeEntry() {
  if (!editingThemeCell.value) return
  clearThemeDateEntries(editingThemeCell.value.date)
  closeThemeEntry()
}

function clearThemeDateEntries(date: string) {
  const topicIds = themeLadderStore.topics.filter(topic => !!topic.entries[date]).map(topic => topic.id)
  for (const topicId of topicIds) themeLadderStore.clearEntry(topicId, date)
  for (const topicId of topicIds) removeThemeTopicIfEmpty(topicId)
}

function getThemeEntryContent(entry?: ThemeLadderTopic['entries'][string]) {
  if (!entry) return ''
  if (entry.content?.trim()) return entry.content.trim()
  const lines: string[] = []
  const counts = { ...(entry.heightCounts || {}) }
  for (const stock of entry.stocks || []) {
    const key = String(stock.height)
    const namedCount = entry.stocks.filter(item => item.height === stock.height).length
    counts[key] = Math.max(counts[key] || 0, namedCount)
  }
  const ladder = Object.keys(counts)
    .map(Number)
    .filter(height => Number.isFinite(height) && counts[String(height)] > 0)
    .sort((a, b) => b - a)
    .map(height => `${height}板：${counts[String(height)]}家`)
  if (ladder.length) lines.push(ladder.join('，'))
  for (const stock of entry.stocks || []) {
    const roles = [stock.role === 'leader' ? '题材龙头' : '', stock.role === 'branchLeader' ? `分支龙头${stock.branch ? `·${stock.branch}` : ''}` : '', stock.isUnique ? '同梯队唯一' : ''].filter(Boolean)
    lines.push(`${stock.height}板：${stock.name}${roles.length ? `（${roles.join('、')}）` : ''}`)
  }
  if (entry.limitUpCount !== undefined) lines.push(`板块涨停：${entry.limitUpCount}家`)
  if (entry.marketRank !== undefined) lines.push(`全市场排名：${entry.marketRank}`)
  if (entry.note) lines.push(entry.note)
  return lines.join('\n')
}

function getThemeDailyContent(date: string) {
  const dailyTopic = themeLadderStore.topics.find(topic => topic.name === DAILY_THEME_TOPIC_NAME)
  const dailyContent = getThemeEntryContent(dailyTopic?.entries[date])
  if (dailyContent) return dailyContent
  return themeLadderStore.topics
    .filter(topic => topic.name !== DAILY_THEME_TOPIC_NAME && !!topic.entries[date])
    .map(topic => {
      const content = getThemeEntryContent(topic.entries[date])
      return content ? `${topic.name}：\n${content}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

// 连板楼梯图独立的显示范围控制
const timeRanges = [
  { label: '10天', value: 10 },
  { label: '20天', value: 20 },
  { label: '30天', value: 30 },
  { label: '60天', value: 60 },
  { label: '全部', value: 'all' }
]
const stairRange = ref<number | string>(20)
const customStairRange = ref<number | null>(null)

// 根据独立 range 截取的显示数据（props.emotions 为从旧到新的全部数据）
const displayEmotions = computed(() => {
  if (stairRange.value === 'all') {
    return props.emotions
  }
  return props.emotions.slice(-stairRange.value)
})

function applyCustomStairRange() {
  if (customStairRange.value && customStairRange.value >= 1 && customStairRange.value <= 365) {
    stairRange.value = customStairRange.value
    customStairRange.value = null
  }
}

// 拖拽滚动条
const scrollContainerRef = ref<HTMLElement | null>(null)
const clusterScrollRef = ref<HTMLElement | null>(null)
const themeScrollRef = ref<HTMLElement | null>(null)
const scrollbarRef = ref<HTMLElement | null>(null)
const thumbWidth = ref(100)
const thumbLeft = ref(0)
const showScrollbar = ref(false)
const isDragging = ref(false)
let resizeObserver: ResizeObserver | null = null

function updateScrollbar() {
  const el = scrollContainerRef.value
  if (!el) return
  
  // 强制重新计算布局
  el.offsetHeight // 触发 reflow
  
  const { scrollWidth, clientWidth, scrollLeft } = el
  
  if (scrollWidth <= clientWidth + 1) {
    // 不需要滚动：thumb 占满轨道，禁用拖动
    showScrollbar.value = false
    thumbWidth.value = 100
    thumbLeft.value = 0
    return
  }
  showScrollbar.value = true
  thumbWidth.value = (clientWidth / scrollWidth) * 100
  thumbLeft.value = (scrollLeft / (scrollWidth - clientWidth)) * (100 - thumbWidth.value)
}

function onScroll() {
  const main = scrollContainerRef.value
  const cluster = clusterScrollRef.value
  const theme = themeScrollRef.value
  if (main && cluster && Math.abs(cluster.scrollLeft - main.scrollLeft) > 0.5) {
    cluster.scrollLeft = main.scrollLeft
  }
  if (main && theme && Math.abs(theme.scrollLeft - main.scrollLeft) > 0.5) {
    theme.scrollLeft = main.scrollLeft
  }
  // 拖动时也需要更新 thumb 位置（提供视觉反馈）
  updateScrollbar()
}

function onClusterScroll() {
  const main = scrollContainerRef.value
  const cluster = clusterScrollRef.value
  const theme = themeScrollRef.value
  if (main && cluster && Math.abs(main.scrollLeft - cluster.scrollLeft) > 0.5) {
    main.scrollLeft = cluster.scrollLeft
  }
  if (cluster && theme && Math.abs(theme.scrollLeft - cluster.scrollLeft) > 0.5) {
    theme.scrollLeft = cluster.scrollLeft
  }
}

function onThemeScroll() {
  const main = scrollContainerRef.value
  const cluster = clusterScrollRef.value
  const theme = themeScrollRef.value
  if (main && theme && Math.abs(main.scrollLeft - theme.scrollLeft) > 0.5) {
    main.scrollLeft = theme.scrollLeft
  }
  if (cluster && theme && Math.abs(cluster.scrollLeft - theme.scrollLeft) > 0.5) {
    cluster.scrollLeft = theme.scrollLeft
  }
}

function onScrollbarMouseDown(e: MouseEvent) {
  const el = scrollContainerRef.value
  const bar = scrollbarRef.value
  const thumb = bar?.querySelector('.scrollbar-thumb') as HTMLElement | null
  if (!el || !bar || !showScrollbar.value) return
  
  // 判断点击位置是否在 thumb 上
  const barRect = bar.getBoundingClientRect()
  const clickX = e.clientX - barRect.left
  const thumbWidthPx = (thumbWidth.value / 100) * barRect.width
  const thumbLeftPx = (thumbLeft.value / 100) * barRect.width
  
  let dragStartScrollLeft = el.scrollLeft
  let dragStartClientX = e.clientX
  
  if (clickX >= thumbLeftPx && clickX <= thumbLeftPx + thumbWidthPx) {
    // 点击在 thumb 上：记录 thumb 内偏移，实现精准拖动
    const thumbOffset = clickX - thumbLeftPx
    dragStartScrollLeft = el.scrollLeft
    dragStartClientX = e.clientX
    
    isDragging.value = true
    e.preventDefault()
    document.body.style.userSelect = 'none'
    
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartClientX
      // 将像素位移转换为滚动比例
      const maxScroll = el.scrollWidth - el.clientWidth
      // thumb 可移动范围 = 轨道宽度 - thumb 宽度
      const thumbMovablePx = barRect.width - thumbWidthPx
      if (thumbMovablePx <= 0) return
      // 滚动量 = 像素位移 × (最大滚动量 / thumb可移动范围)
      const scrollDelta = dx * (maxScroll / thumbMovablePx)
      el.scrollLeft = Math.max(0, Math.min(maxScroll, dragStartScrollLeft + scrollDelta))
    }
    
    const onUp = () => {
      isDragging.value = false
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  } else {
    // 点击在轨道空白处：跳转使该位置位于 thumb 中心
    const thumbCenterRatio = clickX / barRect.width - thumbWidth.value / 200
    const targetRatio = Math.max(0, Math.min(1 - thumbWidth.value / 100, thumbCenterRatio))
    const maxScroll = el.scrollWidth - el.clientWidth
    el.scrollLeft = targetRatio * maxScroll
  }
}

onMounted(() => {
  // 多次延迟更新，确保表格完全渲染
  nextTick(() => {
    updateScrollbar()
    if (scrollContainerRef.value && clusterScrollRef.value) {
      clusterScrollRef.value.scrollLeft = scrollContainerRef.value.scrollLeft
    }
    if (scrollContainerRef.value && themeScrollRef.value) {
      themeScrollRef.value.scrollLeft = scrollContainerRef.value.scrollLeft
    }
    nextTick(updateScrollbar)
  })
  window.addEventListener('resize', updateScrollbar)

  // 监听容器尺寸变化
  if (scrollContainerRef.value) {
    resizeObserver = new ResizeObserver(() => updateScrollbar())
    resizeObserver.observe(scrollContainerRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollbar)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

watch(() => displayEmotions.value, () => {
  nextTick(() => {
    updateScrollbar()
    if (scrollContainerRef.value && clusterScrollRef.value) {
      clusterScrollRef.value.scrollLeft = scrollContainerRef.value.scrollLeft
    }
    if (scrollContainerRef.value && themeScrollRef.value) {
      themeScrollRef.value.scrollLeft = scrollContainerRef.value.scrollLeft
    }
    nextTick(updateScrollbar)
  })
}, { deep: true })

// 悬停行高亮
const hoveredHeight = ref<number | null>(null)

// 编辑状态
const editingCell = ref<{ date: string; height: number; emotion: EmotionDaily } | null>(null)
const editingDate = ref<EmotionDaily | null>(null)
const dateTagKeys = ref<string[]>([])
const editForm = ref({
  stockName: '',
  selectedStockId: '',
  tagKeys: [] as string[],
  remark: ''
})
const editInputRef = ref<HTMLInputElement | null>(null)

// 手动增加的额外高度层级
const extraHeight = ref(0)

// 计算高度范围：基于实际股票高度、maxBoardHeight 和手动调整的最大值
const heightRange = computed(() => {
  const data = displayEmotions.value
  if (data.length === 0) return []
  // 取所有股票的最大高度和 maxBoardHeight 中的最大值，最低7板
  let maxH = 7
  for (const e of data) {
    if (e.maxBoardHeight > maxH) maxH = e.maxBoardHeight
    if (e.spaceBoardStocks) {
      for (const s of e.spaceBoardStocks) {
        if (s.height > maxH) maxH = s.height
      }
    }
  }
  // 加上手动增加的层级
  maxH += extraHeight.value
  const range = []
  for (let i = maxH; i >= 1; i--) {
    range.push(i)
  }
  return range
})

// 增加高度层级
function addHeightLevel() {
  extraHeight.value++
}

// 减少高度层级
function removeHeightLevel() {
  if (extraHeight.value > 0) {
    extraHeight.value--
  }
}

// 动态计算单元格宽度
const cellWidth = computed(() => {
  const count = displayEmotions.value.length
  if (count <= 7) return 110
  if (count <= 10) return 100
  if (count <= 15) return 92
  return 84
})

// 是否有现有股票
const hasExistingStock = computed(() => {
  if (!editingCell.value) return false
  const { emotion, height } = editingCell.value
  return emotion.spaceBoardStocks?.some(s => s.height === height)
})

// 检查该高度是否有股票
function hasStockAtHeight(e: EmotionDaily, h: number): boolean {
  if (!e.spaceBoardStocks) return false
  return e.spaceBoardStocks.some(s => s.height === h)
}

// 获取该高度的股票信息（合并独立标签）
function getStockAtHeight(e: EmotionDaily, h: number): SpaceBoardStock | null {
  if (!e.spaceBoardStocks) return null
  const stock = e.spaceBoardStocks.find(s => s.height === h) || null
  return applyTagOverrides(e, stock)
}

// 获取第一个股票信息（优先返回最高板的股票，合并独立标签）
function getFirstStock(e: EmotionDaily): SpaceBoardStock | null {
  if (!e.spaceBoardStocks || e.spaceBoardStocks.length === 0) return null
  // 优先返回height等于maxBoardHeight的股票
  const maxStock = e.spaceBoardStocks.find(s => s.height === e.maxBoardHeight)
  return applyTagOverrides(e, maxStock || e.spaceBoardStocks[0])
}

function getActiveTagDefs(e: EmotionDaily, h: number) {
  const stock = getStockAtHeight(e, h) || getFirstStock(e)
  if (!stock) return []
  const overrides = getStockTags(e.date, stock.name, stock.height)
  const stockAny = stock as unknown as Record<string, unknown>
  const overridesAny = overrides as unknown as Record<string, unknown> | null
  const active: string[] = []
  for (const def of stairTagDefs.value) {
    if (STAIR_FLAG_KEYS.includes(def.key)) {
      const on = overridesAny ? !!overridesAny[def.key] : !!stockAny[def.key]
      if (on) active.push(def.key)
    } else if (overrides?.tags?.includes(def.key)) {
      active.push(def.key)
    }
  }
  return stairTagDefs.value.filter(def => active.includes(def.key))
}

// 获取单元格样式类
function getCellClass(e: EmotionDaily, h: number, idx: number): Record<string, boolean> {
  const classes: Record<string, boolean> = {}
  const stock = getStockAtHeight(e, h) || (h === e.maxBoardHeight ? getFirstStock(e) : null)

  if (stock) {
    classes['has-stock'] = true
    if (h === e.maxBoardHeight) {
      classes['max-height'] = true
    }
    // 从股票对象读取标签
    if (stock.isBreakthrough) {
      classes['breakthrough'] = true
    } else if (stock.isMedian) {
      classes['median'] = true
    } else if (stock.isIcePoint) {
      classes['ice-point'] = true
    }
    if (stock.isAnnouncement) {
      classes['announcement'] = true
    }
    if (stock.isSpaceFirst) {
      classes['space-first'] = true
    }
    if (stock.isSpace) {
      classes['space-board'] = true
    }
    if (stock.isNextDayBroken) {
      classes['next-day-broken'] = true
    }
    if (stock.isNextDayNoPremium) {
      classes['next-day-no-premium'] = true
    }
    if (stock.isNextDayPremium) {
      classes['next-day-premium'] = true
    }
  } else if (h <= e.maxBoardHeight) {
    classes['filled'] = true
  }

  return classes
}

// 跳转到个股详情
function goToStock(e: EmotionDaily, h: number) {
  const stock = getStockAtHeight(e, h) || getFirstStock(e)
  if (!stock) return

  // 如果有关联的stockId，跳转到详情页
  if (stock.stockId) {
    router.push(`/stocks/${stock.stockId}`)
  } else {
    // 否则尝试按名称查找
    const found = stockStore.stocks.find(s => s.name === stock.name)
    if (found) {
      router.push(`/stocks/${found.id}`)
    }
  }
}

// 选择个股时自动填充名称
function onStockSelect() {
  if (editForm.value.selectedStockId) {
    const stock = stockStore.stocks.find(s => s.id === editForm.value.selectedStockId)
    if (stock) {
      editForm.value.stockName = stock.name
    }
  }
}

// 点击单元格
function handleCellClick(e: EmotionDaily, h: number) {
  editingCell.value = { date: e.date, height: h, emotion: e }

  // 获取现有股票信息
  const existingStock = getStockAtHeight(e, h) || (h === e.maxBoardHeight ? getFirstStock(e) : null)

  const tagKeys = new Set<string>()
  if (existingStock) {
    const overrides = getStockTags(e.date, existingStock.name, existingStock.height)
    const stockAny = existingStock as unknown as Record<string, unknown>
    const overridesAny = overrides as unknown as Record<string, unknown> | null
    for (const def of stairTagDefs.value) {
      if (STAIR_FLAG_KEYS.includes(def.key)) {
        const active = overridesAny ? !!overridesAny[def.key] : !!stockAny[def.key]
        if (active) tagKeys.add(def.key)
      } else if (overrides?.tags?.includes(def.key)) {
        tagKeys.add(def.key)
      }
    }
  }

  editForm.value = {
    stockName: existingStock?.name || '',
    selectedStockId: existingStock?.stockId || '',
    tagKeys: [...tagKeys],
    remark: e.remark || ''
  }

  // 聚焦输入框
  nextTick(() => {
    editInputRef.value?.focus()
  })
}

// 关闭编辑
function closeEdit() {
  editingCell.value = null
}

// 点击日期，打开日期节点标签选择。
function handleDateClick(e: EmotionDaily) {
  editingDate.value = e
  dateTagKeys.value = getDateTagKeys(e)
}

function closeDateEdit() {
  editingDate.value = null
  dateTagKeys.value = []
}

function saveDateTags() {
  if (!editingDate.value) return
  const selected = [...new Set(dateTagKeys.value)]
  emotionStore.addOrUpdateEmotion({
    ...editingDate.value,
    stairDateTags: selected,
    isClear: selected.includes('isClear'),
    isLeaderBreak: selected.includes('isLeaderBreak')
  })
  window.dispatchEvent(new CustomEvent('stairChartTagsUpdated', {
    detail: { chartId: props.chartId, dateTags: true }
  }))
  closeDateEdit()
}

function clearDateTags() {
  dateTagKeys.value = []
  saveDateTags()
}

// 保存编辑
function saveEdit() {
  if (!editingCell.value) return

  const { emotion, height } = editingCell.value
  const stockName = editForm.value.stockName.trim()

  // 更新空间板股票列表（基础数据共享，不含标签）
  const stocks: SpaceBoardStock[] = emotion.spaceBoardStocks ? [...emotion.spaceBoardStocks] : []

  // 移除同高度的旧股票
  const existingIdx = stocks.findIndex(s => s.height === height)
  if (existingIdx >= 0) {
    stocks.splice(existingIdx, 1)
  }

  // 添加新股票（基础数据，标签独立存储）
  if (stockName) {
    stocks.push({
      name: stockName,
      height,
      stockId: editForm.value.selectedStockId || undefined
    })
  }

  // 计算新的最高板高度
  const maxBoardHeight = stocks.length > 0
    ? Math.max(...stocks.map(s => s.height))
    : emotion.maxBoardHeight

  // 更新情绪数据（基础数据，不含标签）
  emotionStore.addOrUpdateEmotion({
    ...emotion,
    maxBoardHeight,
    spaceBoardStocks: stocks,
    remark: editForm.value.remark.trim()
  })

  // 保存标签到独立的覆盖表（每个图表实例独立）
  if (stockName) {
    const selected = editForm.value.tagKeys
    setStockTags(emotion.date, stockName, height, {
      isBreakthrough: selected.includes('isBreakthrough'),
      isMedian: selected.includes('isMedian'),
      isIcePoint: selected.includes('isIcePoint'),
      isAnnouncement: selected.includes('isAnnouncement'),
      isSpaceFirst: selected.includes('isSpaceFirst'),
      isSpace: selected.includes('isSpace'),
      isNextDayBroken: selected.includes('isNextDayBroken'),
      isNextDayNoPremium: selected.includes('isNextDayNoPremium'),
      isNextDayPremium: selected.includes('isNextDayPremium'),
      tags: [...selected]
    })
  }

  closeEdit()
}

// 删除股票
function deleteEdit() {
  if (!editingCell.value) return

  const { emotion, height } = editingCell.value

  // 获取要删除的股票名称（用于清理标签覆盖）
  const stockToDelete = emotion.spaceBoardStocks?.find(s => s.height === height)

  // 更新空间板股票列表
  const stocks: SpaceBoardStock[] = emotion.spaceBoardStocks
    ? emotion.spaceBoardStocks.filter(s => s.height !== height)
    : []

  // 计算新的最高板高度
  const maxBoardHeight = stocks.length > 0
    ? Math.max(...stocks.map(s => s.height))
    : 0

  // 更新情绪数据
  emotionStore.addOrUpdateEmotion({
    ...emotion,
    maxBoardHeight,
    spaceBoardStocks: stocks
  })

  // 删除该图表实例中该股票的标签覆盖
  if (stockToDelete) {
    removeStockTags(emotion.date, stockToDelete.name, height)
  }

  closeEdit()
}
</script>

<style scoped>
.stair-chart {
  --stair-axis-width: 96px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 13px;
  font-weight: 500;
}

.chart-title.clickable {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.chart-title.clickable:hover {
  background: var(--bg-tertiary);
}

.edit-icon {
  font-size: 11px;
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.2s;
}

.chart-title.clickable:hover .edit-icon {
  opacity: 1;
}

.title-wrapper {
  display: flex;
  align-items: center;
}

.title-input {
  font-size: 13px;
  font-weight: 500;
  padding: 2px 6px;
  background: var(--bg-primary);
  border: 1px solid var(--color-blue);
  border-radius: 4px;
  color: var(--text-primary);
  outline: none;
  width: 160px;
}

/* 显示范围控制 */
.stair-range-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stair-range-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stair-range-btn {
  padding: 3px 10px;
  font-size: 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.stair-range-btn:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.stair-range-btn.active {
  background: var(--color-blue);
  color: #fff;
  border-color: var(--color-blue);
}

.stair-custom-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.stair-range-input {
  width: 56px;
  padding: 3px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  text-align: center;
}

.stair-range-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

.chart-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.dot.breakthrough { background: #f85149; }
.dot.median { background: #3fb950; }
.dot.ice { background: #58a6ff; }
.dot.announcement { background: #a855f7; }
.dot.clear { background: #8b949e; }

.chart-body {
  display: flex;
  gap: 8px;
}

.height-labels {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: var(--stair-axis-width);
}

.market-overview-label {
  width: 100%;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
}

.market-overview-label.up,
.market-overview-label.limit-up { color: var(--color-red); }
.market-overview-label.limit-down { color: var(--color-green); }
.market-overview-label.board-count { color: var(--color-gold); border-top: 2px solid var(--border-color); }
.market-overview-label.promotion-rate { color: var(--color-purple); }
.market-overview-label.seal-rate { color: var(--color-blue); }
.market-overview-label.target-stocks { color: #a371f7; }
.market-overview-label.anchor-result { color: var(--color-orange); }

.height-axis-spacer {
  width: 100%;
  height: 74px; /* 概况表间距(4px) + 高度输入行(32px) + 日期表头(38px) */
  flex-shrink: 0;
}

.height-label {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  color: var(--text-secondary);
  width: 100%;
}

.height-adjust {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  justify-content: center;
  width: 100%;
}

.height-btn {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.height-btn:hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

/* 表格容器：垂直排列（表格+滚动条） */
.table-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.table-scroll {
  overflow-x: auto;
}

.market-overview-table {
  margin-bottom: 4px;
  border-top: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
  flex-shrink: 0;
}

.market-overview-row {
  display: flex;
  height: 26px;
}

.market-overview-cell {
  height: 26px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(88, 166, 255, 0.035);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.market-overview-row.up .market-overview-cell,
.market-overview-row.limit-up .market-overview-cell { color: var(--color-red); }
.market-overview-row.limit-down .market-overview-cell { color: var(--color-green); }
.market-overview-row.board-count .market-overview-cell { color: var(--color-gold); border-top: 2px solid var(--border-color); }
.market-overview-row.promotion-rate .market-overview-cell { color: var(--color-purple); }
.market-overview-row.seal-rate .market-overview-cell { color: var(--color-blue); }
.market-overview-row.target-stocks .market-overview-cell { color: #a371f7; }
.market-overview-row.anchor-result .market-overview-cell { color: var(--color-orange); }

.anchor-result-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: calc(100% - 6px);
  padding: 2px 4px;
  overflow: hidden;
  border-radius: 4px;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anchor-result-badge.strong-repair { background: rgba(248, 81, 73, .9); }
.anchor-result-badge.weak-repair { background: rgba(240, 136, 62, .9); }
.anchor-result-badge.weak-diverge { background: rgba(88, 166, 255, .9); }
.anchor-result-badge.strong-diverge { background: rgba(63, 185, 80, .9); }
.anchor-result-empty { color: var(--text-tertiary); }

/* 隐藏原生滚动条 */
.table-scroll {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.table-scroll::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* 自定义拖拽滚动条 */
.custom-scrollbar {
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 5px;
  margin-top: 8px;
  position: relative;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.scrollbar-thumb {
  position: absolute;
  height: 100%;
  background: var(--color-blue);
  border-radius: 5px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.custom-scrollbar:hover .scrollbar-thumb {
  opacity: 1;
}

/* 禁用状态：内容未溢出时 */
.custom-scrollbar.is-disabled {
  cursor: default;
}

.custom-scrollbar.is-disabled .scrollbar-thumb {
  background: var(--text-tertiary);
  opacity: 0.3;
}

.custom-scrollbar.is-disabled:hover .scrollbar-thumb {
  opacity: 0.3;
}

/* 抱团标的矩阵 */
.cluster-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.cluster-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.cluster-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cluster-heading strong {
  color: var(--text-primary);
  font-size: 13px;
}

.cluster-heading small {
  color: var(--text-tertiary);
  font-size: 10px;
}

.cluster-module-link {
  color: var(--color-blue);
  font-size: 10px;
}

.cluster-add-form {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cluster-add-form input {
  width: 150px;
  padding: 6px 9px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
}

.cluster-add-form input:focus {
  outline: none;
  border-color: var(--color-blue);
}

.cluster-add-form button {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.cluster-matrix {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.cluster-target-column {
  width: var(--stair-axis-width);
  flex: 0 0 var(--stair-axis-width);
}

.cluster-corner,
.cluster-date-cell {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
}

.cluster-target-name {
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 5px 19px;
  box-sizing: border-box;
  background: rgba(240, 192, 64, 0.08);
  border: 1px solid var(--border-color);
  border-top: 0;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
}

.cluster-target-name span {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cluster-target-controls {
  position: absolute;
  right: 4px;
  bottom: 3px;
  display: flex;
  gap: 3px;
}

.cluster-target-controls button {
  width: 16px;
  height: 15px;
  padding: 0;
  border-radius: 3px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 12px;
}

.cluster-target-controls button:not(:disabled):hover {
  border-color: var(--color-blue);
  color: var(--color-blue);
}

.cluster-target-controls button:disabled {
  cursor: default;
  opacity: .3;
}

.cluster-target-controls .cluster-delete-button:not(:disabled):hover {
  background: rgba(248, 81, 73, 0.16);
  border-color: rgba(248, 81, 73, .55);
  color: #f85149;
}

.cluster-target-controls .cluster-archive-button:not(:disabled):hover {
  background: rgba(240, 192, 64, 0.15);
  border-color: rgba(240, 192, 64, .6);
  color: var(--color-gold);
}

.cluster-scroll {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cluster-scroll::-webkit-scrollbar {
  display: none;
}

.cluster-date-row,
.cluster-target-row {
  display: flex;
}

.cluster-date-cell {
  flex: 0 0 auto;
  border-left: 0;
}

.cluster-date-cell:first-child {
  border-left: 1px solid var(--border-color);
}

.cluster-cell {
  height: 56px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  padding: 4px;
  overflow: hidden;
  background: var(--bg-primary);
  border: 0;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
}

.cluster-cell:first-child {
  border-left: 1px solid var(--border-color);
}

.cluster-cell:not(:disabled):hover {
  background: var(--bg-hover);
  box-shadow: inset 0 0 0 1px rgba(88, 166, 255, 0.45);
}

.cluster-cell:disabled {
  cursor: default;
  opacity: 1;
}

.cluster-cell.has-entry {
  background: rgba(88, 166, 255, 0.06);
}

.cluster-cell.gain { background: rgba(248, 81, 73, 0.11); }
.cluster-cell.loss { background: rgba(63, 185, 80, 0.11); }
.cluster-cell.flat { background: rgba(139, 148, 158, 0.10); }

.cluster-trend {
  display: block;
  width: 100%;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cluster-change {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.cluster-cell.gain .cluster-change { color: var(--color-red); }
.cluster-cell.loss .cluster-change { color: var(--color-green); }
.cluster-cell.flat .cluster-change { color: var(--text-secondary); }

.cluster-empty-cell {
  color: var(--text-tertiary);
  font-size: 14px;
}

.cluster-empty {
  padding: 18px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
}

.cluster-edit-dialog {
  width: 360px;
}

/* 题材梯队热力概览 */
.theme-ladder-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.theme-ladder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.theme-ladder-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.theme-ladder-heading strong {
  color: var(--text-primary);
  font-size: 13px;
}

.theme-ladder-heading small {
  margin-right: 3px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.theme-legend {
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 9px;
  line-height: 1.3;
}

.theme-legend.strong { color: #ff7b72; background: rgba(248, 81, 73, .13); border-color: rgba(248, 81, 73, .25); }
.theme-legend.warm { color: #e3b341; background: rgba(227, 179, 65, .12); border-color: rgba(227, 179, 65, .24); }
.theme-legend.diverge { color: #79c0ff; background: rgba(88, 166, 255, .12); border-color: rgba(88, 166, 255, .24); }
.theme-legend.weak { color: #8b949e; background: rgba(139, 148, 158, .1); border-color: rgba(139, 148, 158, .2); }

.theme-ladder-matrix {
  display: flex;
  min-width: 0;
  padding-left: calc(var(--stair-axis-width) + 8px);
}

.theme-ladder-scroll {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.theme-ladder-scroll::-webkit-scrollbar {
  display: none;
}

.theme-ladder-date-row,
.theme-ladder-card-row {
  display: flex;
}

.theme-ladder-date {
  height: 32px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-left: 0;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
}

.theme-ladder-date:first-child {
  border-left: 1px solid var(--border-color);
}

.theme-day-column {
  flex: 0 0 auto;
  box-sizing: border-box;
  padding: 4px 3px 2px;
  background: rgba(110, 118, 129, .025);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.theme-day-column:first-child {
  border-left: 1px solid var(--border-color);
}

.theme-topic-card {
  position: relative;
  width: 100%;
  min-height: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  box-sizing: border-box;
  margin-bottom: 4px;
  padding: 22px 4px 6px;
  overflow: hidden;
  background: rgba(163, 113, 247, .055);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
}

.theme-topic-card:last-child {
  margin-bottom: 0;
}

.theme-topic-card:not(:disabled):hover {
  filter: brightness(1.12);
  border-color: rgba(88, 166, 255, .62);
  box-shadow: 0 2px 7px rgba(0, 0, 0, .18);
}

.theme-topic-card:disabled {
  cursor: default;
  opacity: 1;
}

.theme-topic-card.strong { background: linear-gradient(135deg, rgba(248, 81, 73, .26), rgba(248, 81, 73, .1)); }
.theme-topic-card.warm { background: linear-gradient(135deg, rgba(227, 179, 65, .22), rgba(227, 179, 65, .08)); }
.theme-topic-card.diverge { background: linear-gradient(135deg, rgba(88, 166, 255, .2), rgba(88, 166, 255, .06)); }
.theme-topic-card.weak { background: rgba(139, 148, 158, .08); }

.theme-card-content {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 400;
  line-height: 1.35;
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
}

.theme-add-card {
  width: 100%;
  min-height: 36px;
  padding: 6px 3px;
  border: 1px dashed rgba(88, 166, 255, .38);
  border-radius: 6px;
  background: rgba(88, 166, 255, .05);
  color: var(--color-blue);
  font-size: 9px;
}

.theme-add-card:hover {
  border-color: var(--color-blue);
  background: rgba(88, 166, 255, .12);
}

.theme-day-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.theme-card-topic-name {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 19px;
  padding: 3px 4px;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(163, 113, 247, .16);
  color: var(--text-primary);
  font-size: 9px;
  font-weight: 700;
  line-height: 13px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-ladder-shape {
  display: -webkit-box;
  max-width: 100%;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.theme-core-name {
  display: block;
  width: 100%;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-core-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 15px;
}

.theme-core-tags i,
.theme-core-tags em {
  padding: 1px 3px;
  border-radius: 3px;
  color: #fff;
  font-size: 8px;
  font-style: normal;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}

.theme-core-tags .unique { background: #d29922; }
.theme-core-tags .leader { background: #da3633; }
.theme-core-tags .branch { background: #8957e5; }
.theme-core-tags em { background: rgba(110, 118, 129, .65); color: var(--text-primary); }

.theme-empty-cell {
  color: var(--text-tertiary);
  font-size: 15px;
}

.theme-expanded-card {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid rgba(88, 166, 255, .45);
  border-radius: 8px;
  background: var(--bg-secondary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
}

.theme-expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(88, 166, 255, .06);
}

.theme-expanded-header > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.theme-expanded-header strong {
  color: var(--text-primary);
  font-size: 13px;
}

.theme-expanded-header small {
  color: var(--text-tertiary);
  font-size: 10px;
}

.theme-expanded-body {
  padding: 14px;
}

.theme-expanded-body textarea {
  width: 100%;
  min-height: 280px;
  box-sizing: border-box;
  padding: 12px;
  resize: vertical;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
}

.theme-expanded-body textarea:focus {
  outline: none;
  border-color: var(--color-blue);
}

.theme-expanded-body textarea:read-only {
  cursor: default;
}

.theme-expanded-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
}

.theme-expanded-footer button {
  min-width: 100px;
  padding: 8px 14px;
  border-radius: 5px;
  white-space: nowrap;
}

.theme-topic-card.active {
  border-color: var(--color-blue);
  box-shadow: 0 0 0 1px rgba(88, 166, 255, .35);
}

.theme-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.theme-count-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0 8px;
}

.theme-count-heading > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.theme-count-heading strong {
  color: var(--text-primary);
  font-size: 12px;
}

.theme-count-heading small {
  color: var(--text-tertiary);
  font-size: 10px;
}

.theme-count-heading button {
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 10px;
}

.theme-height-count-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 6px;
  margin-bottom: 14px;
}

.theme-height-count-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 5px;
  padding: 5px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: rgba(110, 118, 129, .05);
  color: var(--text-secondary);
  font-size: 10px;
}

.theme-height-count-field input {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 5px 6px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 11px;
  text-align: center;
}

.theme-stock-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0 8px;
}

.theme-stock-heading > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.theme-stock-heading strong {
  color: var(--text-primary);
  font-size: 12px;
}

.theme-stock-heading small {
  color: var(--text-tertiary);
  font-size: 10px;
}

.theme-stock-heading button {
  flex-shrink: 0;
  padding: 5px 9px;
  border: 1px solid rgba(88, 166, 255, .35);
  border-radius: 4px;
  background: rgba(88, 166, 255, .12);
  color: var(--color-blue);
  font-size: 11px;
}

.theme-stock-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.theme-stock-editor-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 7px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: rgba(110, 118, 129, .05);
}

.theme-stock-editor-row > input,
.theme-stock-editor-row > select,
.height-field input {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 7px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
}

.height-field {
  display: grid;
  grid-template-columns: auto 1fr;
  flex: 0 1 108px;
  align-items: center;
  gap: 5px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.theme-stock-editor-row > .theme-stock-name-input {
  width: auto;
  flex: 1 1 180px;
}

.theme-stock-editor-row > select {
  width: auto;
  flex: 1 1 138px;
}

.theme-stock-editor-row > .theme-branch-input {
  width: auto;
  flex: 1 1 150px;
}

.theme-branch-placeholder {
  flex: 1 1 100px;
  color: var(--text-tertiary);
  text-align: center;
}

.unique-check {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 10px;
  white-space: nowrap;
  flex: 0 1 105px;
}

.unique-check input {
  margin: 0;
}

.remove-stock-button {
  flex: 0 0 28px;
  margin-left: auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 4px;
  background: rgba(248, 81, 73, .12);
  color: #f85149;
  font-size: 14px;
}

.theme-stock-empty {
  padding: 20px;
  border: 1px dashed var(--border-color);
  border-radius: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
  text-align: center;
}

.theme-note-row {
  margin-top: 12px;
}

.stair-table {
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.stair-table th,
.stair-table td {
  width: var(--cell-width, 80px);
  height: 38px;
  text-align: center;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  box-sizing: border-box;
}

.stair-table th:first-child,
.stair-table td:first-child {
  border-left: 1px solid var(--border-color);
}

.stair-table thead th {
  border-top: 1px solid var(--border-color);
}

.date-header {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  position: relative;
  height: 38px;
  line-height: 36px;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: middle;
}

.date-header.has-date-tag {
  padding-top: 3px;
  line-height: 15px;
  vertical-align: top;
}

.date-header:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.date-header.has-date-tag {
  background: rgba(139, 148, 158, 0.25);
  color: var(--text-primary);
}

.date-badges {
  position: absolute;
  right: 2px;
  bottom: 3px;
  left: 2px;
  display: flex;
  justify-content: center;
  gap: 2px;
  margin: 0;
  overflow: hidden;
  line-height: 1;
  pointer-events: none;
}

.date-badges:empty { display: none; }

.date-tag-badge,
.date-legend-badge {
  display: inline-block;
  font-size: 9px;
  color: #fff;
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 500;
  vertical-align: middle;
  line-height: 1;
  white-space: nowrap;
}

.date-legend-badge { margin-right: 2px; }

.date-tag-dialog { width: min(520px, calc(100vw - 32px)); }
.date-tag-help { margin-bottom: 12px; color: var(--text-secondary); font-size: 11px; }
.date-tag-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.date-tag-option { display: grid; grid-template-columns: 24px 1fr; grid-template-rows: auto auto; column-gap: 9px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 7px; cursor: pointer; }
.date-tag-option input { position: absolute; opacity: 0; pointer-events: none; }
.date-tag-option > span { grid-row: 1 / 3; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: #fff; border-radius: 5px; font-size: 11px; font-weight: 700; }
.date-tag-option b { font-size: 12px; }
.date-tag-option small { margin-top: 2px; color: var(--text-tertiary); font-size: 9px; line-height: 1.35; }
.date-tag-option:has(input:checked) { border-color: var(--color-blue); box-shadow: inset 0 0 0 1px rgba(88,166,255,.25); }

/* 高度输入行（与表格同步滚动） */
.height-input-bar {
  display: flex;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.height-input {
  height: 28px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  text-align: center;
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 500;
  box-sizing: border-box;
  flex-shrink: 0;
  -webkit-user-select: text;
  user-select: text;
}

.height-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

.height-input:focus {
  outline: none;
  border-color: var(--color-blue);
}

.height-input:hover {
  border-color: var(--color-blue);
}

.cell {
  background: var(--bg-primary);
  transition: background 0.2s;
  position: relative;
}

.cell.is-editable {
  cursor: pointer;
}

.cell.is-editable:hover {
  box-shadow: inset 0 0 0 1px rgba(88, 166, 255, 0.4);
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.badge-row {
  display: flex;
  gap: 2px;
}

.dynamic-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 3px;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.cell.filled {
  background: rgba(88, 166, 255, 0.08);
  border-color: rgba(88, 166, 255, 0.18);
}

.cell.has-stock {
  background: rgba(240, 192, 64, 0.16);
  border-color: rgba(240, 192, 64, 0.34);
}

.cell.max-height {
  background: linear-gradient(180deg, rgba(240, 192, 64, 0.38), rgba(240, 192, 64, 0.18));
  border-color: rgba(240, 192, 64, 0.7);
  box-shadow: inset 3px 0 0 rgba(240, 192, 64, 0.9);
}

.cell.breakthrough {
  background: rgba(248, 81, 73, 0.3);
  border-color: rgba(248, 81, 73, 0.65);
  box-shadow: inset 3px 0 0 rgba(248, 81, 73, 0.95);
}

.cell.median {
  background: rgba(63, 185, 80, 0.2);
  border-color: rgba(63, 185, 80, 0.5);
}

.cell.ice-point {
  background: rgba(88, 166, 255, 0.2);
  border-color: rgba(88, 166, 255, 0.5);
}

.cell.announcement {
  background: rgba(188, 140, 255, 0.18);
  border-color: rgba(188, 140, 255, 0.55);
}

.cell.space-first {
  background: rgba(240, 136, 62, 0.22);
  border-color: rgba(240, 136, 62, 0.55);
}

.cell.space-board {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.5);
}

.cell.next-day-broken {
  background: rgba(239, 68, 68, 0.26);
  border-color: rgba(239, 68, 68, 0.6);
}

.cell.next-day-no-premium {
  background: rgba(107, 114, 128, 0.24);
  border-color: rgba(107, 114, 128, 0.55);
}

.cell.next-day-premium {
  background: rgba(34, 197, 94, 0.22);
  border-color: rgba(34, 197, 94, 0.55);
}

.stair-table tbody tr {
  transition: opacity 0.25s, box-shadow 0.25s;
}

.stair-table tbody tr.row-highlight td {
  box-shadow: inset 0 0 0 1px rgba(88, 166, 255, 0.32), inset 0 0 10px rgba(88, 166, 255, 0.07);
}

.height-label {
  transition: color 0.25s, background 0.25s;
}

.height-label.row-highlight {
  color: rgba(88, 166, 255, 0.88);
  background: rgba(88, 166, 255, 0.11);
  border-radius: 3px;
}

.median-badge {
  display: inline-block;
  font-size: 9px;
  background: #3fb950;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.ice-badge {
  display: inline-block;
  font-size: 9px;
  background: #58a6ff;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.announcement-badge {
  display: inline-block;
  font-size: 9px;
  background: #a855f7;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.breakthrough-badge {
  display: inline-block;
  font-size: 9px;
  background: #f85149;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.space-first-badge {
  display: inline-block;
  font-size: 9px;
  background: #ff8c00;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.space-badge {
  display: inline-block;
  font-size: 9px;
  background: #00bfff;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.broken-badge {
  display: inline-block;
  font-size: 9px;
  background: #ff4500;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.no-premium-badge {
  display: inline-block;
  font-size: 9px;
  background: #808080;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.premium-badge {
  display: inline-block;
  font-size: 9px;
  background: #ffd700;
  color: #1a1a1a;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.stock-name {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(240, 192, 64, 0.8);
  color: #1a1a1a;
  border-radius: 3px;
  font-weight: 500;
  font-size: 11px;
  max-width: calc(var(--cell-width, 80px) - 8px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-name.clickable {
  cursor: pointer;
}

.stock-name.clickable:hover {
  background: rgba(240, 192, 64, 1);
}

.cell.breakthrough .stock-name {
  background: rgba(248, 81, 73, 0.9);
  color: #fff;
}

.cell.median .stock-name {
  background: rgba(63, 185, 80, 0.9);
  color: #fff;
}

.cell.ice-point .stock-name {
  background: rgba(88, 166, 255, 0.9);
  color: #fff;
}

.cell.announcement .stock-name {
  background: rgba(168, 85, 247, 0.9);
  color: #fff;
}

.edit-hint {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.cell:hover .edit-hint {
  opacity: 1;
}

.edit-hint:hover {
  color: var(--color-blue);
}

.fill-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: rgba(240, 192, 64, 0.5);
  border-radius: 50%;
  cursor: pointer;
}

.fill-dot:hover {
  background: rgba(240, 192, 64, 0.8);
}

.add-hint {
  display: inline-block;
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.18s, background 0.18s, color 0.18s;
}

.add-hint.visible,
.cell:hover .add-hint {
  opacity: 1;
}

.add-hint:hover {
  background: var(--color-blue);
  color: #fff;
}

.empty-hint {
  text-align: center;
  padding: 40px;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 编辑弹窗 */
.edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 300px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 500;
}

.btn-close {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1;
}

.edit-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.tag-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.dynamic-tag-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  margin: 0;
}

.dynamic-tag-option:hover {
  border-color: var(--color-blue);
}

.tag-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 3px;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.tag-col .edit-row {
  margin-bottom: 8px;
}

.edit-row {
  margin-bottom: 12px;
}

.edit-row:last-child {
  margin-bottom: 0;
}

.edit-row label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.edit-row input[type="text"],
.edit-row input[type="number"],
.stock-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
}

.stock-select {
  cursor: pointer;
}

.edit-row input[type="checkbox"] {
  margin-right: 6px;
}

.edit-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.edit-footer button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-primary {
  background: var(--color-blue);
  color: #fff;
}

.btn-danger {
  background: rgba(248, 81, 73, 0.2);
  color: #f85149;
}

@media (max-width: 768px) {
  .theme-ladder-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .theme-stock-heading,
  .theme-stock-heading > div,
  .theme-count-heading,
  .theme-count-heading > div {
    align-items: flex-start;
    flex-direction: column;
  }

  .theme-height-count-grid {
    grid-template-columns: repeat(2, minmax(100px, 1fr));
  }

  .theme-meta-grid {
    grid-template-columns: 1fr;
  }

  .stair-table th,
  .stair-table td {
    height: 28px;
    font-size: 11px;
  }

  .stock-name {
    font-size: 10px;
  }
}
</style>
