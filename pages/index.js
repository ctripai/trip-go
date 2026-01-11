import { useState } from 'react';

export default function Home() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyStatus, setKeyStatus] = useState('');

  const checkKey = async () => {
    setLoading(true);
    setKeyStatus('');
    try {
      const res = await fetch('/api/check-key');
      const data = await res.json();
      setKeyStatus(data.message);
    } catch (err) {
      setKeyStatus('❌ 检查失败：' + err.message);
    }
    setLoading(false);
  };

  // Use gpt-5-nano only (no model selection UI)
  const [openaiModel, setOpenaiModel] = useState('gpt-5-nano');

  const callAPI = async () => {
    setLoading(true);
    setResponse('');
    setError('');

    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Always use OpenAI (gpt-5-nano) only
        body: JSON.stringify({ model: 'chatgpt', openaiModel })
      });
      const data = await res.json();

      if (res.ok) {
        setResponse((prev)=> `（来源: ${data.modelUsed || 'deepseek'}） ` + data.response + (data.fallbackReason ? `\n\n回退原因：${data.fallbackReason}` : ''));
      } else {
        // Prefer friendly error if provided by server
        const friendly = data.errorFriendly || data.error || '未知错误，请稍后重试';
        setError(friendly);
      }
    } catch (err) {
      setError('网络错误：' + err.message);
    }
    setLoading(false);
  };

  // New streaming call that consumes the Edge streaming endpoint
  const streamAPI = async () => {
    setLoading(true);
    setResponse('');
    setError('');
    setStreaming(true);

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiModel }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.errorFriendly || data.error || '流式请求失败');
        setStreaming(false);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        if (doneReading) break;
        const chunk = decoder.decode(value);
        // The Responses API streams SSE-like 'data: ...' chunks; handle both SSE and raw text
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(payload);
              // Responses API may contain `output_text` or output array
              if (parsed.output_text) {
                accumulated += parsed.output_text;
              } else if (Array.isArray(parsed.output) && parsed.output.length) {
                // try to extract text chunks
                parsed.output.forEach((o) => {
                  if (typeof o === 'string') accumulated += o;
                  else if (o.content) accumulated += (o.content.map(c => c.text || '').join(''));
                });
              } else if (parsed.choices && parsed.choices[0]?.delta?.content) {
                accumulated += parsed.choices[0].delta.content;
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
        setResponse(`（来源: openai） ${accumulated}`);
      }

      setStreaming(false);
      setLoading(false);
    } catch (err) {
      setStreaming(false);
      setLoading(false);
      setError('流式调用失败：' + err.message + '；尝试回退至 DeepSeek...');
      // Try fallback to non-streaming DeepSeek
      try {
        const res2 = await fetch('/api/deepseek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek' }) });
        const data2 = await res2.json();
        if (res2.ok) setResponse(`（来源: ${data2.modelUsed || 'deepseek'}） ` + data2.response);
        else setError(data2.error || '回退 DeepSeek 失败');
      } catch (er) {
        setError('回退失败：' + er.message);
      }
    }
  };

  const getTroubleshootingSteps = (errorMsg) => {
    if (errorMsg.includes('DEEPSEEK_API_KEY not set')) {
      return [
        '1. 检查 Vercel 环境变量是否正确设置：DEEPSEEK_API_KEY',
        '2. 确保变量名完全匹配，大小写敏感',
        '3. 重新部署项目以应用新环境变量'
      ];    } else if (errorMsg.includes('OPENAI_API_KEY not set')) {
      return [
        '1. 如果要使用 ChatGPT，请设置 Vercel 环境变量：OPENAI_API_KEY',
        '2. 可选地设置 OPENAI_MODEL（如 gpt-5-nano 或 gpt-3.5-turbo）以指定模型',
        '3. 重新部署项目以应用新环境变量'
      ];
    } else if (errorMsg.includes('我们暂时无法生成回复') || errorMsg.includes('OpenAI failed') || errorMsg.includes('DeepSeek failed')) {
      return [
        '1. 检查 OPENAI_API_KEY 是否正确配置且有权限访问所选模型（gpt-5-nano）',
        '2. 检查 DEEPSEEK_API_KEY 是否正确配置，以便在 OpenAI 失败时回退',
        '3. 查看服务器日志以获取完整错误信息',
        '4. 稍后重试或联系管理员'
      ];    } else if (errorMsg.includes('Insufficient Balance')) {
      return [
        '1. 访问 https://platform.deepseek.com 登录账户',
        '2. 检查账户余额，确保有足够的 credits',
        '3. 如需充值，按照平台指引操作',
        '4. 确认 API key 有效且未过期'
      ];
    } else if (errorMsg.includes('API error')) {
      return [
        '1. 检查 DeepSeek API key 是否有效：访问 https://platform.deepseek.com',
        '2. 确认 API key 有余额',
        '3. 验证模型名称 "deepseek-chat" 是否正确',
        '4. 检查网络连接'
      ];
    } else if (errorMsg.includes('网络错误')) {
      return [
        '1. 检查网络连接',
        '2. 确认 Vercel 服务器正常运行',
        '3. 查看浏览器控制台是否有更多错误信息'
      ];
    } else {
      return [
        '1. 检查浏览器控制台的错误信息',
        '2. 确认 API 端点可访问',
        '3. 查看 Vercel 部署日志'
      ];
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>TripGo - DeepSeek API Demo</h1>
      <p>逐步验证 API 配置和功能。默认优先使用 ChatGPT（如可用）。</p>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'inline-block', marginRight: '20px' }}>
          <strong>使用模型：</strong> gpt-5-nano
        </div>

        <button
          onClick={checkKey}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '检查中...' : '检查 API Key'}
        </button>
        <button
          onClick={callAPI}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '调用中...' : '调用 API'}
        </button>
        <button
          onClick={streamAPI}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading && streaming ? '流式中...' : '调用 API（流式）'}
        </button>
      </div>

      {keyStatus && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: keyStatus.includes('✅') ? '#e8f5e8' : '#ffebee',
          border: `1px solid ${keyStatus.includes('✅') ? '#4caf50' : '#f44336'}`,
          borderRadius: '5px'
        }}>
          <p>{keyStatus}</p>
        </div>
      )}

      {response && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '5px' }}>
          <h2 style={{ color: '#2e7d32' }}>✅ 成功响应：</h2>
          <p>{response}</p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '5px' }}>
          <h2 style={{ color: '#c62828' }}>❌ 错误：</h2>
          <p>{error}</p>
          <h3>排查步骤：</h3>
          <ul>
            {getTroubleshootingSteps(error).map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
