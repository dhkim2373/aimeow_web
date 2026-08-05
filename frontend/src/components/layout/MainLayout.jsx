import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const styles = {
  appWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  bodyWrapper: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  contentArea: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    position: 'relative'
  }
};

function MainLayout({ children, currentMenu, setCurrentMenu }) {
  return (
    <div style={styles.appWrapper}>
      {/* 상단 글로벌 헤더 */}
      <Header setCurrentMenu={setCurrentMenu} />
      
      {/* 하단 바디 (사이드바 + 콘텐츠 영역) */}
      <div style={styles.bodyWrapper}>
        <Sidebar currentMenu={currentMenu} setCurrentMenu={setCurrentMenu} />
        <main style={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;