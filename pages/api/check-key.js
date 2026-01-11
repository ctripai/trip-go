export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    res.status(200).json({ status: 'success', message: '✅ API Key 已正确配置' });
  } else {
    res.status(200).json({ status: 'error', message: '❌ API Key 未设置或为空' });
  }
}