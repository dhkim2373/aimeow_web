import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '../components/ui/UploadBox';
import LoadingView from '../components/ui/LoadingView';
import PdfViewer from '../components/chunking/PdfViewer';
import ChunkEditor from '../components/chunking/ChunkEditor';
import { uploadPdfApi, saveChunksApi, splitMarkdownApi } from '../api/chunkingApi';

// 🐾 텍스트 청킹 화면 전용 동영상 import
import catCuttingVideo from '../assets/cat_cutting.mp4';

// 🎯 [스마트 텍스트 청킹 전용 파이프라인 단계 정의]
const textGuideSteps = [
  { num: '01', title: '📄 규정 문서 업로드', desc: 'PDF 문서 선택 및 파일 처리' },
  { num: '02', title: '✂️ 세부 라인 파싱', desc: '문장/줄 단위 자동 구조화' },
  { num: '03', title: '✏️ 정제 및 헤더 지정', desc: '불필요한 라인 삭제 및 H1~H3 구조화' },
  { num: '04', title: '💾 AI 자동 분할 & 적재', desc: '랭체인 기반 분할 확인 후 DB 적재' }
];

const styles = {
  fullContainer: {
    width: '100%',
    height: '100%', 
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    flex: 1
  },
  mainCard: { 
    backgroundColor: '#ffffff', 
    padding: '16px 20px', 
    boxSizing: 'border-box',
    border: 'none', 
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  compactHeaderSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '8px 16px',
    marginBottom: '12px',
    flexShrink: 0,
    gap: '16px'
  },
  headerLeftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0
  },
  pageTitle: { 
    margin: 0, 
    fontSize: '18px', 
    color: '#0f172a', 
    fontWeight: '900', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    whiteSpace: 'nowrap'
  },
  verticalDivider: {
    width: '1px',
    height: '18px',
    backgroundColor: '#cbd5e1',
    flexShrink: 0
  },
  globalPrefixLabel: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap'
  },
  globalPrefixInput: {
    flex: 1,
    maxWidth: '360px',
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    outline: 'none'
  },
  headerRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none'
  },
  splitWrapper: {
    display: 'flex',
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0
  },
  resizerBar: {
    width: '12px',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    userSelect: 'none',
    flexShrink: 0
  },
  resizerLine: { 
    width: '4px', 
    height: '40px', 
    backgroundColor: '#cbd5e1', 
    borderRadius: '2px' 
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#ffffff',
    width: '850px',
    maxHeight: '85vh',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  }
};

function ChunkingPage() {
  const [step, setStep] = useState('upload'); // 'upload' | 'loading' | 'editor'
  const [lines, setLines] = useState([]);
  const [linesHistory, setLinesHistory] = useState([]);
  
  const [globalPrefix, setGlobalPrefix] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [activePage, setActivePage] = useState(1); 

  const [leftWidth, setLeftWidth] = useState(50); 
  const [isResizing, setIsResizing] = useState(false);
  const wrapperRef = useRef(null);

  // 🪄 AI 자동 청킹 미리보기 팝업 모달 상태
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewChunks, setPreviewChunks] = useState([]);

  // Ctrl + Z 실행 취소
  const saveToHistory = (currentLines) => {
    setLinesHistory(prev => [...prev, JSON.parse(JSON.stringify(currentLines))]);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (step !== 'editor') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (linesHistory.length > 0) {
          e.preventDefault();
          const previousState = linesHistory[linesHistory.length - 1];
          setLines(previousState);
          setLinesHistory(prev => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [linesHistory, step]);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !wrapperRef.current) return;
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const relativeX = e.clientX - wrapperRect.left;
      let newWidth = (relativeX / wrapperRect.width) * 100;
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleFileUpload = async (file) => {
    setStep('loading');
    setPdfFile(file); 
    setGlobalPrefix(file.name.replace(/\.[^/.]+$/, ""));

    try {
      const data = await uploadPdfApi(file);
      setLines(data);
      setLinesHistory([]);
      setStep('editor');
      if (data.length > 0 && data[0].page_number) {
        setActivePage(data[0].page_number);
      }
    } catch (err) {
      alert(err.message || "서버 파싱 중 오류가 발생했습니다.");
      setStep('upload');
    }
  };

  // 🎯 단일 지정 및 Ctrl + 클릭 시 동일 등급 패턴 전체 일괄 변환 핸들러
  const handleSetLineMarkdownLevel = (lineIndex, targetLevel, isBatch = false) => {
    saveToHistory(lines);

    let targetPattern = null;
    if (isBatch) {
      const baseLine = lines.find(l => l.line_index === lineIndex);
      if (baseLine && baseLine.text) {
        const clean = baseLine.text.replace(/^#+\s*/, '').replace(/^-\s*/, '').replace(/\*\*/g, '').trim();
        if (/^\d+\.\d+\.\d+\s+/.test(clean)) targetPattern = 'H3';
        else if (/^\d+\.\d+\s+/.test(clean)) targetPattern = 'H2';
        else if (/^\d+\s+[가-힣A-Za-z]/.test(clean)) targetPattern = 'H1';
      }
    }

    setLines(prevLines => 
      prevLines.map(line => {
        let text = line.text ? line.text.trim() : "";
        const cleanText = text.replace(/^#+\s*/, '').replace(/^-\s*/, '').replace(/\*\*/g, '').trim();

        const isTarget = (line.line_index === lineIndex) || (isBatch && targetPattern && (
          (targetPattern === 'H3' && /^\d+\.\d+\.\d+\s+/.test(cleanText)) ||
          (targetPattern === 'H2' && /^\d+\.\d+\s+/.test(cleanText) && !/^\d+\.\d+\.\d+/.test(cleanText)) ||
          (targetPattern === 'H1' && /^\d+\s+[가-힣A-Za-z]/.test(cleanText) && !/^\d+\.\d+/.test(cleanText))
        ));

        if (isTarget) {
          if (targetLevel === 0) {
            return { ...line, text: cleanText };
          }
          let prefix = '# ';
          if (targetLevel === 2) prefix = '## ';
          if (targetLevel === 3) prefix = '### ';

          return { ...line, text: `${prefix}${cleanText}` };
        }
        return line;
      })
    );
  };

  // 🪄 [정제 완료]: 랭체인 MD 스플리터로 분할 요청 후 미리보기 팝업 오픈
  const handleAutoMarkdownSplit = async () => {
    if (!lines || lines.length === 0) {
      alert("분할할 텍스트 라인이 존재하지 않습니다.");
      return;
    }

    try {
      const response = await splitMarkdownApi({ lines });
      const chunks = response.chunks || [];

      if (chunks.length === 0) {
        alert("분할된 청크 결과가 없습니다.");
        return;
      }

      setPreviewChunks(chunks);
      setPreviewModalOpen(true);
    } catch (err) {
      alert(err.message || "자동 마크다운 분할 중 오류가 발생했습니다.");
    }
  };

  // 💾 [최종 확인 후 적재]: 기존 save-chunks 포맷(page_no, text)에 맞춰 웹훅 전송
  const handleConfirmAndSave = async () => {
    try {
      const formattedPayloadChunks = previewChunks.map(chunk => ({
        page_no: String(chunk.page_number || chunk.page_no || "1"),
        text: chunk.raw_content || chunk.clean_text || ""
      }));

      const data = await saveChunksApi(globalPrefix.trim(), formattedPayloadChunks);
      alert(data.message || "저장되었습니다.");
      setPreviewModalOpen(false);
      setStep('upload');
      setPdfFile(null);
      setActivePage(1);
      setGlobalPrefix('');
      setLinesHistory([]);
    } catch (err) {
      alert(err.message || "저장 중 오류가 발생했습니다.");
    }
  };

  const handleReset = () => {
    const confirmReset = window.confirm(
      "⚠️ 현재 작업 중인 정제 데이터가 모두 사라집니다.\n정말로 초기화하고 처음(파일 업로드)으로 돌아가시겠습니까?"
    );
    if (confirmReset) {
      setStep('upload');
      setLines([]);
      setLinesHistory([]);
      setGlobalPrefix('');
      setPdfFile(null);
      setNumPages(null);
      setActivePage(1);
    }
  };

  const deleteLine = (lineIndexToDelete) => {
    saveToHistory(lines);
    setLines(prevLines => prevLines.filter(line => line.line_index !== lineIndexToDelete));
  };

  const deletePageLines = (targetPageNum) => {
    saveToHistory(lines);
    setLines(prevLines => 
      prevLines.filter(line => (line.page_number || 1) !== targetPageNum)
    );
  };

  const deleteTopNLinesPerPage = (topCount) => {
    if (!topCount || topCount <= 0) return;
    saveToHistory(lines);

    setLines(prevLines => {
      const pageMap = new Map();
      prevLines.forEach(line => {
        const pageNum = line.page_number || 1;
        if (!pageMap.has(pageNum)) pageMap.set(pageNum, []);
        pageMap.get(pageNum).push(line);
      });

      const filteredLines = [];
      pageMap.forEach((pageLines) => {
        filteredLines.push(...pageLines.slice(topCount));
      });
      return filteredLines;
    });
  };

  const deleteBottomNLinesPerPage = (bottomCount) => {
    if (!bottomCount || bottomCount <= 0) return;
    saveToHistory(lines);

    setLines(prevLines => {
      const pageMap = new Map();
      prevLines.forEach(line => {
        const pageNum = line.page_number || 1;
        if (!pageMap.has(pageNum)) pageMap.set(pageNum, []);
        pageMap.get(pageNum).push(line);
      });

      const filteredLines = [];
      pageMap.forEach((pageLines) => {
        const remainingCount = Math.max(0, pageLines.length - bottomCount);
        filteredLines.push(...pageLines.slice(0, remainingCount));
      });
      return filteredLines;
    });
  };

  const handleTextChange = (lineIndex, newText) => {
    setLines(prevLines => 
      prevLines.map(line => 
        line.line_index === lineIndex ? { ...line, text: newText } : line
      )
    );
  };

  return (
    <div style={styles.fullContainer}>
      <div style={styles.mainCard}>
        {/* Step 1: 업로드 */}
        {step === 'upload' && (
          <UploadBox 
            onFileUpload={handleFileUpload} 
            videoSrc={catCuttingVideo}
            showGuide={true}
            guideTitle="스마트 텍스트 청킹 작업 프로세스"
            guideBadge="Text-to-RAG Pipeline"
            guideSteps={textGuideSteps}
          />
        )}

        {/* Step 2: 로딩 */}
        {step === 'loading' && (
          <LoadingView />
        )}

        {/* Step 3: 청킹 에디터 */}
        {step === 'editor' && (
          <>
            <div style={styles.compactHeaderSection}>
              <div style={styles.headerLeftGroup}>
                <h2 style={styles.pageTitle}>
                  <span style={{ fontSize: '22px' }}>🐾</span> 
                  <span style={{ color: '#2563eb', fontWeight: '900' }}>AI Meow</span> 
                  <span style={{ color: '#0f172a' }}>SOP 청킹 파이프라인</span>
                </h2>

                <div style={styles.verticalDivider} />

                <span style={styles.globalPrefixLabel}>
                  📌 공통 헤더:
                </span>
                <input 
                  type="text" 
                  placeholder="예: [SOP-IT-004] 정보보안 관리 규정 v1.0"
                  value={globalPrefix}
                  onChange={(e) => setGlobalPrefix(e.target.value)}
                  style={styles.globalPrefixInput}
                />
              </div>

              <div style={styles.headerRightGroup}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                  * 💡 **Ctrl + Z** 원복 가능!
                </span>
                <button style={styles.resetBtn} onClick={handleReset} title="작업 취소 및 초기화">
                  🔄 작업 초기화
                </button>
              </div>
            </div>

            <div style={styles.splitWrapper} ref={wrapperRef}>
              <PdfViewer 
                pdfFile={pdfFile}
                leftWidth={leftWidth}
                activePage={activePage}
                setActivePage={setActivePage}
                numPages={numPages}
                setNumPages={setNumPages}
              />

              <div 
                style={{ ...styles.resizerBar, backgroundColor: isResizing ? '#e2e8f0' : 'transparent' }} 
                onMouseDown={startResize}
              >
                <div style={styles.resizerLine} />
              </div>

              <ChunkEditor 
                leftWidth={leftWidth}
                lines={lines}
                activePage={activePage}
                setActivePage={setActivePage}
                handleTextChange={handleTextChange}
                deleteLine={deleteLine}
                deletePageLines={deletePageLines}
                chunkByPage={handleAutoMarkdownSplit}
                deleteTopNLinesPerPage={deleteTopNLinesPerPage}
                deleteBottomNLinesPerPage={deleteBottomNLinesPerPage}
                handleSave={handleAutoMarkdownSplit} // 정제 완료 버튼 연동
                onSetLineMarkdownLevel={handleSetLineMarkdownLevel} 
              />
            </div>
          </>
        )}

        {/* 🪄 랭체인 분할 결과 미리보기 팝업 모달 */}
        {previewModalOpen && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  ✨ AI 자동 청킹(MD Split) 미리보기 결과 (총 {previewChunks.length}개 청크)
                </h3>
                <button 
                  onClick={() => setPreviewModalOpen(false)}
                  style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                {previewChunks.map((chunk) => (
                  <div key={chunk.chunk_index} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', marginBottom: '4px' }}>
                      [Chunk #{chunk.chunk_index}] (구성 라인 수: {chunk.line_count}줄)
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: '#334155' }}>
                      {chunk.clean_text}
                    </pre>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  onClick={() => setPreviewModalOpen(false)}
                  style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  취소 및 돌아가기
                </button>
                <button 
                  onClick={handleConfirmAndSave}
                  style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  💾 최종 확인 및 지식 DB 적재하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChunkingPage;