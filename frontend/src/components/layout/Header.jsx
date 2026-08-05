import React from 'react';
import aiMeowLogo from '../../assets/aimeow-logo.png';

const styles = {
  topHeader: { 
    height: '70px', 
    width: '100%',
    backgroundColor: '#ffffff', 
    borderBottom: '1px solid #e2e8f0', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '0 28px', 
    boxSizing: 'border-box',
    flexShrink: 0
  },
  logoArea: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    fontWeight: '800', 
    fontSize: '22px', 
    color: '#0f172a',
    letterSpacing: '-0.5px'
  },
  brandLogoImg: {
    height: '52px',
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.15))'
  },
  brandGradient: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '900',
    fontSize: '24px'
  },
  userArea: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#475569' },
  topBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', padding: '6px 10px', borderRadius: '6px', fontWeight: '500' }
};

function Header({ setCurrentMenu }) {
  return (
    <header style={styles.topHeader}>
      <div style={styles.logoArea}>
        <img 
          src={aiMeowLogo} 
          alt="AI Meow Logo" 
          style={styles.brandLogoImg} 
        />
        <span style={styles.brandGradient}>AI Meow</span>
        <span style={{ color: '#0f172a', fontWeight: '800' }}>RAG 센터</span>
      </div>

      <div style={styles.userArea}>
        <span style={{ fontWeight: '600' }}>홍길동 대리 (인사팀)</span>
        <button style={styles.topBtn} onClick={() => setCurrentMenu && setCurrentMenu('settings')}>⚙️ 설정</button>
        <button style={{...styles.topBtn, color: '#ef4444'}} onClick={() => alert("로그아웃 되었습니다.")}>로그아웃</button>
      </div>
    </header>
  );
}

export default Header;