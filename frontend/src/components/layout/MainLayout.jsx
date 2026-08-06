import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const layoutStyles = {
  // 1. 전체 화면 컨테이너 (100vh 고정)
  appContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box'
  },
  // 2. 상단 헤더 영역
  headerArea: {
    height: '60px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    zIndex: 10
  },
  // 3. 메인 바디 영역 (사이드바 + 메인 콘텐츠)
  bodyArea: {
    flex: 1,
    display: 'flex',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0 // 👈 [추가]: Flex 자식 높이 오버플로우 방지 핵심
  },
  // 4. 메인 콘텐츠 출력 영역
  contentArea: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    minHeight: 0 // 👈 [추가]: Flex 자식 높이 오버플로우 방지 핵심
  }
};

function MainLayout({ children, currentMenu, setCurrentMenu, activeTab, setActiveTab }) {
  // currentMenu 또는 activeTab 상태 호환 처리
  const activeMenuKey = currentMenu || activeTab;
  const setMenuHandler = setCurrentMenu || setActiveTab;

  return (
    <div style={layoutStyles.appContainer}>
      {/* 상단 헤더 */}
      <div style={layoutStyles.headerArea}>
        <Header />
      </div>

      {/* 사이드바 & 메인 스플릿 */}
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