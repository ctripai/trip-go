import { useState } from 'react';

export default function Home() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const callAPI = async () => {
    setLoading(true);
    setResponse('');
    setError('');

    try {
      const res = await fetch('/api/index');
      const data = await res.json();

      if (res.ok) {
        setResponse(data.response);
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
        '2. 确认 API 端点 /api/index 可访问',
        '3. 查看 Vercel 部署日志'
      ];
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>TripGo - DeepSeek API Demo</h1>
      <p>点击按钮调用 DeepSeek API，测试是否正常工作。</p>
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
