import React, { useState, useEffect } from 'react';
// import './App.css'; 👈 index.css를 덮어씌우는 원인이므로 주석 유지/제거
import MainLayout from './components/layout/MainLayout';
import ChunkingPage from './pages/ChunkingPage';
import ImageChunkingPage from './pages/ImageChunkingPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentMenu, setCurrentMenu] = useState('chunking');

  // 🎯 UploadBox 등 하위 컴포넌트에서 'settings' 페이지 전환 요청 이벤트 수신
  useEffect(() => {
    const handleNavigateSettings = () => {
      setCurrentMenu('settings');
    };

    window.addEventListener('navigate-settings', handleNavigateSettings);
    return () => {
      window.removeEventListener('navigate-settings', handleNavigateSettings);
    };
  }, []);

  const renderPage = () => {
    switch (currentMenu) {
      case 'chunking':
      case 'smart-chunk':
        return <ChunkingPage />;
      case 'img_chunking':
      case 'image-chunk':
        return <ImageChunkingPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
      case 'rag-settings':
        return <SettingsPage />;
      default:
        return <ChunkingPage />;
    }
  };

  return (
    <MainLayout currentMenu={currentMenu} setCurrentMenu={setCurrentMenu}>
      {renderPage()}
    </MainLayout>
  );
}

export default App;