import React, { useState, useRef } from 'react';
import { recursiveSplitApi } from '../api/chunkingApi';

const styles = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '20px'
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  headerSection: {
    marginBottom: '16px',
    flexShrink: 0
  },
  pageTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 4px 0'
  },
  pageDesc: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0
  },
  splitWrapper: {
    display: 'flex',
    width: '100%',
    flex: 1,
    gap: '16px',
    overflow: 'hidden',
    minHeight: 0
  },
  leftPanel: {
    flex: 1,
    height: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  rightPanel: {
    flex: 1,
    height: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subText: {
    fontSize: '11px',
    color: '#64748b'
  },
  textarea: {
    width: '100%',
    flex: 1,
    minHeight: '160px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '1.5',
    backgroundColor: '#ffffff'
  },
  textInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff'
  },
  rowGroup: {
    display: 'flex',
    gap: '10px'
  },
  previewList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '4px'
  },
  chunkCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#1e293b',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  },
  actionButton: {
    padding: '10px 16px',
    backgroundColor: '#475569',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
    flexShrink: 0,
    marginTop: 'auto'
  },
  submitButton: {
    padding: '10px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
    flexShrink: '0'
  }
};

function TextInputChunkingPage() {
  const [docTitle, setDocTitle] = useState('직접_입력_문서');
  const [globalPrefix, setGlobalPrefix] = useState('');
  const [delimitersInput, setDelimitersInput] = useState('\\n\\n, \\n, " "');
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);

  const [isSplitting, setIsSplitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewChunks, setPreviewChunks] = useState([]);

  const textRef = useRef(null);

  const parseDelimiters = (rawStr) => {
    if (!rawStr) return ["\n\n", "\n", " ", ""];
    return rawStr.split(',').map(d => {
      const trimmed = d.trim().replace(/^["']|["']$/g, '');
      return trimmed.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    });
  };

  // ✂️ 백엔드 랭체인 스플리터에 분할 요청 후 우측에 결과 표시
  const handleRunSplit = async () => {
    const rawText = textRef.current?.value || '';
    if (!rawText.trim()) {
      alert('분할할 텍스트 내용을 입력해 주세요!');
      return;
    }

    setIsSplitting(true);
    try {
      const delimiters = parseDelimiters(delimitersInput);
      const size = parseInt(chunkSize, 10) || 500;
      const overlap = parseInt(chunkOverlap, 10) || 50;

      const response = await recursiveSplitApi(rawText, size, overlap, delimiters);
      setPreviewChunks(response.chunks || []);
    } catch (error) {
      console.error(error);
      alert('랭체인 분할 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSplitting(false);
    }
  };

  // 💾 최종 지식 DB 적재 버튼 핸들러
  const handleImmediateSave = async () => {
    if (previewChunks.length === 0) {
      alert('먼저 [✂️ 랭체인 청크 분할 미리보기 수행] 버튼을 눌러 청크를 생성해 주세요!');
      return;
    }

    setIsSaving(true);

    try {
      const formattedChunks = previewChunks.map((chunkObj) => ({
        page_no: "1",
        page_number: 1,
        text: chunkObj.clean_text || chunkObj.raw_content || "",
        is_deleted: false,
        is_split_point: true
      }));

      if (!window.confirm(`총 ${formattedChunks.length}개의 랭체인 청크를 지식 DB에 적재하시겠습니까?`)) {
        setIsSaving(false);
        return;
      }

      const API_BASE_URL = window.location.port === '5173' ? `http://${window.location.hostname}:8100` : '';
      const targetApiUrl = localStorage.getItem('aimeow_target_api_url') || '';
      const apiKey = localStorage.getItem('aimeow_api_key') || '';

      const payload = {
        user_name: 'admin',
        global_prefix: globalPrefix,
        source_filename: docTitle ? `${docTitle}.txt` : 'DIRECT_TEXT_INPUT.txt',
        chunks: formattedChunks,
        target_api_url: targetApiUrl,
        api_key: apiKey
      };

      const saveResponse = await fetch(`${API_BASE_URL}/api/save-chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json().catch(() => ({}));
        throw new Error(errData.detail || '지식 DB 저장 중 서버 오류가 발생했습니다.');
      }

      const result = await saveResponse.json();
      alert(result.message || `🎉 총 ${formattedChunks.length}개의 청크가 지식 DB에 성공적으로 저장되었습니다!`);
      
      if (textRef.current) {
        textRef.current.value = '';
        setPreviewChunks([]);
      }
    } catch (error) {
      console.error(error);
      alert('저장 실패: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerSection}>
          <h2 style={styles.pageTitle}>🧩 서버 랭체인 멀티 구분자 텍스트 청킹 매니저</h2>
          <p style={styles.pageDesc}>
            좌측에 텍스트를 입력하고 조건을 설정한 뒤 분할을 수행하고, 우측에서 결과를 확인한 후 최종 적재하세요.
          </p>
        </div>

        {/* 🎯 좌우 분할 레이아웃 */}
        <div style={styles.splitWrapper}>
          
          {/* [좌측 패널]: 입력, 설정 및 분할 수행 버튼 */}
          <div style={styles.leftPanel}>
            <div style={styles.rowGroup}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={styles.label}>문서 제목 (Filename)</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  style={styles.textInput}
                  placeholder="예: manual_note"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={styles.label}>공통 헤더 Prefix (선택)</label>
                <input
                  type="text"
                  value={globalPrefix}
                  onChange={(e) => setGlobalPrefix(e.target.value)}
                  style={styles.textInput}
                  placeholder="예: 의약품_정보"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.label}>✂️ 멀티 구분자 설정 (Delimiters)</label>
              <input
                type="text"
                value={delimitersInput}
                onChange={(e) => setDelimitersInput(e.target.value)}
                style={{ ...styles.textInput, fontFamily: 'monospace' }}
                placeholder="예: \n\n, \n, "
              />
              <span style={styles.subText}>
                콤마(<code>,</code>)로 구분하여 랭체인 우선순위 순서대로 입력
              </span>
            </div>

            <div style={styles.rowGroup}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={styles.label}>청크 최대 사이즈</label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(e.target.value)}
                  style={styles.textInput}
                  placeholder="500"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={styles.label}>여분 (Chunk Overlap)</label>
                <input
                  type="number"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(e.target.value)}
                  style={styles.textInput}
                  placeholder="50"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minHeight: '160px' }}>
              <label style={styles.label}>저장할 내용 (붙여넣기 영역)</label>
              <textarea
                ref={textRef}
                style={styles.textarea}
                placeholder="수만 줄의 텍스트를 여기에 복사·붙여넣기 하세요..."
              />
            </div>

            {/* ✂️ 1단계: 랭체인 분할 미리보기 수행 버튼 */}
            <button
              type="button"
              disabled={isSplitting}
              style={{
                ...styles.actionButton,
                backgroundColor: isSplitting ? '#94a3b8' : '#475569',
                cursor: isSplitting ? 'not-allowed' : 'pointer'
              }}
              onClick={handleRunSplit}
            >
              {isSplitting ? '⏳ 랭체인 분할 수행 중...' : '✂️ 랭체인 청크 분할 미리보기 수행'}
            </button>
          </div>

          {/* [우측 패널]: 결과 확인 및 최종 적재 버튼 */}
          <div style={styles.rightPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <label style={{ ...styles.label, margin: 0 }}>🔍 랭체인 분할 결과 미리보기</label>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>
                총 {previewChunks.length}개 청크 대기 중
              </span>
            </div>

            <div style={styles.previewList}>
              {previewChunks.length > 0 ? (
                previewChunks.map((chunk, idx) => (
                  <div key={idx} style={styles.chunkCard}>
                    <div style={{ color: '#2563eb', fontWeight: 'bold', marginBottom: '4px' }}>
                      [청크 #{chunk.chunk_index}] {globalPrefix ? `(Prefix: ${globalPrefix})` : ''} (길이: {chunk.clean_text?.length || 0}자)
                    </div>
                    <div style={{ color: '#475569', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chunk.clean_text}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '60px 20px' }}>
                  좌측에서 텍스트를 입력하고<br/>
                  <b>[✂️ 랭체인 청크 분할 미리보기 수행]</b> 버튼을 누르면<br/>
                  분할된 청크 결과가 여기에 표시됩니다.
                </div>
              )}
            </div>

            {/* 💾 2단계: 최종 지식 DB 적재 버튼 */}
            <button
              type="button"
              disabled={isSaving || previewChunks.length === 0}
              style={{
                ...styles.submitButton,
                backgroundColor: (isSaving || previewChunks.length === 0) ? '#cbd5e1' : '#2563eb',
                cursor: (isSaving || previewChunks.length === 0) ? 'not-allowed' : 'pointer'
              }}
              onClick={handleImmediateSave}
            >
              {isSaving ? '🐾 지식 DB 적재 전송 중...' : `💾 최종 지식 DB 적재하기 (총 ${previewChunks.length}개 청크)`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default TextInputChunkingPage;