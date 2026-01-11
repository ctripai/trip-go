export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = req.body || {}
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4'

  // messages: array of { role, content }
  const messages = Array.isArray(body.messages) ? body.messages : []
  const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')

  const prompt = `You are a helpful travel planner. Based on the conversation below, generate a concise, day-by-day itinerary in Markdown. Include travel dates if mentioned, top activities, a short summary for each day, and practical tips (transport, packing, estimated budget). Conversation:\n\n${conversation}`

  async function callOpenAI() {
    if (!openaiKey) throw new Error('OPENAI_API_KEY not set')
    const reqBody = { model: openaiModel, input: prompt }
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` }, body: JSON.stringify(reqBody)
    })
    const text = await r.text()
    if (!r.ok) {
      try { const err = JSON.parse(text); throw new Error(err.error?.message || text) } catch { throw new Error(text) }
    }
    const data = JSON.parse(text)
    if (data.output_text) return data.output_text
    if (Array.isArray(data.output) && data.output.length) return data.output.map(o => (typeof o === 'string' ? o : (o.content ? o.content.map(c => c.text || '').join('') : ''))).join('\n')
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content
    return JSON.stringify(data)
  }

  async function callDeepSeek() {
    if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not set')
    const body = { model: 'deepseek-chat', messages: [{ role: 'system', content: prompt }] }
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` }, body: JSON.stringify(body)
    })
    const text = await r.text()
    if (!r.ok) {
      try { const err = JSON.parse(text); throw new Error(err.error?.message || text) } catch { throw new Error(text) }
    }
    const data = JSON.parse(text)
    return data.choices?.[0]?.message?.content || JSON.stringify(data)
  }

  try {
    // OpenAI-first, fallback to DeepSeek
    if (openaiKey) {
      try {
        const plan = await callOpenAI()
        return res.status(200).json({ plan, modelUsed: 'openai' })
      } catch (err) {
        const openaiErr = err.message || String(err)
        if (deepseekKey) {
          try {
            const plan = await callDeepSeek()
            return res.status(200).json({ plan, modelUsed: 'deepseek', fallbackReason: openaiErr })
          } catch (dsErr) {
            const deepseekErr = dsErr.message || String(dsErr)
            return res.status(502).json({ error: `OpenAI failed: ${openaiErr}; DeepSeek failed: ${deepseekErr}`, errorFriendly: '我们暂时无法生成行程，请稍后重试。' })
          }
        }
        return res.status(502).json({ error: `OpenAI failed: ${openaiErr}; DEEPSEEK_API_KEY not set`, errorFriendly: '未检测到可用的后备模型（DeepSeek），请设置 DEEPSEEK_API_KEY 或确保 OPENAI_API_KEY 可用。' })
      }
    }

    // No OpenAI key, try DeepSeek
    if (deepseekKey) {
      const plan = await callDeepSeek()
      return res.status(200).json({ plan, modelUsed: 'deepseek' })
    }

    return res.status(502).json({ error: 'No model keys configured', errorFriendly: '未配置 OPENAI 或 DEEPSEEK API Key，无法生成行程。' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}