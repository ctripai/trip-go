import { useState, useRef, useEffect } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', text: '嗨！我是 Layla，很高兴帮助你规划旅行。告诉我你的想法吧。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef(null);
  const abortRef = useRef(null);
  const idRef = useRef(2);

  useEffect(() => {
    // scroll to bottom when messages update
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const appendMessage = (msg) => setMessages((m) => [...m, msg]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { id: idRef.current++, role: 'user', text: input.trim() };
    appendMessage(userMsg);
    setInput('');
    setError('');
    // create assistant placeholder
    const assistantId = idRef.current++;
    appendMessage({ id: assistantId, role: 'assistant', text: '', streaming: true });

    setLoading(true);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiModel: 'gpt-5-nano', input: userMsg.text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.errorFriendly || '流式请求失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = sseBuffer.indexOf('\n')) >= 0) {
          const rawLine = sseBuffer.slice(0, newlineIndex);
          sseBuffer = sseBuffer.slice(newlineIndex + 1);
          const line = rawLine.replace(/\r$/, '');
          if (!line) continue;
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              // finish
              break;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.output_text) accumulated += parsed.output_text;
              else if (Array.isArray(parsed.output)) {
                parsed.output.forEach(o => {
                  if (typeof o === 'string') accumulated += o;
                  else if (o?.content) {
                    if (Array.isArray(o.content)) o.content.forEach(c => { if (c?.text) accumulated += c.text; });
                  }
                });
              } else if (parsed.choices && Array.isArray(parsed.choices)) {
                parsed.choices.forEach(choice => {
                  if (choice.delta && typeof choice.delta.content === 'string') accumulated += choice.delta.content;
                  else if (choice.delta && Array.isArray(choice.delta.content)) accumulated += choice.delta.content.join('');
                });
              } else {
                accumulated += payload;
              }
            } catch {
              accumulated += payload;
            }
          } else {
            accumulated += line;
          }
        }

        // update assistant message in-place
        setMessages((prev) => prev.map(msg => msg.id === assistantId ? { ...msg, text: accumulated } : msg));
      }

      // final update
      setMessages((prev) => prev.map(msg => msg.id === assistantId ? { ...msg, text: accumulated, streaming: false } : msg));
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('已取消流式');
      } else {
        setError(err.message || '调用出错');
        // try fallback non-streaming to /api/deepseek
        try {
          const res2 = await fetch('/api/deepseek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek' }) });
          const data2 = await res2.json();
          if (res2.ok) {
            setMessages((prev) => prev.map(msg => msg.id === assistantId ? { ...msg, text: data2.response, streaming: false } : msg));
          } else {
            setMessages((prev) => prev.filter(msg => msg.id !== assistantId));
          }
        } catch (er) {
          setMessages((prev) => prev.filter(msg => msg.id !== assistantId));
        }
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const abortStream = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Left panel */}
      <div style={{ width: '38%', padding: '40px', background: '#fff', boxSizing: 'border-box' }}>
        <h2 style={{ marginTop: 0 }}>Layla.</h2>
        <p>嗨，我是 Layla！很高兴帮助你打造完美的下一次旅行。告诉我你的想法，让我们开始吧。</p>
        <button style={{ background: '#9b5cf6', color: 'white', padding: '10px 16px', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>创建一个新行程</button>

        <div style={{ marginTop: 30 }}>
          <p>为了让我们的冒险不被打断，快升级订阅吧，这样我们就能解锁：</p>
          <ul>
            <li>无限次专属行程规划</li>
            <li>一键下载并分享精美 PDF</li>
            <li>挖掘只有圈内人才知道的隐藏宝藏景点</li>
          </ul>
        </div>

        <div style={{ position: 'absolute', bottom: 30 }}>
          <button style={{ background: '#2d3748', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '24px', cursor: 'pointer' }}>开始 3 天免费试用</button>
        </div>
      </div>

      {/* Right chat area */}
      <div style={{ flex: 1, background: '#f6eefc', padding: '40px', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eee', overflow: 'hidden' }}>
              <img src="/avatar.png" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>正在收集信息以规划你的行程...</h3>
              <p style={{ margin: 0, color: '#6b7280' }}>分享你的旅行想法 ♡</p>
            </div>
          </div>

          <div ref={messagesRef} style={{ marginTop: 24, height: '60vh', overflowY: 'auto', padding: 16, background: 'white', borderRadius: 10, boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', marginBottom: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: msg.role === 'user' ? '#6f42c1' : '#e9d5ff' }} />
                <div style={{ maxWidth: '80%', background: msg.role === 'user' ? '#6f42c1' : '#f3e8ff', color: msg.role === 'user' ? 'white' : 'black', padding: '10px 14px', borderRadius: 12, whiteSpace: 'pre-wrap' }}>
                  {msg.text || (msg.streaming ? '...' : '')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} placeholder="问任何事情..." style={{ flex: 1, padding: '12px 14px', borderRadius: 20, border: '1px solid #e5e7eb' }} />
            <button onClick={sendMessage} disabled={loading} style={{ padding: '10px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 20 }}>发送</button>
            {streaming ? (
              <button onClick={abortStream} style={{ padding: '10px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 20 }}>中止</button>
            ) : null}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 6 }}>
              <strong>错误：</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
