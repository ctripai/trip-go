export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Hello, world! Please respond with a simple greeting.',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API error: ${errorText}` });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'No response';

    res.status(200).json({ response: message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
