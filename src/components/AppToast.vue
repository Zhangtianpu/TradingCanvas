<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { toastVisible as visible, toastMessage as message, toastType as type } from '@/composables/useToast'
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  z-index: 2000;
  max-width: 360px;
}
.toast.success {
  background: rgba(63,185,80,0.9);
  color: #fff;
}
.toast.error {
  background: rgba(248,81,73,0.9);
  color: #fff;
}
.toast.info {
  background: rgba(88,166,255,0.9);
  color: #fff;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
