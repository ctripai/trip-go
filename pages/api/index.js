export default async function handler(req, res) {
  console.log('API handler started');

  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  console.log('API Key present:', !!apiKey);
  if (!apiKey) {
    console.log('API Key not set');
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
  }

  const requestBody = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: 'Hello, world! Please respond with a simple greeting.',
      },
    ],
  };

  console.log('Request Body:', JSON.stringify(requestBody, null, 2));

  try {
    console.log('Starting fetch to DeepSeek API');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', [...response.headers]);

    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (!response.ok) {
      console.log('Response not ok, returning error');
      return res.status(response.status).json({ error: `API error: ${responseText}` });
    }

    const data = JSON.parse(responseText);
    const message = data.choices?.[0]?.message?.content || 'No response';
    console.log('Parsed message:', message);

    res.status(200).json({ response: message });
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
}
