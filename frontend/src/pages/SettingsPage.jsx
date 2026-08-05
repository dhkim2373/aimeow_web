import React, { useState, useEffect } from 'react';
import { fetchServerConfigApi } from '../api/chunkingApi';

const styles = {
  container: {
    padding: '28px',
    backgroundColor: '#ffffff',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f1f5f9'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '650px',
    backgroundColor: '#f8fafc',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '6px'
  },
  subText: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff'
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
  }
};

function SettingsPage() {
  const [targetApiUrl, setTargetApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // 백엔드 프로퍼티 설정값 로드
    fetchServerConfigApi().then(data => {
      const savedUrl = localStorage.getItem('aimeow_target_api_url') || data.target_api_url || '';
      const savedKey = localStorage.getItem('aimeow_api_key') || data.api_key || '';
      setTargetApiUrl(savedUrl);
      setApiKey(savedKey);
    });
  }, []);  

  const handleSave = () => {
    localStorage.setItem('aimeow_target_api_url', targetApiUrl.trim());
    localStorage.setItem('aimeow_api_key', apiKey.trim());
    alert("🐾 RAG Target REST API 연동 설정이 저장되었다냥!");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <span>⚙️</span>
          <span style={{ color: '#2563eb' }}>AI Meow</span> RAG 파이프라인 연동 설정
        </h2>
      </div>

      <div style={styles.card}>
        <div>
          <label style={styles.label}>🎯 Target Rest API URL (Webhook 수신주소)</label>
          <div style={styles.subText}>정제 완료된 청크 데이터를 수신할 고객사의 REST API 엔드포인트입니다.</div>
          <input 
            type="text" 
            placeholder="예: https://api.mycompany.com/v1/rag/ingest" 
            value={targetApiUrl}
            onChange={(e) => setTargetApiUrl(e.target.value)}
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>🔑 Authorization Bearer Token (선택 사항)</label>
          <div style={styles.subText}>인증이 필요한 REST API인 경우 토큰값을 입력하세요.</div>
          <input 
            type="password" 
            placeholder="your-secret-bearer-token" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={styles.input}
          />
        </div>

        <button style={styles.saveBtn} onClick={handleSave}>
          🐾 연동 설정 저장하기
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;