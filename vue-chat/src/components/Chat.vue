<template>
  <div class="chat-page">
    <header class="page-header">
      <div class="header-container">
        <div class="logo-container">
          <div class="logo">L</div>
          <div class="logo-text">Layla.</div>
        </div>
        
        <div class="user-profile">
          <div class="user-avatar"></div>
          <span>旅行者</span>
        </div>
      </div>
    </header>
    
    <div class="container">
      <!-- 左侧聊天区域 -->
      <div class="chat-container">
        <div class="chat-messages">
          <MessageList :messages="messages" ref="messageListRef" />
        </div>
        
        <Composer :loading="loading" :streaming="streaming" @send="onSend" @abort="abortStream" />
        
        <div v-if="error" class="error">{{ error }}</div>
      </div>
      
      <!-- 右侧规划展示区域 -->
      <div class="plan-container">
        <div class="plan-header">
          <h2>正在收集信息以规划你的行程...</h2>
        </div>
        
        <Itinerary :plan="itinerary" :loading="generating" @regenerate="generatePlanFromMessages" />
      </div>
    </div>
    
    <footer>
      <p>© 我根据所附的浏览器的建议，<a href="#" class="feedback-link">点击分享任何反馈</a>。</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import MessageList from './MessageList.vue'
import Composer from './Composer.vue'
import Itinerary from './Itinerary.vue'

const messages = ref([
  { id: 1, role: 'assistant', text: '你好！我是Layla，你的AI旅行助手。请告诉我你的旅行想法，比如目的地、旅行时间、预算和兴趣，我将为你量身打造完美的行程。' }
])
const loading = ref(false)
const streaming = ref(false)
const error = ref('')
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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.chat-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.6;
}

/* Header样式 */
.page-header {
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 15px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background-image: url('https://picsum.photos/seed/layla-logo/100/100');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 22px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.logo-text {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #2d7ff9 0%, #7b61ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-weight: 500;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-image: url('https://picsum.photos/seed/user-avatar/80/80');
  background-size: cover;
  background-position: center;
}

.container {
  display: flex;
  max-width: 1200px;
  margin: 30px auto;
  flex: 1;
  gap: 30px;
  padding: 0 20px;
}

/* 左侧聊天区域样式 */
.chat-container {
  flex: 1;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

/* 右侧规划区域样式 */
.plan-container {
  flex: 1;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.plan-header {
  background-color: #7b61ff;
  color: white;
  padding: 24px 30px;
}

.plan-header h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.error {
  margin: 12px 30px;
  padding: 12px;
  background: #fff5f5;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  color: #dc2626;
}

/* 页脚样式 */
footer {
  text-align: center;
  margin-top: 20px;
  padding: 25px;
  color: #888;
  font-size: 14px;
  border-top: 1px solid #eee;
  background-color: white;
}

.feedback-link {
  color: #2d7ff9;
  text-decoration: none;
  font-weight: 500;
}

.feedback-link:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 900px) {
  .container {
    flex-direction: column;
  }
  
  .chat-messages {
    max-height: 400px;
  }
  
  .header-container {
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
  }
  
  .logo-text {
    font-size: 24px;
  }
}

@media (max-width: 600px) {
  .user-profile {
    display: none;
  }
}
</style>