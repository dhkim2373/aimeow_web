import React, { useState, useRef } from 'react';
import aiMeowLogo from '../../assets/aimeow-logo.png';

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
    transition: 'all 0.2s ease-in-out',
    userSelect: 'none'
  }),
  logoWrapper: { 
    marginBottom: '16px', 
    display: 'flex', 
    justifyContent: 'center' 
  },
  // 🐾 [고양이 로고 확대]: 160px -> 210px (Full HD 기준 시원한 크기)
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
    fontSize: '22px', // 폰트 크기 확대
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
  
  // 🔍 [Full HD 대응 파이프라인 배너 크기 확장]
  guideBannerContainer: {
    width: '100%',
    maxWidth: '960px', // 최대 너비 확장 (960px)
    marginTop: '32px',
    padding: '18px 24px', // 내부 패딩 확대
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    boxSizing: 'border-box',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
  }
};

function UploadBox({ 
  onFileUpload, 
  showGuide = false, 
  guideTitle = "스마트 청킹 작업 프로세스", 
  guideBadge = "RAG Pipeline", 
  guideSteps = [] 
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

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
      
      {/* 중앙 클릭/드래그 타깃 (확대된 로고 및 텍스트) */}
      <div 
        style={styles.clickableContent(isDragActive)}
        onClick={handleContentClick}
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

      {/* 🎯 [Full HD 시원한 크기의 파이프라인 설명 배너] */}
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
                  {/* STEP 뱃지 */}
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    STEP {step.num}
                  </span>
                  {/* 단계 제목 */}
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    {step.title}
                  </span>
                  {/* 설명 글자 */}
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