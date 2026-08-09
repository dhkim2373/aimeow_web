import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '../components/ui/UploadBox';
import LoadingView from '../components/ui/LoadingView';
import PdfViewer from '../components/chunking/PdfViewer';
import ChunkEditor from '../components/chunking/ChunkEditor';
import { uploadPdfApi, saveChunksApi } from '../api/chunkingApi';

// 🐾 텍스트 청킹 화면 전용 동영상 import
import catCuttingVideo from '../assets/cat_cutting.mp4';

// 🎯 [스마트 텍스트 청킹 전용 파이프라인 단계 정의]
const textGuideSteps = [
  { num: '01', title: '📄 규정 문서 업로드', desc: 'PDF 문서 선택 및 파일 처리' },
  { num: '02', title: '✂️ 세부 라인 파싱', desc: '문장/줄 단위 자동 구조화' },
  { num: '03', title: '✏️ 청크 분할 & 정제', desc: '절단선 지정 및 오탈자/여백 편집' },
  { num: '04', title: '💾 지식 DB 적재', desc: '정제 텍스트 데이터 저장' }
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
    maxWidth: '420px',
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
    gap: '12px',
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

  const toggleSplit = (index) => {
    saveToHistory(lines);
    setLines(prev => prev.map((line, i) => i === index ? { ...line, is_split_point: !line.is_split_point } : line));
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

  const chunkByPage = () => {
    saveToHistory(lines);
    setLines(prevLines => {
      return prevLines.map((line, i) => {
        const currentPage = line.page_number || 1;
        const nextLine = prevLines[i + 1];
        const nextPage = nextLine ? (nextLine.page_number || 1) : null;

        const isLastLineOfPage = nextPage !== null && nextPage !== currentPage;

        return {
          ...line,
          is_split_point: isLastLineOfPage
        };
      });
    });
  };

  const deleteTopNLinesPerPage = (topCount) => {
    if (!topCount || topCount <= 0) return;
    saveToHistory(lines);

    setLines(prevLines => {
      const pageMap = new Map();
      prevLines.forEach(line => {
        const pageNum = line.page_number || 1;
        if (!pageMap.has(pageNum)) {
          pageMap.set(pageNum, []);
        }
        pageMap.get(pageNum).push(line);
      });

      const filteredLines = [];
      pageMap.forEach((pageLines) => {
        const remaining = pageLines.slice(topCount);
        filteredLines.push(...remaining);
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
        if (!pageMap.has(pageNum)) {
          pageMap.set(pageNum, []);
        }
        pageMap.get(pageNum).push(line);
      });

      const filteredLines = [];
      pageMap.forEach((pageLines) => {
        const remainingCount = Math.max(0, pageLines.length - bottomCount);
        const remaining = pageLines.slice(0, remainingCount);
        filteredLines.push(...remaining);
      });

      return filteredLines;
    });
  };

  const insertLineAbove = (index, currentLine) => {
    saveToHistory(lines);
    const newId = Date.now() + Math.random(); 
    const newLineObj = {
      line_index: `custom_${newId}`,
      text: currentLine ? currentLine.text : "", 
      is_split_point: false,
      is_deleted: false,
      page_number: currentLine ? currentLine.page_number : activePage
    };
    
    const newLines = [...lines];
    newLines.splice(index, 0, newLineObj);
    setLines(newLines);
  };

  const handleTextChange = (lineIndex, newText) => {
    setLines(prevLines => 
      prevLines.map(line => 
        line.line_index === lineIndex ? { ...line, text: newText } : line
      )
    );
  };

  const handleSave = async () => {
    try {
      const data = await saveChunksApi(globalPrefix.trim(), lines);
      alert(data.message || "저장되었습니다.");
      setStep('upload');
      setPdfFile(null);
      setActivePage(1);
      setGlobalPrefix('');
      setLinesHistory([]);
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={styles.fullContainer}>
      <div style={styles.mainCard}>
        {/* Step 1: 업로드 (스마트 텍스트 청킹 전용 가이드 및 cat_cutting.mp4 전달) */}
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
                  * 💡 실수했을 땐 **Ctrl + Z**로 원복 가능!
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
                insertLineAbove={insertLineAbove}
                deleteLine={deleteLine}
                deletePageLines={deletePageLines}
                chunkByPage={chunkByPage}
                deleteTopNLinesPerPage={deleteTopNLinesPerPage}
                deleteBottomNLinesPerPage={deleteBottomNLinesPerPage}
                toggleSplit={toggleSplit}
                handleSave={handleSave}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ChunkingPage;