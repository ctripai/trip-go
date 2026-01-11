export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const model = body.openaiModel || process.env.OPENAI_MODEL || 'gpt-5-nano';

  if (!openaiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set', errorFriendly: '未配置 OpenAI Key，无法使用流式 ChatGPT。' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Call OpenAI Responses API with streaming enabled
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model, input: body.input || 'Hello, world! Please respond with a simple greeting.', stream: true }),
  });

  // If upstream failed, forward error JSON
  if (!upstream.ok) {
    const text = await upstream.text();
    try {
      const json = JSON.parse(text);
      return new Response(JSON.stringify({ error: json.error?.message || text }), { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
    } catch {
      return new Response(JSON.stringify({ error: text }), { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Stream upstream body directly to client (SSE / chunked JSON). We pass through raw chunks.
  const reader = upstream.body.getReader();
  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Pass raw chunk downstream
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
