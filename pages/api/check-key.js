export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const parts = [];
  if (deepseekKey && deepseekKey.trim() !== '') {
    parts.push('✅ DeepSeek Key 已配置');
  } else {
    parts.push('❌ DeepSeek Key 未设置或为空');
  }
  if (openaiKey && openaiKey.trim() !== '') {
    parts.push('✅ OpenAI Key 已配置');
  } else {
    parts.push('❌ OpenAI Key 未设置或为空');
  }

  res.status(200).json({ status: 'ok', message: parts.join(' | ') });
}