export default async function handler(req, res) {
  // Support legacy GET but prefer POST with a body { model: 'chatgpt'|'deepseek'|'auto' }
  const method = req.method;
  let selectedModel = 'chatgpt'; // default preference
  let openaiModel = process.env.OPENAI_MODEL || 'gpt-4';
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (method === 'GET') {
    // legacy behavior: if GET, use DeepSeek as before for backward compatibility
    selectedModel = 'deepseek';
  } else if (method === 'POST') {
    try {
      const body = req.body || {};
      selectedModel = body.model || 'chatgpt';
      if (body.openaiModel) openaiModel = body.openaiModel;
    } catch {
      selectedModel = 'chatgpt';
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // A short message to send if none provided
  const messages = [
    { role: 'user', content: 'Hello, world! Please respond with a simple greeting.' }
  ];

  // Helper: call DeepSeek
  async function callDeepSeek() {
    if (!deepseekKey) {
      throw new Error('DEEPSEEK_API_KEY not set');
    }
    const body = { model: 'deepseek-chat', messages };
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) {
      try {
        const err = JSON.parse(text);
        throw new Error(err.error?.message || text);
      } catch {
        throw new Error(`API error: ${text}`);
      }
    }
    const data = JSON.parse(text);
    return data.choices?.[0]?.message?.content || 'No response';
  }

  // Helper: call OpenAI Responses API (supports new models like gpt-5-nano)
  async function callOpenAI() {
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }
    const reqBody = { model: openaiModel, input: 'Hello, world! Please respond with a simple greeting.' };
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(reqBody)
    });
    const text = await response.text();
    if (!response.ok) {
      try {
        const err = JSON.parse(text);
        throw new Error(err.error?.message || text);
      } catch {
        throw new Error(`API error: ${text}`);
      }
    }
    const data = JSON.parse(text);
    // Parse various possible response shapes from Responses API or older Chat API
    if (data.output_text) return data.output_text;
    if (Array.isArray(data.output) && data.output.length) {
      return data.output.map((o) => {
        if (typeof o === 'string') return o;
        if (o.content) {
          return o.content.map(c => c.text || (typeof c === 'string' ? c : '')).join('');
        }
        return '';
      }).join('\n');
    }
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    // Fallback: return stringified body so user can inspect
    return JSON.stringify(data);
  }

  try {
    // If user selected ChatGPT explicitly, require OpenAI key and do NOT fallback
    if (selectedModel === 'chatgpt') {
      if (!openaiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
      }
      try {
        const message = await callOpenAI();
        return res.status(200).json({ response: message, modelUsed: 'openai' });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // If user explicitly picked DeepSeek, use it (even if OpenAI available)
    if (selectedModel === 'deepseek') {
      const message = await callDeepSeek();
      return res.status(200).json({ response: message, modelUsed: 'deepseek' });
    }

    // For 'auto' or unknown selection: prefer OpenAI when key present, else DeepSeek
    if (selectedModel === 'auto' || !['chatgpt', 'deepseek'].includes(selectedModel)) {
      if (openaiKey) {
        const message = await callOpenAI();
        return res.status(200).json({ response: message, modelUsed: 'openai' });
      } else {
        const message = await callDeepSeek();
        return res.status(200).json({ response: message, modelUsed: 'deepseek' });
      }
    }

    // Fallback: should not reach here
    return res.status(400).json({ error: 'Invalid model selection' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
