<template>
  <div :class="['message', msg.role]">
    <div class="avatar-small" :class="msg.role"></div>
    <div class="bubble">{{ msg.text || (msg.streaming ? '...' : '') }}</div>
  </div>
</template>

<script setup>
const props = defineProps({ msg: Object })
</script>

<style scoped>
.message { display:flex; gap:10px; margin-bottom:12px; align-items:flex-start }
.message.user { flex-direction:row-reverse }
.avatar-small { width:36px; height:36px; border-radius:50%; background:#e9d5ff }
.message.user .avatar-small { background:#6f42c1 }
.bubble { max-width:80%; padding:10px 14px; border-radius:12px; background:#f3e8ff; white-space:pre-wrap }
.message.user .bubble { background:#6f42c1; color:white }
</style>