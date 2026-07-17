# TradingCanvas 技术文档

## 一、技术栈

| 类别 | 选型 | 理由 |
|------|------|------|
| 构建工具 | Vite 5 | 快速开发、零配置部署 |
| 框架 | Vue 3 + Composition API | 轻量、响应式、单文件组件 |
| 语言 | TypeScript | 类型安全、IDE友好 |
| 路由 | Vue Router 4 | SPA路由管理 |
| 状态管理 | Pinia | Vue3官方推荐，轻量 |
| UI组件 | 手写CSS + 少量自定义组件 | 减少依赖、完全控制样式 |
| 图表 | Chart.js | 轻量、情绪曲线可视化 |
| 部署 | GitHub Pages + GitHub Actions | 自动化CI/CD |
| 存储 | localStorage | 纯前端、无需后端 |

## 二、项目结构

```
TradingCanvas/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 自动部署
├── docs/                       # 文档
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── styles/
│   │       ├── variables.css   # CSS变量（主题色等）
│   │       ├── global.css      # 全局样式
│   │       └── components.css  # 通用组件样式
│   ├── components/
│   │   ├── AppHeader.vue       # 顶部导航
│   │   ├── AppSidebar.vue      # 侧边导航
│   │   ├── AppToast.vue        # Toast提示
│   │   ├── ConfirmDialog.vue   # 确认弹窗
│   │   ├── StockTag.vue        # 个股标签
│   │   └── EmotionBar.vue      # 情绪阶段条
│   ├── composables/
│   │   ├── useStorage.ts       # localStorage封装
│   │   ├── useToast.ts         # Toast逻辑
│   │   └── useDate.ts          # 日期工具
│   ├── layouts/
│   │   └── MainLayout.vue      # 主布局
│   ├── pages/
│   │   ├── Dashboard.vue       # 首页看板
│   │   ├── ThemeList.vue       # 题材列表
│   │   ├── ThemeDetail.vue     # 题材详情
│   │   ├── StockList.vue       # 个股列表
│   │   ├── StockDetail.vue     # 个股详情
│   │   ├── EmotionCycle.vue    # 情绪周期
│   │   ├── DailyReview.vue     # 每日复盘
│   │   └── Settings.vue        # 设置
│   ├── stores/
│   │   ├── theme.ts            # 题材store
│   │   ├── stock.ts            # 个股store
│   │   ├── emotion.ts          # 情绪store
│   │   ├── review.ts           # 复盘store
│   │   └── app.ts              # 应用全局store
│   ├── types/
│   │   └── index.ts            # TypeScript类型定义
│   ├── router/
│   │   └── index.ts            # 路由配置
│   ├── App.vue
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 三、数据模型

### 3.1 题材 (Theme)

```typescript
interface Theme {
  id: string;                    // UUID
  name: string;                  // 题材名称
  sector: string;                // 所属板块
  level: 'main' | 'sub' | 'rotation'; // 主线/支线/轮动
  status: 'burst' | 'ferment' | 'climax' | 'diverge' | 'retreat' | 'adjust';
  burstDate: string;             // 爆发日期 YYYY-MM-DD
  events: ThemeEvent[];          // 关键事件
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
}

interface ThemeEvent {
  id: string;
  date: string;
  content: string;
}
```

### 3.2 个股 (Stock)

```typescript
interface Stock {
  id: string;
  code: string;                  // 股票代码 000001
  name: string;                  // 股票名称
  themeId: string;               // 所属题材ID
  role: 'leader' | 'mid' | 'follower' | 'catchup'; // 龙头/中军/跟风/补涨
  tags: StockTag[];              // 标签
  limitUpRecords: LimitUpRecord[]; // 打板记录
  trades: TradeRecord[];         // 买卖记录
  createdAt: string;
  updatedAt: string;
}

type StockTag = 'one-word' | 't-shape' | 'turnover' | 'ground-sky' | 'weak-strong' | 'strong-weak';
// 一字板 / T字板 / 换手板 / 地天板 / 弱转强 / 强转弱

interface LimitUpRecord {
  id: string;
  date: string;                  // 日期
  boardCount: number;            // 第几板
  limitUpTime: string;           // 封板时间 HH:mm
  sealAmount: string;            // 封单量（文本，如"8.5亿"）
 炸板: boolean;                  // 是否炸板
  回封: boolean;                 // 是否回封
}

interface TradeRecord {
  id: string;
  date: string;
  direction: 'buy' | 'sell';
  price: number;
  quantity: number;
  note: string;
}
```

### 3.3 情绪数据 (EmotionDaily)

```typescript
interface EmotionDaily {
  id: string;
  date: string;                  // YYYY-MM-DD
  limitUpCount: number;          // 涨停数
  limitDownCount: number;        // 跌停数
  maxBoardHeight: number;        // 连板高度
  brokenRate: number;            // 炸板率 %
  phase: 'freeze' | 'repair' | 'warm' | 'climax' | 'retreat';
  leadingThemeId: string;        // 领涨题材
  note: string;                  // 备注
}
```

### 3.4 每日复盘 (DailyReview)

```typescript
interface DailyReview {
  id: string;
  date: string;                  // YYYY-MM-DD
  summary: string;               // 市场概述
  themeAnalysis: string;         // 题材梳理
  reflection: string;            // 操作反思
  tomorrowPlan: string;          // 明日计划
  createdAt: string;
  updatedAt: string;
}
```

### 3.5 存储结构

```typescript
interface AppStorage {
  themes: Theme[];
  stocks: Stock[];
  emotions: EmotionDaily[];
  reviews: DailyReview[];
  appVersion: string;
  lastBackupDate: string;
}
```

## 四、关键实现

### 4.1 localStorage 封装

```typescript
// useStorage.ts
const STORAGE_KEY = 'trading-canvas-data';

function loadData(): AppStorage { /* 读取+解析+校验 */ }
function saveData(data: AppStorage): void { /* 序列化+存储 */ }
function exportData(): void { /* 导出JSON文件下载 */ }
function importData(file: File): Promise<void> { /* 读取文件+校验+存储 */ }
```

### 4.2 自动保存机制

- Pinia store 使用 `$subscribe` 监听状态变化
- 变更后 300ms debounce 写入 localStorage
- 避免频繁写入影响性能

### 4.3 导入导出

- 导出：`JSON.stringify(data)` → Blob → `<a download>` 触发下载
- 导入：`<input type="file">` → FileReader → JSON.parse → 校验 → 合并/覆盖
- 导入前自动备份当前数据

### 4.4 GitHub Pages 部署

- Vite 配置 `base` 为仓库名
- GitHub Actions: push to main → build → deploy to gh-pages
- 使用 `vite-plugin-static-copy` 处理 404 重定向

## 五、构建与部署

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览
npm run preview
```

### Vite 配置要点

```typescript
export default defineConfig({
  base: '/TradingCanvas/',  // GitHub Pages base
  plugins: [vue()],
  build: {
    outDir: 'dist'
  }
})
```
