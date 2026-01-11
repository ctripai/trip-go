import { useState, useRef, useEffect } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', text: '嗨！我是 Layla，很高兴帮助你规划旅行。告诉我你的想法吧。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    <div className="chat-page">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-inner">
          <h2>Layla.</h2>
          <p className="muted">嗨，我是 Layla！很高兴帮助你打造完美的下一次旅行。</p>
          <button className="primary">创建一个新行程</button>

          <div className="premium">
            <p>升级订阅以解锁：</p>
            <ul>
              <li>无限次专属行程规划</li>
              <li>一键下载并分享精美 PDF</li>
              <li>挖掘隐藏宝藏景点</li>
            </ul>
            <button className="cta">开始 3 天免费试用</button>
          </div>
        </div>
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '收起' : '展开'}</button>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <div className="avatar"><img src="/avatar.png" alt="avatar" /></div>
          <div>
            <h3>正在收集信息以规划你的行程...</h3>
            <p className="muted">分享你的旅行想法 ♡</p>
          </div>
        </header>

        <section ref={messagesRef} className="messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="avatar-small" />
              <div className="bubble">{msg.text || (msg.streaming ? '...' : '')}</div>
            </div>
          ))}
        </section>

        <div className="composer">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} placeholder="问任何事情..." />
          <div className="composer-actions">
            <button onClick={sendMessage} className="send" disabled={loading}>发送</button>
            {streaming ? (
              <button onClick={abortStream} className="abort">中止</button>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="error">{error}</div>
        )}
      </main>

      <style jsx>{`
        .chat-page { display: flex; min-height: 100vh; font-family: Inter, Arial, sans-serif; }
        .sidebar { width: 340px; background: white; padding: 28px; box-sizing: border-box; position: relative; transition: transform 200ms ease; }
        .sidebar.closed { transform: translateX(-100%); }
        .sidebar-inner h2 { margin: 0 0 8px 0; }
        .muted { color: #6b7280; }
        .primary { background:#9b5cf6;color:white;padding:8px 14px;border-radius:16px;border:none;cursor:pointer }
        .premium { margin-top: 20px; }
        .cta { margin-top: 12px; background:#2d3748;color:white;padding:8px 12px;border-radius:14px;border:none;cursor:pointer }
        .sidebar-toggle { position:absolute; right:-44px; top:20px; background:#fff;border:1px solid #eee;padding:8px;border-radius:6px;cursor:pointer }

        .chat-area { flex: 1; background:#f6eefc; padding: 28px; box-sizing: border-box; display:flex; flex-direction:column }
        .chat-header { display:flex; gap:12px; align-items:center; }
        .avatar img { width:64px; height:64px; border-radius:50% }

        .messages { margin-top:20px; background:white; padding:16px; border-radius:10px; box-shadow: 0 0 0 1px rgba(0,0,0,0.04) inset; flex:1; overflow:auto }
        .message { display:flex; gap:10px; margin-bottom:12px; align-items:flex-start }
        .message.user { flex-direction:row-reverse }
        .avatar-small { width:36px;height:36px;border-radius:50%;background:#e9d5ff }
        .message.user .avatar-small { background:#6f42c1 }
        .bubble { max-width: 80%; padding:10px 14px;border-radius:12px; background:#f3e8ff }
        .message.user .bubble { background:#6f42c1;color:white }

        .composer { display:flex; gap:8px; margin-top:16px; align-items:center }
        .composer input { flex:1; padding:12px 14px;border-radius:20px;border:1px solid #e5e7eb }
        .composer-actions { display:flex; gap:8px }
        .send { background:#7c3aed;color:white;padding:8px 12px;border-radius:16px;border:none;cursor:pointer }
        .abort { background:#ef4444;color:white;padding:8px 12px;border-radius:16px;border:none;cursor:pointer }

        .error { margin-top:12px; padding:12px; background:#fff5f5; border:1px solid #fee2e2; border-radius:6px }

        @media (max-width: 900px) {
          .chat-page { flex-direction:column }
          .sidebar { width:100%; transform:none; position:relative }
          .sidebar.closed { transform:none; display:${'${sidebarOpen ? "block" : "none"}'} }
          .sidebar-toggle { display:block; right: 16px; top: 10px }
          .chat-area { padding:16px }
          .messages { height: 50vh }
        }
      `}</style>
    </div>
  );
}
