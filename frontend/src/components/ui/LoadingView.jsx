import React, { useEffect } from 'react';
import aiMeowLogo from '../../assets/aimeow-logo.png';

// 🎯 [사이버 고양이 애니메이션 키프레임 자동 주입]
if (typeof document !== 'undefined' && !document.getElementById('cat-anim-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'cat-anim-styles';
  styleSheet.innerText = `
    @keyframes cyberPulse {
      0% { transform: scale(0.85); opacity: 0.3; box-shadow: 0 0 0px rgba(37, 99, 235, 0.2); }
      50% { transform: scale(1.15); opacity: 0.8; box-shadow: 0 0 25px rgba(59, 130, 246, 0.6); }
      100% { transform: scale(0.85); opacity: 0.3; box-shadow: 0 0 0px rgba(37, 99, 235, 0.2); }
    }
    @keyframes scanRotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes catHover {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-10px) scale(1.03); }
    }
    @keyframes textGlow {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8)); }
    }
  `;
  document.head.appendChild(styleSheet);
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '60px 0'
  },
  animCore: {
    position: 'relative',
    width: '180px',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '30px'
  },
  scanRing: {
    position: 'absolute',
    width: '170px',
    height: '170px',
    borderRadius: '50%',
    border: '2px dashed #60a5fa',
    animation: 'scanRotate 8s linear infinite',
    opacity: 0.6
  },
  pulseRing: {
    position: 'absolute',
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    backgroundColor: 'rgba(219, 234, 254, 0.5)',
    border: '1px solid #93c5fd',
    animation: 'cyberPulse 2s infinite ease-in-out'
  },
  catLogo: {
    width: '140px',
    height: 'auto',
    objectFit: 'contain',
    zIndex: 2,
    animation: 'catHover 2.5s infinite ease-in-out',
    filter: 'drop-shadow(0 10px 18px rgba(37, 99, 235, 0.35))'
  },
  title: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: '22px',
    margin: '0 0 12px 0',
    letterSpacing: '-0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  badge: {
    color: '#2563eb',
    fontSize: '13.5px',
    fontWeight: '700',
    margin: 0,
    backgroundColor: '#eff6ff',
    padding: '8px 20px',
    borderRadius: '20px',
    border: '1px solid #bfdbfe',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
    animation: 'textGlow 2s infinite ease-in-out'
  }
};

function LoadingView() {
  return (
    <div style={styles.container}>
      <div style={styles.animCore}>
        <div style={styles.scanRing} />
        <div style={styles.pulseRing} />
        <img 
          src={aiMeowLogo} 
          alt="AI Meow Scanning..." 
          style={styles.catLogo}
        />
      </div>

      <h3 style={styles.title}>
        <span style={{ color: '#2563eb' }}>AI Meow</span>가 문서를 분석 중입니다...
      </h3>
      
      <p style={styles.badge}>
        ⚡ 초고속 실타래 파싱 및 청크 경계면을 빌드하고 있다냥!
      </p>
    </div>
  );
}

export default LoadingView;