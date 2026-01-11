import { useEffect } from 'react';

export default function Chat() {
  useEffect(() => {
    // 客户端重定向到 /chat/ 路径
    window.location.href = '/chat/';
  }, []);

  return null;
}