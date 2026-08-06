import React, { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import ChunkingPage from './pages/ChunkingPage';
import ImageChunkingPage from './pages/ImageChunkingPage'; // 👈 [추가]: 이미지 청킹 페이지 임포트
import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentMenu, setCurrentMenu] = useState('chunking');

  return (
    <MainLayout currentMenu={currentMenu} setCurrentMenu={setCurrentMenu}>
      {/* 1. 스마트 텍스트 청킹 매니저 */}
      {(currentMenu === 'chunking') && <ChunkingPage />}
      
      {/* 2. 🖼️ 이미지 청킹 매니저 (신규 추가) */}
      {currentMenu === 'img_chunking' && <ImageChunkingPage />}
      
      {/* 4. RAG 연동 설정 */}
      {(currentMenu === 'settings') && <SettingsPage />}
    </MainLayout>
  );
}

export default App;