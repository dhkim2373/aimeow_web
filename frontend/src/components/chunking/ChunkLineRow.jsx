import React, { useState } from 'react';

const renderFormattedText = (text) => {
  if (!text) return null;

  let formatted = text;
  const isHeader = /^#{1,6}\s/.test(text);
  if (isHeader) {
    formatted = formatted.replace(/^#{1,6}\s/, '');
  }

  const parts = formatted.split(/(\*\*.*?\*\*)/g);

  return (
    <span style={{ 
      fontWeight: isHeader ? '800' : '700',
      color: isHeader ? '#1d4ed8' : '#0f172a'
    }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: '#000000', fontWeight: '800' }}>{part.slice(2, -2)}</strong>;
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
    padding: '4px 4px',
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
    fontWeight: '700'
  },
  textPreview: {
    flex: 1,
    fontSize: '13px',
    padding: '3px 6px',
    cursor: 'pointer',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    userSelect: 'none',
    fontWeight: '700',
    color: '#0f172a'
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
  toggleLevelBtn: (level) => {
    let bg = '#f1f5f9';
    let fg = '#64748b';
    let border = '#cbd5e1';

    if (level === 'H1') { bg = '#eff6ff'; fg = '#2563eb'; border = '#bfdbfe'; }
    else if (level === 'H2') { bg = '#f0fdf4'; fg = '#16a34a'; border = '#bbf7d0'; }
    else if (level === 'H3') { bg = '#fffbeb'; fg = '#d97706'; border = '#fde68a'; }

    return {
      border: `1px solid ${border}`,
      backgroundColor: bg,
      color: fg,
      cursor: 'pointer',
      fontSize: '10px',
      fontWeight: '800',
      width: '24px',
      height: '22px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      flexShrink: 0
    };
  }
};

function ChunkLineRow({
  line,
  actualIdx,
  isFirstLineOfPage,
  activePage,
  setActivePage,
  handleTextChange,
  deleteLine,
  deletePageLines,
  onSetLineMarkdownLevel
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isActivePage = line.page_number && line.page_number === activePage;

  const text = line.text || '';
  let currentLevel = 'C';
  if (text.startsWith('# ')) currentLevel = 'H1';
  else if (text.startsWith('## ')) currentLevel = 'H2';
  else if (text.startsWith('### ')) currentLevel = 'H3';

  const handleToggleLevel = (e) => {
    e.stopPropagation();
    if (!onSetLineMarkdownLevel) return;

    if (e.ctrlKey || e.metaKey) {
      let levelNum = 0;
      if (currentLevel === 'H1') levelNum = 1;
      else if (currentLevel === 'H2') levelNum = 2;
      else if (currentLevel === 'H3') levelNum = 3;

      const levelName = currentLevel === 'C' ? '본문(C)' : `${currentLevel} 헤더`;
      if (window.confirm(`🪄 [Ctrl 감지] 이 라인과 동일한 번호 체계 패턴을 가진 모든 항목을 [${levelName}]로 일괄 적용하시겠습니까?`)) {
        onSetLineMarkdownLevel(line.line_index, levelNum, true);
      }
      return;
    }

    if (currentLevel === 'C') onSetLineMarkdownLevel(line.line_index, 1, false);     
    else if (currentLevel === 'H1') onSetLineMarkdownLevel(line.line_index, 2, false); 
    else if (currentLevel === 'H2') onSetLineMarkdownLevel(line.line_index, 3, false); 
    else onSetLineMarkdownLevel(line.line_index, 0, false);                           
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

      <div 
        style={styles.rowContainer(isActivePage)}
        onClick={() => line.page_number && setActivePage(line.page_number)}
      >
        <button 
          style={styles.toggleLevelBtn(currentLevel)}
          title={`현재: ${currentLevel} \n- 클릭: 개별 라인 순환 변경 (C ➔ H1 ➔ H2 ➔ H3 ➔ C)\n- Ctrl + 클릭: 현재 상태(${currentLevel})를 동일 등급 전체 일괄 반영`}
          onClick={handleToggleLevel}
        >
          {currentLevel}
        </button>

        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={line.text || ''}
            onChange={(e) => handleTextChange(line.line_index, e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            style={styles.textInput}
          />
        ) : (
          <div 
            style={styles.textPreview} 
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
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
    </div>
  );
}

export default ChunkLineRow;