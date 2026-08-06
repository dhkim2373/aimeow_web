import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '../components/ui/UploadBox';
import LoadingView from '../components/ui/LoadingView';
import PdfViewer from '../components/chunking/PdfViewer';
import ChunkEditor from '../components/chunking/ChunkEditor';
import { uploadPdfApi, saveChunksApi } from '../api/chunkingApi';

const styles = {
  fullContainer: {
    width: '100%',
    height: '100%',        // 👈 100vh 사용 금지, 100% 사용
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  mainCard: { 
    backgroundColor: '#ffffff', 
    padding: '16px 20px', 
    boxSizing: 'border-box',
    border: 'none', 
    flex: 1,
    height: '100%',
    minHeight: 0,          // 👈 Flex 자식 높이 오버플로우 방지 핵심
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  // 🎯 [통합 헤더 바]: 타이틀 + 공통 헤더 + 유틸 버튼을 한 줄로 결합
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
    flex: 1
  },
  pageTitle: { 
    margin: 0, 
    fontSize: '18px', 
    color: '#0f172a', 
    fontWeight: '900', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap'
  },
  verticalDivider: {
    width: '1px',
    height: '18px',
    backgroundColor: '#cbd5e1'
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
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  headerRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    whiteSpace: 'nowrap'
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
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  splitWrapper: {
    display: 'flex',
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    position: 'relative'
  },
  resizerBar: {
    width: '12px',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    userSelect: 'none'
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

  // 패널 너비 조절 (Resizing)
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

  // PDF 업로드 핸들러
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

  // 초기화 핸들러
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

  // 라인 편집 조작 모듈
  const toggleSplit = (index) => {
    saveToHistory(lines);
    setLines(prev => prev.map((line, i) => i === index ? { ...line, is_split_point: !line.is_split_point } : line));
  };

  const deleteLine = (lineIndexToDelete) => {
    saveToHistory(lines);
    setLines(prevLines => prevLines.filter(line => line.line_index !== lineIndexToDelete));
  };

  // 특정 페이지의 모든 라인 일괄 삭제
  const deletePageLines = (targetPageNum) => {
    saveToHistory(lines);
    setLines(prevLines => 
      prevLines.filter(line => (line.page_number || 1) !== targetPageNum)
    );
  };

  // 페이지별 청킹 라인 자동 생성 핸들러 (마지막 라인 하단)
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

  // 페이지별 상단 N줄 일괄 삭제 (헤더 제거)
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

  // 페이지별 하단 N줄 일괄 삭제 (풋터 제거)
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
        {/* Step 1: 업로드 */}
        {step === 'upload' && (
          <UploadBox onFileUpload={handleFileUpload} />
        )}

        {/* Step 2: 로딩 */}
        {step === 'loading' && (
          <LoadingView />
        )}

        {/* Step 3: 스마트 청킹 스크래치 편집기 */}
        {step === 'editor' && (
          <>
            {/* 🎯 [통합 헤더 바]: 화면 타이틀 + 공통 헤더 + 우측 유틸 한 줄로 배치 */}
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
              {/* 왼쪽: PDF 프리뷰 */}
              <PdfViewer 
                pdfFile={pdfFile}
                leftWidth={leftWidth}
                activePage={activePage}
                setActivePage={setActivePage}
                numPages={numPages}
                setNumPages={setNumPages}
              />

              {/* 리사이저 바 */}
              <div 
                style={{ ...styles.resizerBar, backgroundColor: isResizing ? '#e2e8f0' : 'transparent' }} 
                onMouseDown={startResize}
              >
                <div style={styles.resizerLine} />
              </div>

              {/* 오른쪽: 라인 정제 편집기 */}
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