import React from 'react';

const styles = {
  sidebarContainer: {
    width: '240px',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // 🐾 상단 메뉴와 하단 고지 영역을 양끝으로 분리
    padding: '20px 14px',
    boxSizing: 'border-box',
    flexShrink: 0
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  menuItem: (active) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: active ? '800' : '600',
    color: active ? '#1d4ed8' : '#64748b',
    backgroundColor: active ? '#eff6ff' : 'transparent',
    border: active ? '1px solid #bfdbfe' : '1px solid transparent',
    boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    textAlign: 'left',
    userSelect: 'none'
  }),
  activeIndicator: {
    position: 'absolute',
    left: '0px',
    top: '20%',
    bottom: '20%',
    width: '4px',
    backgroundColor: '#2563eb',
    borderRadius: '0 4px 4px 0',
    boxShadow: '0 0 8px #3b82f6'
  },
  iconBadge: (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '800',
    backgroundColor: active ? '#2563eb' : '#f1f5f9',
    color: active ? '#ffffff' : '#64748b',
    transition: 'all 0.2s ease'
  }),
  // 🐾 하단 라이선스 및 GitHub 고지 스타일
  footerArea: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  licenseBadge: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '6px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: '600'
  },
  githubLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  }
};

function Sidebar(props) {
  const activeMenu = props.currentMenu || props.activeTab || 'chunking';
  const setMenuHandler = props.setCurrentMenu || props.setActiveTab;

  const handleMenuClick = (menuId) => {
    if (setMenuHandler) {
      setMenuHandler(menuId);
    }
  };

  return (
    <aside style={styles.sidebarContainer}>
      {/* 상단 메인 메뉴 영역 */}
      <div style={styles.menuList}>
        {/* 1. 스마트 청킹 매니저 */}
        <button
          type="button"
          style={styles.menuItem(activeMenu === 'chunking' || activeMenu === 'smart-chunk')}
          onClick={() => handleMenuClick('chunking')}
        >
          {(activeMenu === 'chunking' || activeMenu === 'smart-chunk') && <div style={styles.activeIndicator} />}
          <div style={styles.iconBadge(activeMenu === 'chunking' || activeMenu === 'smart-chunk')}>
            ⚡
          </div>
          <span style={{ letterSpacing: '-0.3px' }}>문서 텍스트 청킹</span>
        </button>

        {/* 2. 이미지 청킹 매니저 */}
        <button
          type="button"
          style={styles.menuItem(activeMenu === 'img_chunking' || activeMenu === 'image-chunk')}
          onClick={() => handleMenuClick('img_chunking')}
        >
          {(activeMenu === 'img_chunking' || activeMenu === 'image-chunk') && <div style={styles.activeIndicator} />}
          <div style={styles.iconBadge(activeMenu === 'img_chunking' || activeMenu === 'image-chunk')}>
            🖼️
          </div>
          <span style={{ letterSpacing: '-0.3px' }}>문서 이미지 청킹</span>
        </button>

        {/* 3. RAG 연동 설정 */}
        <button
          type="button"
          style={styles.menuItem(activeMenu === 'settings' || activeMenu === 'rag-settings')}
          onClick={() => handleMenuClick('settings')}
        >
          {(activeMenu === 'settings' || activeMenu === 'rag-settings') && <div style={styles.activeIndicator} />}
          <div style={styles.iconBadge(activeMenu === 'settings' || activeMenu === 'rag-settings')}>
            ⚙️
          </div>
          <span style={{ letterSpacing: '-0.3px' }}>Target API 설정</span>
        </button>
      </div>

      {/* 🐾 사이드바 최하단: AGPL 3.0 라이선스 & GitHub 링크 고정 영역 */}
      <div style={styles.footerArea}>
        {/* 라이선스 표기 (PyMuPDF4LLM 기반 AGPL-3.0 적용) */}
        <div style={styles.licenseBadge}>
          <span>License</span>
          <span style={{ color: '#0f172a', fontWeight: '800' }}>AGPL-3.0</span>
        </div>

        {/* GitHub 저장소 링크 */}
        <a
          href="https://github.com/dhkim2373/aimeow_web"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.githubLink}
        >
          <svg height="16" width="16" viewBox="0 0 16 16" fill="#334155">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span style={{ letterSpacing: '-0.3px' }}>GitHub Source</span>
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;