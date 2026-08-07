import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const layoutStyles = {
  appContainer: {
    width: '100%',
    height: '100%', // #root의 100dvh를 100% 상속받아 화면 꽉 채움
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box'
  },
  headerArea: {
    height: '60px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    zIndex: 10
  },
  bodyArea: {
    flex: 1, // 헤더(60px) 제외 나머지 세로 화면 전체 차지
    display: 'flex',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0,
    minWidth: 0
  },
  contentArea: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    minHeight: 0,
    minWidth: 0
  }
};

function MainLayout({ children, currentMenu, setCurrentMenu, activeTab, setActiveTab }) {
  const activeMenuKey = currentMenu || activeTab;
  const setMenuHandler = setCurrentMenu || setActiveTab;

  return (
    <div style={layoutStyles.appContainer}>
      <div style={layoutStyles.headerArea}>
        <Header />
      </div>

      <div style={layoutStyles.bodyArea}>
        <Sidebar 
          currentMenu={activeMenuKey} 
          setCurrentMenu={setMenuHandler}
          activeTab={activeMenuKey}
          setActiveTab={setMenuHandler}
        />
        <main style={layoutStyles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;