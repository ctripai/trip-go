import { useState } from 'react';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f7fa'
    }}>
      <div style={{
        maxWidth: '600px',
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #2d7ff9 0%, #7b61ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '20px'
        }}>
          嘿 旅行者,
        </h1>
        
        <p style={{
          fontSize: '18px',
          color: '#333',
          marginBottom: '30px',
          lineHeight: '1.5'
        }}>
          我们今天去哪儿?
        </p>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '40px',
          lineHeight: '1.5'
        }}>
          告诉我你的风格和预算，我会为你设计一个独一无二的旅行体验
        </p>
        
        <div style={{ marginBottom: '40px' }}>
          <a 
            href="/chat" 
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#7b61ff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6d52e8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7b61ff';
            }}
          >
            开始规划旅行
          </a>
        </div>
        
        <div style={{
          fontSize: '14px',
          color: '#999',
          marginTop: '20px'
        }}>
          <p>看看我怎么能帮你 ↓</p>
        </div>
      </div>
    </div>
  );
}
