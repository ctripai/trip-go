import { useState } from 'react';

export default function Home() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const callAPI = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/index');
      const data = await res.json();
      setResponse(data.response || data.error);
    } catch (error) {
      setResponse('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>TripGo - DeepSeek API Demo</h1>
      <p>点击按钮调用 DeepSeek API：</p>
      <button onClick={callAPI} disabled={loading}>
        {loading ? '加载中...' : '调用 API'}
      </button>
      {response && (
        <div style={{ marginTop: '20px' }}>
          <h2>响应：</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
