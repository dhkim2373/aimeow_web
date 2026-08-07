import React, { useState, useEffect } from 'react';
import { fetchServerConfigApi, saveServerConfigApi } from '../api/chunkingApi';

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
    maxWidth: '720px',
    backgroundColor: '#f8fafc',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 0,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
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
    padding: '11px 14px',
    marginBottom: '16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
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
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    marginTop: '8px'
  },
  // 🎯 웹훅 JSON 스키마 안내 박스 스타일
  guideBox: {
    marginTop: '20px',
    padding: '18px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    color: '#f1f5f9'
  },
  guideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #334155'
  },
  copyBtn: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    marginBottom: '12px',
    textAlign: 'left'
  },
  th: {
    padding: '8px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontWeight: '600',
    borderBottom: '1px solid #334155'
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #1e293b',
    color: '#e2e8f0'
  },
  preCode: {
    margin: 0,
    padding: '14px',
    backgroundColor: '#020617',
    borderRadius: '8px',
    border: '1px solid #1e293b',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#38bdf8',
    overflowX: 'auto',
    maxHeight: '260px'
  }
};

function SettingsPage() {
  // 1. RAG Webhook 설정 상태
  const [targetApiUrl, setTargetApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  // 2. 외부 이미지 서버 연동 설정 상태
  const [imageUploadUrl, setImageUploadUrl] = useState('');
  const [imageServerToken, setImageServerToken] = useState('');

  // 3. 복사 완료 피드백 상태
  const [copied, setCopied] = useState(false);

  // 🎯 백엔드 WebhookPayload 표준 규격 샘플 JSON
  const sampleWebhookPayload = {
    "user_name": "admin",
    "global_prefix": "변경관리_SOP",
    "source_filename": "sample_document.pdf",
    "chunks": [
      {
        "line_index": "0",
        "page_number": 1,
        "text": "![이미지](http://aimeow.ddns.net:8100/static/default_user/images/img_p1_7df6.png)\n\n캡션: 변경 신청서\n유형: TABLE\n태그: 변경관리 SOP, 샘플\n\n[수동 입력 텍스트 또는 표 마크다운 내용]",
        "is_split_point": true,
        "is_deleted": false
      }
    ]
  };

  // 🎯 접속 시 서버로부터 설정 로드
  useEffect(() => {
    fetchServerConfigApi()
      .then(data => {
        if (data) {
          setTargetApiUrl(data.target_api_url || '');
          setApiKey(data.api_key || '');
          setImageUploadUrl(data.image_upload_url || '');
          setImageServerToken(data.image_server_token || '');
        }
      })
      .catch(err => {
        console.error("서버 설정 로드 실패:", err);
      });
  }, []);

  // 🎯 설정 저장
  const handleSave = async () => {
    try {
      await saveServerConfigApi({
        target_api_url: targetApiUrl.trim(),
        api_key: apiKey.trim(),
        image_upload_url: imageUploadUrl.trim(),
        image_server_token: imageServerToken.trim()
      });
      alert("🐾 RAG 연동 및 이미지 서버 설정이 서버에 성공적으로 저장되었습니다!");
    } catch (err) {
      console.error("설정 저장 오류:", err);
      alert("⚠️ 서버에 설정을 저장하는 중 오류가 발생했습니다.");
    }
  };

  // 🎯 샘플 JSON 클립보드 복사
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleWebhookPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {/* SECTION 1: Target REST API (Webhook) 연동 */}
        <h3 style={styles.sectionTitle}>
          🎯 Target REST API 연동 설정 (Webhook)
        </h3>

        <div>
          <label style={styles.label}>Target Rest API URL (Webhook 수신주소)</label>
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

        {/* 💡 [신규 추가]: 웹훅 전송 JSON 스키마 가이드 영역 */}
        <div style={styles.guideBox}>
          <div style={styles.guideHeader}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📋</span> 웹훅 수신 데이터 규격 (JSON Schema Guide)
            </span>
            <button style={styles.copyBtn} onClick={handleCopyJson}>
              <span>{copied ? '✅' : '📄'}</span>
              <span>{copied ? '복사 완료!' : '샘플 JSON 복사'}</span>
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.5' }}>
            설정된 <b>Target REST API URL</b>로 전송되는 <code style={{ color: '#f43f5e', backgroundColor: '#1e293b', padding: '2px 4px', borderRadius: '4px' }}>POST</code> 표준 바디 포맷입니다. 수신 시스템 개발 시 아래 구조를 참조하세요.
          </div>

          {/* 주요 필드 설명 구조표 */}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>필드명</th>
                <th style={styles.th}>타입</th>
                <th style={styles.th}>설명</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...styles.td, color: '#38bdf8', fontFamily: 'monospace' }}>user_name</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>작성자 / 사용자 명</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#38bdf8', fontFamily: 'monospace' }}>global_prefix</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>공통 헤더 메타데이터 Prefix</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#38bdf8', fontFamily: 'monospace' }}>source_filename</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>원본 파일명 (예: doc.pdf, IMAGE_INPUT)</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#38bdf8', fontFamily: 'monospace' }}>chunks</td>
                <td style={{ ...styles.td, color: '#facc15' }}>Array&lt;Object&gt;</td>
                <td style={styles.td}>정제된 청크 데이터 목록</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#c084fc', fontFamily: 'monospace', paddingLeft: '20px' }}>└ line_index</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>라인 / 청크 순번 Index</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#c084fc', fontFamily: 'monospace', paddingLeft: '20px' }}>└ page_number</td>
                <td style={{ ...styles.td, color: '#f87171' }}>number</td>
                <td style={styles.td}>소속 페이지 번호</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#c084fc', fontFamily: 'monospace', paddingLeft: '20px' }}>└ text</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>정제된 마크다운 본문 (텍스트/이미지)</td>
              </tr>
            </tbody>
          </table>

          {/* 샘플 JSON 프리뷰 */}
          <pre style={styles.preCode}>
            {JSON.stringify(sampleWebhookPayload, null, 2)}
          </pre>
        </div>

        <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '24px 0' }} />

        {/* SECTION 2: 외부/운영 이미지 서버 연동 */}
        <h3 style={styles.sectionTitle}>
          🖼️ 외부/운영 이미지 서버 연동 (선택 사항)
        </h3>

        <div>
          <label style={styles.label}>🌐 Image Upload REST API URL</label>
          <div style={styles.subText}>
            등록 시 DB 적재 직전에 로컬 임시 이미지를 해당 서버로 업로드하여, <b>반환받은 영구 URL</b>로 교체하여 저장합니다.
          </div>
          <input 
            type="text" 
            placeholder="예: https://img-server.company.com/api/v1/upload" 
            value={imageUploadUrl}
            onChange={(e) => setImageUploadUrl(e.target.value)}
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>🔑 Image Server Authorization Token (선택 사항)</label>
          <div style={styles.subText}>이미지 업로드 API 호출 시 필요한 인증 토큰입니다.</div>
          <input 
            type="password" 
            placeholder="image-server-access-token" 
            value={imageServerToken}
            onChange={(e) => setImageServerToken(e.target.value)}
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