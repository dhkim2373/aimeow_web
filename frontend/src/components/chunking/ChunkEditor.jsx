import React, { useRef, useState } from 'react';
import ChunkLineRow from './ChunkLineRow';

const styles = {
  rightPanel: (leftWidth) => ({ 
    height: '100%', 
    width: `calc(${100 - leftWidth}% - 12px)`,
    backgroundColor: '#ffffff', 
    border: '1px solid #e2e8f0', 
    borderRadius: '16px', 
    padding: '20px', 
    overflow: 'hidden',
    display: 'flex', 
    flexDirection: 'column', 
    boxSizing: 'border-box'
  }),
  autoChunkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none'
  },
  utilToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '8px 12px',
    marginTop: '6px',
    marginBottom: '6px',
    flexShrink: 0
  },
  numInput: {
    width: '38px',
    padding: '2px 4px',
    fontSize: '12px',
    textAlign: 'center',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    outline: 'none',
    fontWeight: '600'
  },
  deleteActionBtn: {
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
    outline: 'none'
  },
  scrollList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '6px',
    marginTop: '6px',
    position: 'relative'
  },
  saveBtn: { 
    marginTop: '15px', 
    padding: '14px', 
    backgroundColor: '#3b82f6', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontWeight: '700', 
    fontSize: '15px', 
    flexShrink: 0 
  }
};

function ChunkEditor({ 
  leftWidth, 
  lines, 
  activePage, 
  setActivePage, 
  handleTextChange, 
  insertLineAbove, 
  deleteLine, 
  deletePageLines,
  chunkByPage, // 👈 부모 컴포넌트(ChunkingPage)에서 넘겨받은 handleAutoMarkdownSplit 함수
  deleteTopNLinesPerPage,
  deleteBottomNLinesPerPage,
  toggleSplit, 
  handleSave 
}) {
  const scrollContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const [topCount, setTopCount] = useState(1);
  const [bottomCount, setBottomCount] = useState(1);

  const handleTopDelete = () => {
    const count = Number(topCount);
    if (count <= 0) return;
    if (window.confirm(`모든 페이지의 상단 ${count}줄(헤더)을 일괄 삭제하시겠습니까?`)) {
      if (deleteTopNLinesPerPage) deleteTopNLinesPerPage(count);
    }
  };

  const handleBottomDelete = () => {
    const count = Number(bottomCount);
    if (count <= 0) return;
    if (window.confirm(`모든 페이지의 하단 ${count}줄(풋터)을 일괄 삭제하시겠습니까?`)) {
      if (deleteBottomNLinesPerPage) deleteBottomNLinesPerPage(count);
    }
  };

  const ROW_HEIGHT = 38; 
  const BUFFER_COUNT = 15;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const totalHeight = lines.length * ROW_HEIGHT;
  const containerHeight = 600; 
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_COUNT);
  const endIndex = Math.min(lines.length - 1, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_COUNT);

  const visibleLines = lines.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div style={styles.rightPanel(leftWidth)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', backgroundColor: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>EDIT</span>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>수동 청크 경계면 스크래치</h3>
          
          {/* ✨ 페이지별 청킹 버튼을 제거하고 그 자리에 AI 자동 청킹 버튼 장착 */}
          <button 
            type="button"
            style={styles.autoChunkBtn} 
            onClick={chunkByPage}
            title="LangChain 마크다운 헤더 구조 기반으로 절단선을 자동으로 배치합니다."
          >
            🪄 AI 자동 청킹
          </button>
        </div>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
          ⚡ 슬림 컴팩트 뷰 (총 {lines.length}개 라인)
        </span>
      </div>

      <div style={styles.utilToolbar}>
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
          🧹 헤더/풋터 정리:
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>페이지별 상단</span>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={topCount}
              onChange={(e) => setTopCount(e.target.value)}
              style={styles.numInput}
            />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>줄</span>
            <button 
              type="button"
              style={styles.deleteActionBtn}
              onClick={handleTopDelete}
            >
              상단 삭제
            </button>
          </div>

          <span style={{ color: '#cbd5e1', fontSize: '12px' }}>|</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>페이지별 하단</span>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={bottomCount}
              onChange={(e) => setBottomCount(e.target.value)}
              style={styles.numInput}
            />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>줄</span>
            <button 
              type="button"
              style={styles.deleteActionBtn}
              onClick={handleBottomDelete}
            >
              하단 삭제
            </button>
          </div>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={styles.scrollList}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
          <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
            {visibleLines.map((line, relativeIdx) => {
              const actualIdx = startIndex + relativeIdx;

              const prevLine = actualIdx > 0 ? lines[actualIdx - 1] : null;
              const isFirstLineOfPage = !prevLine || prevLine.page_number !== line.page_number;

              return (
                <ChunkLineRow
                  key={line.line_index || actualIdx}
                  line={line}
                  actualIdx={actualIdx}
                  isFirstLineOfPage={isFirstLineOfPage}
                  isLast={actualIdx === lines.length - 1}
                  activePage={activePage}
                  setActivePage={setActivePage}
                  handleTextChange={handleTextChange}
                  insertLineAbove={insertLineAbove}
                  deleteLine={deleteLine}
                  deletePageLines={deletePageLines}
                  toggleSplit={toggleSplit}
                />
              );
            })}
          </div>
        </div>
      </div>

      <button style={styles.saveBtn} onClick={handleSave}>
        🐾 실타래 정제 완료 및 지식 DB에 적재하기 (전체 {lines.length}개 라인 저장)
      </button>
    </div>
  );
}

export default ChunkEditor;