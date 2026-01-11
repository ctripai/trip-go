<template>
  <div class="chat-input-area">
    <div class="input-container">
      <input type="text" v-model="value" @keydown.enter.prevent="onSend" :placeholder="placeholder" class="input-placeholder" />
      <div class="input-icon left">
        📎
      </div>
      <div class="input-icon right">
        <button title="日历">📅</button>
        <button title="麦克风">🎤</button>
        <button title="发送" @click="onSend" :disabled="loading">📤</button>
        <button v-if="streaming" title="中止" @click="$emit('abort')">⏹️</button>
      </div>
    </div>
    <p class="feedback-hint">💡 我很想听听你对改进的建议。<a href="#">点击分享任何反馈</a>。</p>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
const props = defineProps({ loading: Boolean, streaming: Boolean, placeholder: { type: String, default: '问任何事情...' } })
const emit = defineEmits(['send', 'abort'])
const value = ref('')

watch(() => props.loading, (v) => { if (!v) value.value = '' })

function onSend() {
  if (!value.value.trim()) return;
  emit('send', value.value.trim())
}
</script>

<style scoped>
.chat-input-area {
  padding: 20px;
  border-top: 1px solid #eee;
  background-color: white;
}

.input-container {
  position: relative;
  margin-bottom: 10px;
}

.input-placeholder {
  background-color: #f9fafc;
  border: 1px solid #e1e6ef;
  border-radius: 24px;
  padding: 14px 50px 14px 40px;
  color: #999;
  font-size: 16px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
}

.input-placeholder:focus {
  border-color: #2d7ff9;
  box-shadow: 0 0 0 2px rgba(45, 127, 249, 0.1);
}

.input-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 16px;
}

.input-icon.left {
  left: 15px;
}

.input-icon.right {
  right: 15px;
  display: flex;
  gap: 15px;
  align-items: center;
}

.input-icon button {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-icon button:hover {
  color: #2d7ff9;
}

.feedback-hint {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 0 20px;
}

.feedback-hint a {
  color: #2d7ff9;
  text-decoration: none;
}

.feedback-hint a:hover {
  text-decoration: underline;
}
</style>