import React, { useState, useRef, useEffect } from 'react';
import aiMeowLogo from '../../assets/aimeow-logo.png';
import { fetchServerConfigApi } from '../../api/chunkingApi';

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
  clickableContent: (isDragActive, mouseTransform) => ({
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 36px',
    borderRadius: '24px',
    cursor: 'pointer',
    backgroundColor: isDragActive ? 'rgba(255,255,255,0.7)' : 'transparent',
    transition: 'background-color 0.2s ease-in-out',
    userSelect: 'none',
    perspective: '1000px', // 🐾 3D 입체감 깊이 설정
    transform: mouseTransform, // 🐾 관성 기반 동적 3D 회전 + 이동 적용
    willChange: 'transform'
  }),
  logoWrapper: { 
    marginBottom: '16px', 
    display: 'flex', 
    justifyContent: 'center' 
  },
  logoImg: (isDragActive) => ({
    width: '210px',
    height: 'auto',
    objectFit: 'contain',
    filter: isDragActive 
      ? 'drop-shadow(0 12px 24px rgba(59, 130, 246, 0.45)) scale(1.06)' 
      : 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.12))',
    transition: 'all 0.2s ease-in-out'
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
  
  // 🐾 targetPos: 실시간 마우스 목표 위치 / currentPos: 관성으로 부드럽게 추종하는 현재 위치
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const contentRef = useRef(null);

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

  // 🐾 [핵심 로직] Lerp(선형 보간) 기반 프레임 애니메이션 루프 (관성 효과)
  useEffect(() => {
    let animFrameId;
    const lerpFactor = 0.08; // 0.08: 값이 작을수록 부드럽고 묵직하게 감속하며 추종함

    const animate = () => {
      setCurrentPos((prev) => {
        const nextX = prev.x + (targetPos.x - prev.x) * lerpFactor;
        const nextY = prev.y + (targetPos.y - prev.y) * lerpFactor;
        return { x: nextX, y: nextY };
      });
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameId);
  }, [targetPos]);

  // 🐾 마우스 이동 이벤트 Handler
  const handleMouseMove = (e) => {
    if (!contentRef.current) return;

    const rect = contentRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const xRatio = (e.clientX - centerX) / (rect.width / 2);
    const yRatio = (e.clientY - centerY) / (rect.height / 2);

    // X, Y 목표 비중 설정
    setTargetPos({
      x: Math.max(-1, Math.min(1, xRatio)),
      y: Math.max(-1, Math.min(1, yRatio))
    });
  };

  // 🐾 마우스 벗어날 때 복귀
  const handleMouseLeaveContent = () => {
    setTargetPos({ x: 0, y: 0 });
  };

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

  // 🐾 회전(rotate) + 커서 방향 약간의 공간 이동(translate) 조합으로 시선/고개 조아림 극대화
  const maxRotateDeg = 16;
  const maxTranslatePx = 10;

  const rotateY = currentPos.x * maxRotateDeg;
  const rotateX = -currentPos.y * maxRotateDeg;
  const translateX = currentPos.x * maxTranslatePx;
  const translateY = currentPos.y * maxTranslatePx;

  const mouseTransform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateX(${translateX.toFixed(2)}px) translateY(${translateY.toFixed(2)}px)`;

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
      
      {/* 🐾 중앙 클릭/드래그 타깃 (관성 트래킹 연동) */}
      <div 
        ref={contentRef}
        style={styles.clickableContent(isDragActive, mouseTransform)}
        onClick={handleContentClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeaveContent}
      >
        <div style={styles.logoWrapper}>
          <img 
            src={aiMeowLogo} 
            alt="AI Meow Main Logo" 
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