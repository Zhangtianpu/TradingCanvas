<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <h3>{{ title }}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 8px;">{{ message }}</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="$emit('cancel')">取消</button>
          <button class="btn-danger" @click="$emit('confirm')">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  message: string
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
