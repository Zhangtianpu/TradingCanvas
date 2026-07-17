<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <span class="logo">TC</span>
        <span class="logo-text">TradingCanvas</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" @click="sidebarOpen = false">看板</router-link>
        <router-link to="/themes" class="nav-item" @click="sidebarOpen = false">题材</router-link>
        <router-link to="/stocks" class="nav-item" @click="sidebarOpen = false">个股</router-link>
        <router-link to="/review" class="nav-item" @click="sidebarOpen = false">复盘</router-link>
        <router-link to="/positions" class="nav-item" @click="sidebarOpen = false">持仓</router-link>
        <router-link to="/trade-modes" class="nav-item" @click="sidebarOpen = false">交易模式</router-link>
        <router-link to="/settings" class="nav-item" @click="sidebarOpen = false">设置</router-link>
      </nav>
    </aside>
    <div class="sidebar-mask" v-if="sidebarOpen" @click="sidebarOpen = false"></div>
    <main class="main-content">
      <header class="top-bar">
        <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">=</button>
        <div class="top-date">{{ currentDate }}</div>
      </header>
      <div class="content-area">
        <router-view />
      </div>
    </main>
    <nav class="bottom-nav">
      <router-link to="/" class="bottom-nav-item">看板</router-link>
      <router-link to="/themes" class="bottom-nav-item">题材</router-link>
      <router-link to="/review" class="bottom-nav-item">复盘</router-link>
      <router-link to="/positions" class="bottom-nav-item">持仓</router-link>
      <router-link to="/settings" class="bottom-nav-item">设置</router-link>
    </nav>
    <AppToast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { today } from '@/composables/useDate'

const sidebarOpen = ref(false)
const currentDate = computed(() => today())
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 200px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  width: 28px;
  height: 28px;
  background: var(--color-blue);
  color: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
}

.logo-text {
  font-weight: 500;
  font-size: 14px;
}

.sidebar-nav {
  padding: 8px;
  flex: 1;
}

.nav-item {
  display: block;
  padding: 8px 12px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all 0.2s;
  text-decoration: none;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.router-link-active {
  background: rgba(88,166,255,0.1);
  color: var(--color-blue);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
}

.top-bar {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  gap: 12px;
  flex-shrink: 0;
}

.menu-btn {
  display: none;
  background: none;
  color: var(--text-primary);
  font-size: 16px;
  padding: 4px 8px;
}

.top-date {
  color: var(--text-secondary);
  font-size: 12px;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.bottom-nav {
  display: none;
}

.sidebar-mask {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -220px;
    top: 0;
    z-index: 100;
    transition: left 0.3s;
    height: 100vh;
  }
  .sidebar.open {
    left: 0;
  }
  .sidebar-mask {
    display: block;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99;
  }
  .menu-btn {
    display: block;
  }
  .main-content {
    height: 100vh;
  }
  .content-area {
    padding: 12px;
    padding-bottom: 56px;
  }
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    z-index: 50;
    justify-content: space-around;
    padding: 8px 0;
  }
  .bottom-nav-item {
    font-size: 12px;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 4px 12px;
  }
  .bottom-nav-item.router-link-active {
    color: var(--color-blue);
  }
}
</style>
