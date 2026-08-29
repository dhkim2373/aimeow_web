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
  deleteLine, 
  deletePageLines,
  chunkByPage, 
  deleteTopNLinesPerPage,
  deleteBottomNLinesPerPage,
  handleSave,
  onSetLineMarkdownLevel 
}) {
  const scrollContainerRef = useRef(null);

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

  return (
    <div style={styles.rightPanel(leftWidth)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', backgroundColor: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>EDIT</span>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>문서 텍스트 정제 및 구조화 에디터</h3>
        </div>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
          ⚡ 일반 스크롤 뷰 (총 {lines.length}개 라인)
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
        style={styles.scrollList}
      >
        {lines.map((line, actualIdx) => {
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
              deleteLine={deleteLine}
              deletePageLines={deletePageLines}
              onSetLineMarkdownLevel={onSetLineMarkdownLevel}
            />
          );
        })}
      </div>

      <button style={styles.saveBtn} onClick={chunkByPage}>
        🪄 AI 자동 청킹 수행 및 결과 확인하기 (전체 {lines.length}개 라인 기준)
      </button>
    </div>
  );
}

export default ChunkEditor;