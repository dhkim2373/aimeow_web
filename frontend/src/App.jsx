// src/App.jsx
import React, { useState } from 'react';
// import './App.css'; 👈 [필수 제거]: index.css를 덮어씌우는 원인이므로 이 줄을 삭제/주석 처리하세요!
import MainLayout from './components/layout/MainLayout';
import ChunkingPage from './pages/ChunkingPage';
import ImageChunkingPage from './pages/ImageChunkingPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentMenu, setCurrentMenu] = useState('chunking');

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