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
  scrollList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '6px',
    marginTop: '10px',
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
  deletePageLines, // 👈 [추가] 페이지 일괄 삭제 프롭스
  toggleSplit, 
  handleSave 
}) {
  const scrollContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 기본 라인 높이 (페이지 헤더가 들어가면 고정 가상 스크롤 계산 시 동적 처리를 위해 고정값 유지)
  const ROW_HEIGHT = 38; 
  const BUFFER_COUNT = 15;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  // 🎯 가상 스크롤 인덱스 및 위치 계산
  const totalHeight = lines.length * ROW_HEIGHT;
  const containerHeight = 600; 
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_COUNT);
  const endIndex = Math.min(lines.length - 1, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_COUNT);

  const visibleLines = lines.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div style={styles.rightPanel(leftWidth)}>
      {/* 편집기 상단 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', backgroundColor: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>EDIT</span>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>수동 청크 경계면 스크래치</h3>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
          ⚡ 슬림 컴팩트 뷰 (총 {lines.length}개 라인)
        </span>
      </div>
      
      {/* 가상 스크롤 리스트 영역 */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={styles.scrollList}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
          <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
            {visibleLines.map((line, relativeIdx) => {
              const actualIdx = startIndex + relativeIdx;

              // 📄 [페이지 변경 감지]: 전체 lines 배열을 기준으로 이전 라인과 페이지 번호가 다른지 판단
              const prevLine = actualIdx > 0 ? lines[actualIdx - 1] : null;
              const isFirstLineOfPage = !prevLine || prevLine.page_number !== line.page_number;

              return (
                <ChunkLineRow
                  key={line.line_index || actualIdx}
                  line={line}
                  actualIdx={actualIdx}
                  isFirstLineOfPage={isFirstLineOfPage} // 👈 [추가] 페이지 전체 삭제 헤더 노출 여부
                  isLast={actualIdx === lines.length - 1}
                  activePage={activePage}
                  setActivePage={setActivePage}
                  handleTextChange={handleTextChange}
                  insertLineAbove={insertLineAbove}
                  deleteLine={deleteLine}
                  deletePageLines={deletePageLines}     // 👈 [추가] 페이지 삭제 핸들러 전달
                  toggleSplit={toggleSplit}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* DB 적재 저장 버튼 */}
      <button style={styles.saveBtn} onClick={handleSave}>
        🐾 실타래 정제 완료 및 지식 DB에 적재하기 (전체 {lines.length}개 라인 저장)
      </button>
    </div>
  );
}

export default ChunkEditor;