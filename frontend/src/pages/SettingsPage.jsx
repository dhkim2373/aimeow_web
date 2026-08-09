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
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '2px 8px',
    marginBottom: '16px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  methodBadge: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '900',
    padding: '4px 8px',
    borderRadius: '6px',
    marginRight: '8px',
    letterSpacing: '0.5px',
    userSelect: 'none'
  },
  inputInWrapper: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    color: '#1e293b',
    padding: '9px 4px',
    fontFamily: 'monospace',
    backgroundColor: 'transparent'
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
    backgroundColor: '#ffffff',
    fontFamily: 'monospace'
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
  const [fileFieldName, setFileFieldName] = useState('file');
  const [responseUrlKey, setResponseUrlKey] = useState('auto'); // 🎯 응답 JSON URL 키 경로 기본값 'auto'

  // 3. UI 및 복사 관련 피드백 상태
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // 🎯 백엔드 WebhookPayload 최신 표준 규격 샘플 JSON
  const sampleWebhookPayload = {
    "user_name": "admin",
    "global_prefix": "의약품3PL_인터페이스명세서",
    "source_filename": "표준_인터페이스정의서.pdf",
    "chunks": [
      {
        "page_no": "1",
        "text": "[의약품3PL_인터페이스명세서]\n\nInterface Specification\n표준 인터페이스정의서 GeoNet+ for 3PL (의약품)"
      },
      {
        "page_no": "1~2",
        "text": "[의약품3PL_인터페이스명세서]\n\n1.2.3 레이아웃 커스터마이징 및 데이터 매핑..."
      }
    ]
  };

  // 🎯 초기 진입 시 서버로부터 설정 데이터 로드
  useEffect(() => {
    fetchServerConfigApi()
      .then(data => {
        if (data) {
          setTargetApiUrl(data.target_api_url || '');
          setApiKey(data.api_key || '');
          setImageUploadUrl(data.image_upload_url || '');
          setImageServerToken(data.image_server_token || '');
          setFileFieldName(data.file_field_name || 'file');
          setResponseUrlKey(data.response_url_key || 'auto');
        }
      })
      .catch(err => {
        console.error("서버 설정 로드 실패:", err);
      });
  }, []);

  // 🎯 서버 연동 설정 저장 핸들러
  const handleSave = async () => {
    try {
      setSaving(true);
      await saveServerConfigApi({
        target_api_url: targetApiUrl.trim(),
        api_key: apiKey.trim(),
        image_upload_url: imageUploadUrl.trim(),
        image_server_token: imageServerToken.trim(),
        file_field_name: fileFieldName.trim() || 'file',
        response_url_key: responseUrlKey.trim() || 'auto'
      });
      alert("🐾 RAG 연동 및 이미지 서버 설정이 성공적으로 저장되었습니다!");
    } catch (err) {
      console.error("설정 저장 오류:", err);
      alert(`⚠️ 서버 설정 저장 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
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
          <div style={styles.subText}>
            정제 완료된 청크 데이터를 <strong style={{ color: '#2563eb' }}>HTTP POST (JSON)</strong> 방식으로 수신할 고객사의 REST API 엔드포인트입니다.
          </div>
          
          <div style={styles.inputWrapper}>
            <span style={styles.methodBadge}>POST</span>
            <input 
              type="text" 
              placeholder="예: http://host.docker.internal:5678/webhook-test/..." 
              value={targetApiUrl}
              onChange={(e) => setTargetApiUrl(e.target.value)}
              style={styles.inputInWrapper}
            />
          </div>
        </div>

        <div>
          <label style={styles.label}>🔑 Authorization Bearer Token (선택 사항)</label>
          <div style={styles.subText}>인증이 필요한 REST API인 경우 토큰값을 입력하세요.</div>
          <input 
            type="text" 
            placeholder="your-secret-bearer-token" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* 웹훅 전송 JSON 스키마 가이드 영역 */}
        <div style={styles.guideBox}>
          <div style={styles.guideHeader}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📋</span> 웹훅 수신 데이터 규격 (JSON Schema Guide)
            </span>
            <button style={styles.copyBtn} onClick={handleCopyJson} type="button">
              <span>{copied ? '✅' : '📄'}</span>
              <span>{copied ? '복사 완료!' : '샘플 JSON 복사'}</span>
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.5' }}>
            설정된 <b>Target REST API URL</b>로 전송되는 <code style={{ color: '#4ade80', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>POST</code> 표준 바디 포맷입니다. 수신 시스템 개발 시 아래 구조를 참조하세요.
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
                <td style={{ ...styles.td, color: '#c084fc', fontFamily: 'monospace', paddingLeft: '20px' }}>└ page_no</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>소속 페이지 또는 페이지 범위 (예: "1", "1~3")</td>
              </tr>
              <tr>
                <td style={{ ...styles.td, color: '#c084fc', fontFamily: 'monospace', paddingLeft: '20px' }}>└ text</td>
                <td style={{ ...styles.td, color: '#4ade80' }}>string</td>
                <td style={styles.td}>[Prefix]가 포함된 정제 완료 순수 텍스트 본문</td>
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
            등록 시 DB 적재 직전에 로컬 임시 이미지를 해당 서버로 업로드하여, <b>반환받은 영구 URL</b>로 교체하여 저장합니다.<br/>
            <span style={{ color: '#2563eb' }}>* ImgBB 등 Query Param으로 토큰을 전달받는 서버는 URL에 <code>{"{key}"}</code> 파라미터를 명시하면 아래 토큰값으로 치환됩니다.</span>
          </div>
          
          <div style={styles.inputWrapper}>
            <span style={styles.methodBadge}>POST</span>
            <input 
              type="text" 
              placeholder="예: https://api.imgbb.com/1/upload?expiration=600&key={key}" 
              value={imageUploadUrl}
              onChange={(e) => setImageUploadUrl(e.target.value)}
              style={styles.inputInWrapper}
            />
          </div>
        </div>

        <div>
          <label style={styles.label}>📁 Form Data File Key Name (기본값: file)</label>
          <div style={styles.subText}>
            이미지 업로드 multipart/form-data 요청 시 이미지 파일이 담기는 파라미터 키 이름입니다. (일반 API: <b>file</b>, ImgBB: <b>image</b>)
          </div>
          <input 
            type="text" 
            placeholder="file 또는 image" 
            value={fileFieldName}
            onChange={(e) => setFileFieldName(e.target.value)}
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>🔍 Response Image URL Key Path (기본값: auto)</label>
          <div style={styles.subText}>
            업로드 후 반환되는 JSON 응답에서 이미지 영구 URL이 위치한 키 경로입니다. 중첩 구조는 점(<code>.</code>)으로 구분합니다. (ImgBB: <b>data.url</b>, Imgur: <b>data.link</b>, 일반 API: <b>url</b> 또는 <b>auto</b>)
          </div>
          <input 
            type="text" 
            placeholder="auto 또는 data.url" 
            value={responseUrlKey}
            onChange={(e) => setResponseUrlKey(e.target.value)}
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>🔑 Image Server Authorization Token / API Key (선택 사항)</label>
          <div style={styles.subText}>
            이미지 업로드 API 호출 시 필요한 인증 토큰 또는 API 키입니다. (Bearer 토큰 또는 <code>{"{key}"}</code> 치환값으로 사용됩니다)
          </div>
          <input 
            type="text" 
            placeholder="image-server-access-token 또는 YOUR_IMGBB_API_KEY" 
            value={imageServerToken}
            onChange={(e) => setImageServerToken(e.target.value)}
            style={styles.input}
          />
        </div>

        <button 
          type="button"
          style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }} 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '🐾 저장 중...' : '🐾 연동 설정 저장하기'}
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;