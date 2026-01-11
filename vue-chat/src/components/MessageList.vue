<template>
  <div ref="container" class="messages">
    <MessageBubble v-for="msg in messages" :key="msg.id" :msg="msg" />
  </div>
</template>

<script setup>
import { ref, defineExpose } from 'vue'
import MessageBubble from './MessageBubble.vue'
const props = defineProps({ messages: Array })
const container = ref(null)

defineExpose({
  scrollToBottom: () => {
    if (container.value) container.value.scrollTop = container.value.scrollHeight
  }
})
</script>

<style scoped>
.messages { flex:1; overflow:auto }
</style>