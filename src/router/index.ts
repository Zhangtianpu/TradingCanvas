import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/TradingCanvas/'),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/pages/Dashboard.vue')
    },
    {
      path: '/themes',
      name: 'themes',
      component: () => import('@/pages/ThemeList.vue')
    },
    {
      path: '/themes/:id',
      name: 'theme-detail',
      component: () => import('@/pages/ThemeDetail.vue')
    },
    {
      path: '/stocks',
      name: 'stocks',
      component: () => import('@/pages/StockList.vue')
    },
    {
      path: '/stocks/:id',
      name: 'stock-detail',
      component: () => import('@/pages/StockDetail.vue')
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/pages/DailyReview.vue')
    },
    {
      path: '/positions',
      name: 'positions',
      component: () => import('@/pages/PositionStats.vue')
    },
    {
      path: '/trade-modes',
      name: 'trade-modes',
      component: () => import('@/pages/TradeModeManage.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/Settings.vue')
    }
  ]
})

export default router
