import { ref, watch } from 'vue'

export type ThemeMode = 'dark' | 'light'

const THEME_KEY = 'trading-canvas-theme'

const currentTheme = ref<ThemeMode>((localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark')

export function useTheme() {
  function setTheme(theme: ThemeMode) {
    currentTheme.value = theme
    applyTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }

  function applyTheme(theme: ThemeMode) {
    document.documentElement.setAttribute('data-theme', theme)
  }

  // 初始化时应用主题
  applyTheme(currentTheme.value)

  return {
    currentTheme,
    setTheme,
    toggleTheme
  }
}
