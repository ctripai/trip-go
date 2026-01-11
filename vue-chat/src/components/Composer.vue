<template>
  <div class="composer">
    <input v-model="value" @keydown.enter.prevent="onSend" :placeholder="placeholder" />
    <div class="composer-actions">
      <button @click="onSend" class="send" :disabled="loading">{{ sendText }}</button>
      <button @click="$emit('done')" class="done">完成</button>
      <button v-if="streaming" @click="$emit('abort')" class="abort">中止</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
const props = defineProps({ loading: Boolean, streaming: Boolean, placeholder: { type: String, default: '问任何事情...' }, sendText: { type: String, default: '发送' } })
const emit = defineEmits(['send', 'abort'])
const value = ref('')

watch(() => props.loading, (v) => { if (!v) value.value = '' })

function onSend() {
  if (!value.value.trim()) return;
  emit('send', value.value.trim())
}
</script>

<style scoped>
.composer { display:flex; gap:8px; align-items:center; margin-top:12px }
.composer input { flex:1; padding:12px 14px; border-radius:20px; border:1px solid #e5e7eb }
.send { background:#7c3aed; color:white; padding:8px 12px; border-radius:16px; border:none }
.abort { background:#ef4444; color:white; padding:8px 12px; border-radius:16px; border:none }
</style>