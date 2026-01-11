<template>
  <div :class="['message', msg.role]">
    <div class="avatar" :class="msg.role === 'user' ? 'avatar-user' : 'avatar-ai'">
      {{ msg.role === 'user' ? '你' : 'L' }}
    </div>
    <div class="message-content">{{ msg.text || (msg.streaming ? '...' : '') }}</div>
  </div>
</template>

<script setup>
const props = defineProps({ msg: Object })
</script>

<style scoped>
.message {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 0 12px;
}

.avatar-ai {
  background-color: #e6f0ff;
  color: #2d7ff9;
}

.avatar-user {
  background-color: #f0f5ff;
  color: #7b61ff;
}

.message-content {
  max-width: 70%;
  padding: 16px 20px;
  border-radius: 18px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message:not(.user) .message-content {
  background-color: #f5f8ff;
  border-top-left-radius: 4px;
  color: #333;
}

.message.user .message-content {
  background-color: #2d7ff9;
  color: white;
  border-top-right-radius: 4px;
}
</style>