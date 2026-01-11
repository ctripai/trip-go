import { useEffect } from 'react';

export default function Chat() {
  useEffect(() => {
    // 重定向到 /chat.html 路径
    window.location.href = '/chat.html';
  }, []);

  return null;
}