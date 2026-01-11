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

  const [selectedModel, setSelectedModel] = useState('chatgpt');
  const [openaiModel, setOpenaiModel] = useState('gpt-4');

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
        body: JSON.stringify({ model: selectedModel, openaiModel })
      });
      const data = await res.json();

      if (res.ok) {
        setResponse((prev)=> `（来源: ${data.modelUsed || 'deepseek'}） ` + data.response + (data.fallbackReason ? `\n\n回退原因：${data.fallbackReason}` : ''));
      } else {
        setError(data.error || '未知错误');
      }
    } catch (err) {
      setError('网络错误：' + err.message);
    }
    setLoading(false);
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
        '2. 可选地设置 OPENAI_MODEL（如 gpt-4）以指定模型',
        '3. 重新部署项目以应用新环境变量'
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
        <label style={{ marginRight: '10px' }}>
          <strong>选择模型：</strong>
        </label>
        <select value={selectedModel} onChange={(e)=>setSelectedModel(e.target.value)} style={{ padding: '8px 10px', marginRight: '20px' }}>
          <option value="chatgpt">ChatGPT（优先）</option>
          <option value="deepseek">DeepSeek</option>
        </select>
        {selectedModel === 'chatgpt' && (
          <>
            <label style={{ marginLeft: '10px', marginRight: '10px' }}>
              <strong>ChatGPT 模型：</strong>
            </label>
            <select value={openaiModel} onChange={(e)=>setOpenaiModel(e.target.value)} style={{ padding: '8px 10px', marginRight: '20px' }}>
              <option value="gpt-4">gpt-4</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
          </>
        )}

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
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '调用中...' : '调用 API'}
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
