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
  rightArea: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px' 
  },
  engineBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '700',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#22c55e',
    borderRadius: '50%'
  }
};

function Header() {
  return (
    <header style={styles.topHeader}>
      {/* 🐾 원본 고글 고양이 로고 이미지 & 서비스명 */}
      <div style={styles.logoArea}>
        <img 
          src={aiMeowLogo} 
          alt="AI Meow Logo" 
          style={styles.brandLogoImg} 
        />
        <span style={styles.brandGradient}>AI Meow</span>
        <span style={{ color: '#0f172a', fontWeight: '800' }}>RAG 센터</span>
      </div>

      {/* 🐾 우측 엔진 상태 및 버전 뱃지 */}
      <div style={styles.rightArea}>
        <div style={styles.engineBadge}>
          <span style={styles.statusDot} />
          <span>Engine v1.0.0</span>
        </div>
      </div>
    </header>
  );
}

export default Header;