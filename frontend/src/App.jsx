import React, { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import ChunkingPage from './pages/ChunkingPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [currentMenu, setCurrentMenu] = useState('chunking');

  return (
    <MainLayout currentMenu={currentMenu} setCurrentMenu={setCurrentMenu}>
      {currentMenu === 'chunking' && <ChunkingPage />}
      {currentMenu === 'history' && <HistoryPage />}
      {currentMenu === 'settings' && <SettingsPage />}
    </MainLayout>
  );
}

export default App;