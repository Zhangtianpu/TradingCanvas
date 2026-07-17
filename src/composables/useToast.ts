import { ref } from 'vue'

export const toastVisible = ref(false)
export const toastMessage = ref('')
export const toastType = ref<'success' | 'error' | 'info'>('info')

let timer: ReturnType<typeof setTimeout> | null = null

function show(msg: string, t: 'success' | 'error' | 'info' = 'info') {
  toastMessage.value = msg
  toastType.value = t
  toastVisible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    toastVisible.value = false
  }, 3000)
}

export function useToast() {
  return {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    show,
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    info: (msg: string) => show(msg, 'info')
  }
}
