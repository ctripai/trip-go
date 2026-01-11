<template>
  <div class="chat-page">
    <aside :class="['sidebar', { open: sidebarOpen }]">
      <div class="sidebar-inner">
        <h2>Layla.</h2>
        <p class="muted">嗨，我是 Layla！很高兴帮助你规划旅行。</p>
        <button class="primary">创建一个新行程</button>

        <div class="premium">
          <p>升级订阅以解锁：</p>
          <ul>
            <li>无限次专属行程规划</li>
            <li>一键下载并分享精美 PDF</li>
            <li>挖掘隐藏宝藏景点</li>
          </ul>
          <button class="cta">开始 3 天免费试用</button>
        </div>
      </div>
      <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">{{ sidebarOpen ? '收起' : '展开' }}</button>
    </aside>

    <main class="chat-area">
      <header class="chat-header">
        <div class="avatar"><img src="/avatar.png" alt="avatar" /></div>
        <div>
          <h3>正在收集信息以规划你的行程...</h3>
          <p class="muted">分享你的旅行想法 ♡</p>
        </div>
      </header>

      <section ref="messagesRef" class="messages">
        <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
          <div class="avatar-small" :class="msg.role"></div>
          <div class="bubble">{{ msg.text || (msg.streaming ? '...' : '') }}</div>
        </div>
      </section>

      <div class="composer">
        <input v-model="input" @keydown.enter.prevent="sendMessage" placeholder="问任何事情..." />
        <div class="composer-actions">
          <button @click="sendMessage" class="send" :disabled="loading">发送</button>
          <button v-if="streaming" @click="abortStream" class="abort">中止</button>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const messages = ref([
  { id: 1, role: 'assistant', text: '嗨！我是 Layla，很高兴帮助你规划旅行。告诉我你的想法吧。' }
])
const input = ref('')
const loading = ref(false)
const streaming = ref(false)
const error = ref('')
const sidebarOpen = ref(true)
const messagesRef = ref(null)
const abortController = ref(null)
let idCounter = 2

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  })
}

const appendMessage = (msg) => { messages.value.push(msg); scrollToBottom() }

const sendMessage = async () => {
  if (!input.value.trim()) return
  const userMsg = { id: idCounter++, role: 'user', text: input.value.trim() }
  appendMessage(userMsg)
  input.value = ''

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
.sidebar { width:320px; background:white; padding:24px; box-sizing:border-box; position:relative; transition: transform .18s ease }
.sidebar.open { transform: translateX(0) }
.sidebar-toggle { position:absolute; right:-44px; top:20px; }
.chat-area { flex:1; padding: 24px; display:flex; flex-direction:column; }
.chat-header { display:flex; gap:12px; align-items:center }
.messages { margin-top:18px; background:white; padding:16px; border-radius:8px; flex:1; overflow:auto }
.message { display:flex; gap:10px; margin-bottom:12px }
.message.user { flex-direction:row-reverse }
.avatar-small { width:36px; height:36px; border-radius:50%; background:#e9d5ff }
.message.user .avatar-small { background:#6f42c1 }
.bubble { max-width:80%; padding:10px 14px; border-radius:12px; background:#f3e8ff }
.message.user .bubble { background:#6f42c1; color:white }
.composer { display:flex; gap:8px; align-items:center; margin-top:12px }
.composer input { flex:1; padding:12px 14px; border-radius:20px; border:1px solid #e5e7eb }
.send { background:#7c3aed; color:white; padding:8px 12px; border-radius:16px; border:none }
.abort { background:#ef4444; color:white; padding:8px 12px; border-radius:16px; border:none }
.error { margin-top:12px; padding:12px; background:#fff5f5; border:1px solid #fee2e2; border-radius:6px }

@media (max-width: 900px) {
  .chat-page { flex-direction:column }
  .sidebar { width:100%; transform:none; }
  .sidebar-toggle { display:block }
  .messages { height:50vh }
}
</style>