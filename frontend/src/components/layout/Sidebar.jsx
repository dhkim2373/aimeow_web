import React from 'react';

const styles = {
  sidebarContainer: {
    width: '240px',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
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
  })
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
          <span style={{ letterSpacing: '-0.3px' }}>스마트 청킹 매니저</span>
        </button>

        {/* 2. 🖼️ 이미지 청킹 매니저 (버그 조건문 수정 완료) */}
        <button
          type="button"
          style={styles.menuItem(activeMenu === 'img_chunking' || activeMenu === 'image-chunk')}
          onClick={() => handleMenuClick('img_chunking')}
        >
          {(activeMenu === 'img_chunking' || activeMenu === 'image-chunk') && <div style={styles.activeIndicator} />}
          <div style={styles.iconBadge(activeMenu === 'img_chunking' || activeMenu === 'image-chunk')}>
            🖼️
          </div>
          <span style={{ letterSpacing: '-0.3px' }}>이미지 청킹 매니저</span>
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
          <span style={{ letterSpacing: '-0.3px' }}>RAG 연동 설정</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;