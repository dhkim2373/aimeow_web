import React, { useState, useRef, useEffect } from 'react';
import { fetchServerConfigApi } from '../../api/chunkingApi';

// 🐾 3방향 고양이 시선 이미지 import (m10, center, p10)
import catM10 from '../../assets/cat_angle_m10.png';
import catCenter from '../../assets/cat_angle.png'; // 정면
import catP10 from '../../assets/cat_angle_p10.png';

// 왼쪽(-10°), 정면(0°), 오른쪽(+10°) 순서대로 3장 정렬
const catFrames = [
  catM10,
  catCenter,
  catP10
];

const styles = {
  dropZone: { 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    border: '2px dashed #cbd5e1', 
    borderRadius: '20px', 
    textAlign: 'center', 
    backgroundColor: '#f8fafc', 
    boxSizing: 'border-box',
    padding: '32px',
    position: 'relative'
  },
  dropZoneActive: { 
    border: '2px dashed #3b82f6', 
    backgroundColor: '#eff6ff' 
  },
  clickableContent: (isDragActive) => ({
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 36px',
    borderRadius: '24px',
    cursor: 'pointer',
    backgroundColor: isDragActive ? 'rgba(255,255,255,0.7)' : 'transparent',
    transition: 'background-color 0.2s ease-in-out',
    userSelect: 'none'
  }),
  logoWrapper: { 
    marginBottom: '16px', 
    display: 'flex', 
    justifyContent: 'center',
    alignItems: 'center',
    width: '210px',
    height: '210px',
    overflow: 'hidden'
  },
  logoImg: (isDragActive) => ({
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: isDragActive 
      ? 'drop-shadow(0 12px 24px rgba(59, 130, 246, 0.45)) scale(1.06)' 
      : 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.12))',
    transition: 'filter 0.2s ease-in-out, transform 0.2s ease-in-out'
  }),
  mainText: { 
    fontWeight: '800', 
    color: '#0f172a', 
    fontSize: '22px', 
    margin: '0 0 10px 0', 
    letterSpacing: '-0.3px' 
  },
  subBadge: { 
    color: '#2563eb', 
    fontSize: '14px', 
    fontWeight: '700', 
    margin: 0, 
    backgroundColor: '#eff6ff', 
    padding: '6px 18px', 
    borderRadius: '20px', 
    border: '1px solid #bfdbfe' 
  },
  alertBannerContainer: {
    width: '100%',
    maxWidth: '960px',
    marginBottom: '20px',
    padding: '14px 20px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
  },
  alertLeftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  alertTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left'
  },
  alertTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#92400e',
    margin: 0
  },
  alertDesc: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#b45309',
    margin: '3px 0 0 0'
  },
  alertBtn: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease'
  },
  guideBannerContainer: {
    width: '100%',
    maxWidth: '960px',
    marginTop: '32px',
    padding: '18px 24px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    boxSizing: 'border-box',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
  }
};

function UploadBox({ 
  onFileUpload, 
  onNavigateSettings,
  showGuide = false, 
  guideTitle = "스마트 청킹 작업 프로세스", 
  guideBadge = "RAG Pipeline", 
  guideSteps = [] 
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [hasTargetUrl, setHasTargetUrl] = useState(true);
  
  // 🐾 현재 표출할 고양이 이미지 Index (기본값 1: 정면 catCenter)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(1);

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const contentRef = useRef(null);

  // 🎯 이미지 프리로딩(Preload) 처리
  useEffect(() => {
    catFrames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // 🐾 화면 전체 마우스 추적 이벤트 바인딩
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!contentRef.current) return;

      const rect = contentRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      // 화면 너비 절반을 기준으로 마우스의 X 위치 비율 계산 (-1.0 ~ 1.0)
      const xRatio = (e.clientX - centerX) / (window.innerWidth / 2);

      // 비율을 0 ~ 1 범위로 변환
      const normalizedX = Math.max(0, Math.min(1, (xRatio + 1) / 2));

      // 0~2 인덱스로 매핑
      const frameIdx = Math.min(
        Math.floor(normalizedX * catFrames.length),
        catFrames.length - 1
      );

      setCurrentFrameIndex(frameIdx);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  // 🎯 Target REST API URL 설정 유무 점검
  useEffect(() => {
    let isMounted = true;
    async function checkTargetUrl() {
      try {
        const config = await fetchServerConfigApi();
        if (isMounted) {
          if (!config?.target_api_url || !config.target_api_url.trim()) {
            setHasTargetUrl(false);
          } else {
            setHasTargetUrl(true);
          }
        }
      } catch (err) {
        console.warn("RAG 설정 로드 실패:", err);
        const localTarget = localStorage.getItem('aimeow_target_api_url') || localStorage.getItem('target_api_url');
        if (isMounted) {
          setHasTargetUrl(Boolean(localTarget && localTarget.trim()));
        }
      }
    }
    checkTargetUrl();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleContentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleGoToSettings = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof onNavigateSettings === 'function') {
      onNavigateSettings();
    }
    
    window.dispatchEvent(new CustomEvent('navigate-settings'));
  };

  return (
    <div 
      style={{
        ...styles.dropZone, 
        ...(isDragActive ? styles.dropZoneActive : {})
      }}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".pdf,image/*" 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

      {/* ⚠️ [Target REST API 미등록 시 상단 경고 배너] */}
      {!hasTargetUrl && (
        <div style={styles.alertBannerContainer} onClick={(e) => e.stopPropagation()}>
          <div style={styles.alertLeftGroup}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={styles.alertTextGroup}>
              <p style={styles.alertTitle}>Target REST API URL이 설정되지 않았습니다!</p>
              <p style={styles.alertDesc}>
                정제된 청크 데이터를 지식 DB에 저장하려면 먼저 Target REST API 주소를 등록해야 합니다.
              </p>
            </div>
          </div>
          <button 
            type="button"
            style={styles.alertBtn} 
            onClick={handleGoToSettings}
            title="Target API / RAG 설정 페이지로 이동"
          >
            ⚙️ 설정하러 가기
          </button>
        </div>
      )}
      
      {/* 🐾 중앙 클릭/드래그 타깃 (화면 전체 연동 인터랙션) */}
      <div 
        ref={contentRef}
        style={styles.clickableContent(isDragActive)}
        onClick={handleContentClick}
      >
        <div style={styles.logoWrapper}>
          <img 
            src={catFrames[currentFrameIndex]} 
            alt="AI Meow Interactive Logo" 
            style={styles.logoImg(isDragActive)}
          />
        </div>

        <p style={styles.mainText}>
          {isDragActive 
            ? "옳지! 그 파일 냐옹이한테 던져주라냥!" 
            : "작업할 파일을 드래그하거나 클릭해라냥"}
        </p>
        
        <p style={styles.subBadge}>
          AI Meow 컴팩트 정제기 (슬림 라인 뷰)
        </p>
      </div>

      {/* 🎯 파이프라인 설명 배너 */}
      {showGuide && guideSteps.length > 0 && (
        <div style={styles.guideBannerContainer} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🐾</span> {guideTitle}
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: '14px' }}>
              {guideBadge}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {guideSteps.map((step, idx) => (
              <React.Fragment key={step.num}>
                <div style={{
                  flex: 1,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    STEP {step.num}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    {step.title}
                  </span>
                  <span style={{ fontSize: '12px', color: '#475569', wordBreak: 'keep-all', lineHeight: '1.3', fontWeight: '500' }}>
                    {step.desc}
                  </span>
                </div>
                {idx < guideSteps.length - 1 && <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold' }}>➔</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadBox;