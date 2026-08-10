import React, { useState } from 'react';

const styles = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box',
    gap: '20px',
    overflowY: 'auto'
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0
  },
  pageDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  label: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#334155'
  },
  textarea: {
    width: '100%',
    height: '350px',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '1.5',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease'
  },
  submitButton: {
    padding: '14px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  }
};

function TextInputChunkingPage() {
  const [inputText, setInputText] = useState('');
  const [docTitle, setDocTitle] = useState('직접_입력_문서');

  // 텍스트를 즉시 save-chunks API로 전송하여 DB에 저장
  const handleImmediateSave = async () => {
    if (!inputText.trim()) {
      alert('저장할 내용을 입력해 주세요!');
      return;
    }

    const payload = {
      user_name: 'admin',
      source_filename: docTitle ? `${docTitle}.txt` : 'DIRECT_TEXT_INPUT.txt',
      chunks: [
        {
          page_no: "1",
          text: inputText
        }
      ]
    };

    try {
      const response = await fetch('/api/save-chunks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('지식 DB 저장 중 서버 오류가 발생했습니다.');
      }

      const result = await response.json();
      alert(result.message || '지식 DB에 성공적으로 저장되었습니다!');
      setInputText(''); // 저장 완료 후 입력창 초기화
    } catch (error) {
      console.error(error);
      alert('저장 실패: ' + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.titleArea}>
          <h2 style={styles.pageTitle}>✍️ 텍스트 직접 입력 및 즉시 저장</h2>
          <p style={styles.pageDesc}>
            복잡한 파이프라인 과정 없이, 작성한 텍스트를 곧바로 지식 DB(RAG)에 적재합니다.
          </p>
        </div>

        {/* 문서 제목 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={styles.label}>문서 제목 (Source Filename)</label>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none'
            }}
            placeholder="예: manual_note"
          />
        </div>

        {/* 텍스트 입력 에디터 */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>저장할 내용</label>
          <textarea
            style={styles.textarea}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="지식 DB에 적재할 내용을 자유롭게 입력하세요..."
          />
        </div>

        {/* 즉시 저장 버튼 */}
        <button
          type="button"
          style={styles.submitButton}
          onClick={handleImmediateSave}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#2563eb')}
        >
          💾 즉시 지식 DB 적재하기
        </button>
      </div>
    </div>
  );
}

export default TextInputChunkingPage;