import React, { useState, useRef } from 'react';
import aiMeowLogo from '../../assets/aimeow-logo.png';

const styles = {
  // 드래그앤드롭을 감싸는 외곽 드롭존 (label 태그 -> div 변경)
  dropZone: { 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    border: '2px dashed #cbd5e1', 
    borderRadius: '16px', 
    textAlign: 'center', 
    backgroundColor: '#f8fafc', 
    boxSizing: 'border-box'
  },
  dropZoneActive: { 
    border: '2px dashed #3b82f6', 
    backgroundColor: '#eff6ff' 
  },
  
  // 🎯 [실제 클릭 영역 캡슐화]: 로고와 텍스트 주변만 클릭 가능하도록 세팅
  clickableContent: (isDragActive) => ({
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 32px',
    borderRadius: '20px',
    cursor: 'pointer',
    backgroundColor: isDragActive ? 'rgba(255,255,255,0.6)' : 'transparent',
    transition: 'all 0.2s ease-in-out',
    userSelect: 'none'
  }),

  logoWrapper: { 
    marginBottom: '16px', 
    display: 'flex', 
    justifyContent: 'center' 
  },
  logoImg: (isDragActive) => ({
    width: '180px',
    height: 'auto',
    objectFit: 'contain',
    filter: isDragActive 
      ? 'drop-shadow(0 10px 20px rgba(59, 130, 246, 0.4)) scale(1.05)' 
      : 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12))',
    transition: 'all 0.2s ease-in-out'
  }),
  mainText: { 
    fontWeight: '800', 
    color: '#0f172a', 
    fontSize: '19px', 
    margin: '0 0 10px 0', 
    letterSpacing: '-0.3px' 
  },
  subBadge: { 
    color: '#2563eb', 
    fontSize: '13px', 
    fontWeight: '600', 
    margin: 0, 
    backgroundColor: '#eff6ff', 
    padding: '6px 16px', 
    borderRadius: '20px', 
    border: '1px solid #bfdbfe' 
  }
};

function UploadBox({ onFileUpload }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  // 중앙 콘텐츠 클릭 시에만 파일창 열기
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
        accept=".pdf" 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />
      
      {/* 🎯 로고와 안내문구가 있는 딱 이 범위만 클릭 타겟으로 동작 */}
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
            : "검수할 SOP 문서를 드래그하거나 클릭해라냥"}
        </p>
        
        <p style={styles.subBadge}>
          AI Meow 컴팩트 정제기 (슬림 라인 뷰)
        </p>
      </div>
    </div>
  );
}

export default UploadBox;