import React, { useState } from 'react';

// 💅 고양이 할퀴기 Keyframes 애니메이션
const clawStyles = `
  @keyframes clawSlashAnimation {
    0% { opacity: 0; transform: scale(0.3) rotate(-25deg); }
    20% { opacity: 1; transform: scale(1.15) rotate(-15deg); }
    70% { opacity: 1; transform: scale(1) rotate(-15deg); }
    100% { opacity: 0; transform: scale(1.05) translate(-20px, 10px) rotate(-10deg); }
  }

  @keyframes sparkFlash {
    0% { opacity: 0; transform: scale(0.2); }
    30% { opacity: 0.9; transform: scale(1.3); }
    100% { opacity: 0; transform: scale(1.8); }
  }

  .claw-effect-wrapper {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 240px;
    height: 60px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .claw-slash-svg {
    width: 100%;
    height: 100%;
    animation: clawSlashAnimation 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));
  }

  .spark-effect {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(254,202,202,0.8) 0%, rgba(239,68,68,0) 70%);
    animation: sparkFlash 0.35s ease-out forwards;
  }
`;

// 🎨 간단한 마크다운 인라인 뷰어 헬퍼
const renderFormattedText = (text) => {
  if (!text) return null;

  let formatted = text;
  const isHeader = /^#{1,6}\s/.test(text);
  if (isHeader) {
    formatted = formatted.replace(/^#{1,6}\s/, '');
  }

  const parts = formatted.split(/(\*\*.*?\*\*)/g);

  return (
    <span style={{ fontWeight: isHeader ? '700' : 'normal', color: isHeader ? '#1e40af' : '#0f172a' }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
};

const styles = {
  pageGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderTop: '2px solid #cbd5e1',
    borderBottom: '1px solid #e2e8f0',
    padding: '4px 8px',
    margin: '8px 0 4px 0',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569'
  },
  deletePageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  rowContainer: (isActivePage) => ({
    position: 'relative',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 4px',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    borderBottom: '1px solid #f1f5f9',
    boxSizing: 'border-box',
    borderLeft: isActivePage ? '4px solid #2563eb' : '4px solid transparent',
    backgroundColor: isActivePage ? '#f8fafc' : 'transparent',
    transition: 'all 0.15s ease'
  }),
  textInput: {
    flex: 1,
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#0f172a',
    outline: 'none',
    padding: '3px 6px',
    fontWeight: '500'
  },
  textPreview: {
    flex: 1,
    fontSize: '13px',
    padding: '3px 6px',
    cursor: 'pointer',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    userSelect: 'none'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'inherit',
    userSelect: 'none'
  },
  pageBadgeBtn: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease'
  },
  btnAction: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#94a3b8',
    padding: '2px 4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  splitBoundaryLine: (isSplit) => ({
    position: 'relative',
    height: isSplit ? '8px' : '4px',
    margin: '3px 0',
    backgroundColor: isSplit ? '#ef4444' : '#e2e8f0',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  })
};

function ChunkLineRow({
  line,
  actualIdx,
  isFirstLineOfPage,
  activePage,
  setActivePage,
  handleTextChange,
  insertLineAbove,
  deleteLine,
  deletePageLines,
  toggleSplit
}) {
  const [isScratching, setIsScratching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isActivePage = line.page_number && line.page_number === activePage;

  const handleBoundaryClick = () => {
    setIsScratching(true);
    toggleSplit(actualIdx);
    setTimeout(() => setIsScratching(false), 450);
  };

  const handlePageClick = (e) => {
    e.stopPropagation();
    if (line.page_number && setActivePage) {
      setActivePage(line.page_number);
    }
  };

  const handleDeletePage = (e) => {
    e.stopPropagation();
    if (window.confirm(`페이지 ${line.page_number || 1}의 모든 라인을 삭제하시겠습니까?`)) {
      if (deletePageLines) deletePageLines(line.page_number || 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <style>{clawStyles}</style>

      {/* 페이지 구분 헤더 */}
      {isFirstLineOfPage && (
        <div style={styles.pageGroupHeader}>
          <span>📄 PAGE {line.page_number || 1}</span>
          <button 
            style={styles.deletePageBtn} 
            onClick={handleDeletePage}
            title={`PAGE ${line.page_number || 1}에 속한 모든 라인 삭제`}
          >
            🗑️ PAGE {line.page_number || 1} 전체 삭제
          </button>
        </div>
      )}

      {/* 라인 아이템 바디 */}
      <div 
        style={styles.rowContainer(isActivePage)}
        onClick={() => line.page_number && setActivePage(line.page_number)} // 🎯 단일 클릭 시 PDF 즉시 이동
      >
        <button 
          style={styles.btnAction} 
          title="위에 빈 라인 추가"
          onClick={(e) => { e.stopPropagation(); insertLineAbove(actualIdx, line); }}
        >
          ➕
        </button>

        {/* 🎯 [수정]: 더블 클릭(onDoubleClick)할 때만 편집 입력창으로 전환 */}
        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={line.text || ''}
            onChange={(e) => handleTextChange(line.line_index, e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
            onClick={(e) => e.stopPropagation()} // 입력창 내부 클릭 시 부모 클릭 방지
            style={styles.textInput}
          />
        ) : (
          <div 
            style={styles.textPreview} 
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }} // 👈 더블 클릭으로 변경!
            title="단일 클릭: PDF 이동 / 더블 클릭: 텍스트 수정"
          >
            {renderFormattedText(line.text)}
          </div>
        )}

        <span style={styles.badge}>L:{actualIdx + 1}</span>

        <span 
          style={styles.pageBadgeBtn} 
          onClick={handlePageClick}
          title={`클릭하여 PDF ${line.page_number || 1}페이지로 이동`}
        >
          P:{line.page_number || 1}
        </span>

        <button 
          style={{ ...styles.btnAction, color: '#ef4444' }} 
          title="개별 라인 삭제"
          onClick={(e) => { e.stopPropagation(); deleteLine(line.line_index); }}
        >
          ❌
        </button>
      </div>

      {/* 청크 경계선 */}
      <div 
        style={styles.splitBoundaryLine(line.is_split_point)}
        onClick={handleBoundaryClick}
        title="클릭하여 청크 경계면 설정/해제"
      >
        {isScratching && (
          <div className="claw-effect-wrapper">
            <div className="spark-effect" />
            <svg className="claw-slash-svg" viewBox="0 0 200 60" fill="none">
              <path d="M 10 10 Q 90 25 180 15" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" />
              <path d="M 25 28 Q 105 40 190 32" stroke="#b91c1c" strokeWidth="7" strokeLinecap="round" />
              <path d="M 40 46 Q 120 55 175 50" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
              <path d="M 10 10 Q 90 25 180 15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <path d="M 25 28 Q 105 40 190 32" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {line.is_split_point && (
          <span style={{ 
            fontSize: '10px', 
            color: '#ffffff', 
            backgroundColor: '#ef4444', 
            padding: '1px 8px', 
            borderRadius: '10px',
            fontWeight: '800',
            letterSpacing: '0.5px',
            zIndex: 5
          }}>
            ✂️ CHUNK CUT
          </span>
        )}
      </div>
    </div>
  );
}

export default ChunkLineRow;