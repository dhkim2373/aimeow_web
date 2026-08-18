import React, { useState, useRef, useEffect } from 'react';

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
    minHeight: '220px', // 🚀 세로 공간 대폭 확장
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
  selectInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    fontWeight: '600',
    color: '#1e293b'
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
  submitButton: {
    marginTop: '12px',
    padding: '12px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    flexShrink: 0
  }
};

function TextInputChunkingPage() {
  const [docTitle, setDocTitle] = useState('직접_입력_문서');
  const [globalPrefix, setGlobalPrefix] = useState('');
  const [chunkMode, setChunkMode] = useState('and'); 
  const [delimiter, setDelimiter] = useState('\\n\\n\\n'); 
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);

  const [isProcessing, setIsProcessing] = useState(false);
  const [previewChunks, setPreviewChunks] = useState([]);

  const textRef = useRef(null);

  const parseDelimiter = (rawDelim) => {
    return rawDelim.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  };

  const processChunkingLogic = (rawText) => {
    if (!rawText.trim()) return [];

    const actualDelimiter = parseDelimiter(delimiter);
    const size = parseInt(chunkSize, 10) || 500;
    const overlap = parseInt(chunkOverlap, 10) || 0;

    if (chunkMode === 'delimiter_only') {
      const rawChunks = actualDelimiter ? rawText.split(actualDelimiter) : [rawText];
      return rawChunks.map(c => c.trim()).filter(c => c.length > 0);
    }

    if (chunkMode === 'size_only') {
      const refinedChunks = [];
      let start = 0;
      while (start < rawText.length) {
        const end = start + size;
        const subChunk = rawText.substring(start, end).trim();
        if (subChunk) refinedChunks.push(subChunk);
        if (size <= overlap) break;
        start += (size - overlap);
      }
      return refinedChunks;
    }

    const rawChunks = actualDelimiter ? rawText.split(actualDelimiter) : [rawText];
    const finalChunks = [];

    rawChunks.forEach(chunk => {
      const trimmedChunk = chunk.trim();
      if (!trimmedChunk) return;

      if (trimmedChunk.length <= size) {
        finalChunks.push(trimmedChunk);
      } else {
        let start = 0;
        while (start < trimmedChunk.length) {
          const end = start + size;
          const subChunk = trimmedChunk.substring(start, end).trim();
          if (subChunk) finalChunks.push(subChunk);
          if (size <= overlap) break;
          start += (size - overlap);
        }
      }
    });

    return finalChunks;
  };

  const handleTextChange = () => {
    const rawText = textRef.current?.value || '';
    if (!rawText.trim()) {
      setPreviewChunks([]);
      return;
    }
    const formatted = processChunkingLogic(rawText);
    setPreviewChunks(formatted);
  };

  useEffect(() => {
    handleTextChange();
  }, [chunkMode, delimiter, chunkSize, chunkOverlap]);

  const handleImmediateSave = async () => {
    const rawText = textRef.current?.value;
    if (!rawText || !rawText.trim()) {
      alert('저장할 내용을 입력해 주세요!');
      return;
    }

    setIsProcessing(true);

    try {
      const formatted = processChunkingLogic(rawText);
      const formattedChunks = formatted.map((chunk) => ({
        page_no: "1",
        page_number: 1,
        text: chunk,
        is_deleted: false,
        is_split_point: true
      }));

      if (formattedChunks.length === 0) {
        alert('분할된 유효한 청크가 없습니다.');
        setIsProcessing(false);
        return;
      }

      if (!window.confirm(`총 ${formattedChunks.length}개의 청크로 분할되어 적재됩니다. 진행하시겠습니까?`)) {
        setIsProcessing(false);
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

      const response = await fetch(`${API_BASE_URL}/api/save-chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || '지식 DB 저장 중 서버 오류가 발생했습니다.');
      }

      const result = await response.json();
      alert(result.message || `🎉 총 ${formattedChunks.length}개의 청크가 지식 DB에 성공적으로 저장되었습니다!`);
      
      if (textRef.current) {
        textRef.current.value = '';
        setPreviewChunks([]);
      }
    } catch (error) {
      console.error(error);
      alert('저장 실패: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerSection}>
          <h2 style={styles.pageTitle}>✍️ 텍스트 직접 입력 및 실시간 청크 분할 매니저</h2>
          <p style={styles.pageDesc}>
            좌측에 텍스트를 입력하고, 구분자 및 사이즈 조건을 조합하여 우측 실시간 미리보기에서 확인 후 적재하세요.
          </p>
        </div>

        {/* 🎯 좌우 분할 레이아웃 */}
        <div style={styles.splitWrapper}>
          
          {/* [좌측 패널]: 입력 및 설정 영역 */}
          <div style={styles.leftPanel}>
            
            {/* 🎯 문서 제목과 공통 헤더 Prefix를 한 줄(Row)로 병합 */}
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
                  onChange={(e) => {
                    setGlobalPrefix(e.target.value);
                    handleTextChange();
                  }}
                  style={styles.textInput}
                  placeholder="예: 의약품_정보"
                />
              </div>
            </div>

            {/* 청크 분할 방식 선택 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.label}>⚙️ 청크 분할 방식 (Mode)</label>
              <select
                value={chunkMode}
                onChange={(e) => setChunkMode(e.target.value)}
                style={styles.selectInput}
              >
                <option value="and">🔗 하이브리드 (구분자 1차 + 사이즈/오버랩 2차)</option>
                <option value="delimiter_only">✂️ 구분자만 사용 (Delimiter Only)</option>
                <option value="size_only">📏 사이즈 & 오버랩만 사용 (Size Only)</option>
              </select>
            </div>

            {/* 구분자 입력 */}
            {chunkMode !== 'size_only' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.label}>✂️ 청크 분할 구분자 (Delimiter)</label>
                <input
                  type="text"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  style={{ ...styles.textInput, fontFamily: 'monospace' }}
                  placeholder="예: \n\n\n 또는 -----"
                />
                <span style={styles.subText}>
                  줄바꿈 3번은 <code>\n\n\n</code> 입력
                </span>
              </div>
            )}

            {/* 사이즈 및 오버랩 입력 */}
            {chunkMode !== 'delimiter_only' && (
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
                  <label style={styles.label}>여분 (Overlap)</label>
                  <input
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(e.target.value)}
                    style={styles.textInput}
                    placeholder="50"
                  />
                </div>
              </div>
            )}

            {/* 🚀 세로 공간이 확장된 텍스트 입력 영역 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minHeight: '220px' }}>
              <label style={styles.label}>저장할 내용 (붙여넣기 영역)</label>
              <textarea
                ref={textRef}
                style={styles.textarea}
                onInput={handleTextChange}
                placeholder="수만 줄의 텍스트를 여기에 복사·붙여넣기 하세요..."
              />
            </div>
          </div>

          {/* [우측 패널]: 실시간 분할 미리보기 영역 */}
          <div style={styles.rightPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <label style={{ ...styles.label, margin: 0 }}>🔍 실시간 분할 미리보기</label>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>
                총 {previewChunks.length}개 분할 예정
              </span>
            </div>

            <div style={styles.previewList}>
              {previewChunks.length > 0 ? (
                previewChunks.map((chunk, idx) => (
                  <div key={idx} style={styles.chunkCard}>
                    <div style={{ color: '#2563eb', fontWeight: 'bold', marginBottom: '4px' }}>
                      [청크 #{idx + 1}] {globalPrefix ? `(Prefix: ${globalPrefix})` : ''}
                    </div>
                    <div style={{ color: '#475569', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chunk}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '40px 20px' }}>
                  좌측에 텍스트를 입력하거나 붙여넣으면<br/>분할될 청크 미리보기가 여기에 표시됩니다.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 하단 전체 적재 버튼 */}
        <button
          type="button"
          disabled={isProcessing}
          style={{
            ...styles.submitButton,
            backgroundColor: isProcessing ? '#94a3b8' : '#2563eb',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
          onClick={handleImmediateSave}
        >
          {isProcessing ? '🐾 분할 및 지식 DB 적재 중...' : '💾 즉시 지식 DB 적재하기'}
        </button>
      </div>
    </div>
  );
}

export default TextInputChunkingPage;