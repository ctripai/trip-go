<template>
  <div class="chat-page">
    <Sidebar :open="sidebarOpen" @toggle="sidebarOpen = !sidebarOpen" />

    <main class="chat-area">
      <header class="chat-header">
        <div class="avatar"><img src="/avatar.png" alt="avatar" /></div>
        <div>
          <h3>正在收集信息以规划你的行程...</h3>
          <p class="muted">分享你的旅行想法 ♡</p>
        </div>
      </header>

      <div class="main-content">
      <div class="left-col">
        <MessageList :messages="messages" ref="messageListRef" />

        <Composer :loading="loading" :streaming="streaming" @send="onSend" @abort="abortStream" @done="onDone" />

        <div v-if="error" class="error">{{ error }}</div>
      </div>

      <Itinerary :plan="itinerary" :loading="generating" @regenerate="generatePlanFromMessages" />
    </div>
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import Sidebar from './Sidebar.vue'
import MessageList from './MessageList.vue'
import Composer from './Composer.vue'
import Itinerary from './Itinerary.vue'

const messages = ref([
  { id: 1, role: 'assistant', text: '嗨！我是 Layla，很高兴帮助你规划旅行。告诉我你的想法吧。' }
])
const loading = ref(false)
const streaming = ref(false)
const error = ref('')
const sidebarOpen = ref(true)
const messageListRef = ref(null)
const abortController = ref(null)
let idCounter = 2

const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value && messageListRef.value.scrollToBottom) messageListRef.value.scrollToBottom()
  })
}

const appendMessage = (msg) => { messages.value.push(msg); scrollToBottom() }

// Plan / itinerary state
const itinerary = ref(null)
const generating = ref(false)
let generatedOnce = false

async function generatePlanFromMessages() {
  // Avoid duplicate generation
  if (generating.value) return
  generating.value = true
  itinerary.value = null
  const payload = messages.value.map(m => ({ role: m.role, content: m.text || '' }))

  try {
    const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: payload }) })
    const data = await res.json()
    if (res.ok) {
      itinerary.value = data.plan || data.response || JSON.stringify(data, null, 2)
      generatedOnce = true
    } else {
      error.value = data.errorFriendly || data.error || '生成行程失败'
    }
  } catch (err) {
    error.value = err.message || '生成行程出错'
  } finally {
    generating.value = false
  }
}

function onDone() {
  generatePlanFromMessages()
}

async function onSend(text) {
  const userMsg = { id: idCounter++, role: 'user', text }
  appendMessage(userMsg)

  const assistantId = idCounter++
  appendMessage({ id: assistantId, role: 'assistant', text: '', streaming: true })

  loading.value = true
  streaming.value = true
  error.value = ''

  const controller = new AbortController()
  abortController.value = controller

  try {
    const res = await fetch('/api/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openaiModel: 'gpt-5-nano', input: userMsg.text }), signal: controller.signal
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || data.errorFriendly || '流式请求失败')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let i
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i).replace(/\r$/, '')
        buffer = buffer.slice(i + 1)
        if (!line) continue
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.output_text) accumulated += parsed.output_text
            else if (Array.isArray(parsed.output)) {
              parsed.output.forEach(o => {
                if (typeof o === 'string') accumulated += o
                else if (o?.content) {
                  if (Array.isArray(o.content)) o.content.forEach(c => { if (c?.text) accumulated += c.text })
                }
              })
            } else if (parsed.choices && Array.isArray(parsed.choices)) {
              parsed.choices.forEach(choice => {
                if (choice.delta && typeof choice.delta.content === 'string') accumulated += choice.delta.content
                else if (choice.delta && Array.isArray(choice.delta.content)) accumulated += choice.delta.content.join('')
              })
            } else accumulated += payload
          } catch { accumulated += payload }
        } else accumulated += line
      }

      // update assistant message
      const idx = messages.value.findIndex(m => m.id === assistantId)
      if (idx >= 0) messages.value[idx].text = accumulated
      scrollToBottom()
    }

    // finalize
    const idx = messages.value.findIndex(m => m.id === assistantId)
    if (idx >= 0) messages.value[idx].streaming = false

    // Auto-detect 'done' or 'enough' phrases to generate itinerary
    try {
      const finalText = (idx >= 0 ? (messages.value[idx].text || '') : '').toLowerCase()
      const doneRe = /(已收集|收集完|收集完成|足够|完成|可以开始|done|enough)/i
      if (!generatedOnce && doneRe.test(finalText)) {
        generatePlanFromMessages()
      }
    } catch (e) {}

  } catch (err) {
    if (err.name === 'AbortError') error.value = '已取消流式'
    else {
      error.value = err.message || '调用出错'
      // try fallback
      try {
        const res2 = await fetch('/api/deepseek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek' }) })
        const data2 = await res2.json()
        if (res2.ok) {
          const idx = messages.value.findIndex(m => m.id === assistantId)
          if (idx >= 0) messages.value[idx].text = data2.response
        } else {
          messages.value = messages.value.filter(m => m.id !== assistantId)
        }
      } catch { messages.value = messages.value.filter(m => m.id !== assistantId) }
    }
  } finally {
    loading.value = false
    streaming.value = false
    abortController.value = null
    scrollToBottom()
  }
}

const abortStream = () => {
  if (abortController.value) abortController.value.abort()
}
</script>

<style scoped>
.chat-page { display:flex; min-height:100vh; }
.chat-area { flex:1; padding: 24px; display:flex; flex-direction:column; }
.chat-header { display:flex; gap:12px; align-items:center }
.main-content { display:flex; gap:20px; align-items:flex-start; }
.left-col { flex:1; display:flex; flex-direction:column; }
.message { display:flex; gap:10px; margin-bottom:12px }
.message.user { flex-direction:row-reverse }
.avatar-small { width:36px; height:36px; border-radius:50%; background:#e9d5ff }
.message.user .avatar-small { background:#6f42c1 }
.bubble { max-width:80%; padding:10px 14px; border-radius:12px; background:#f3e8ff }
.message.user .bubble { background:#6f42c1; color:white }
.error { margin-top:12px; padding:12px; background:#fff5f5; border:1px solid #fee2e2; border-radius:6px }

@media (max-width: 900px) {
  .chat-page { flex-direction:column }
  .sidebar { width:100%; transform:none; }
  .main-content { flex-direction:column }
}
</style>