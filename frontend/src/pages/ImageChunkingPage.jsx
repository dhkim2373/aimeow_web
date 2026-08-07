import React, { useState, useRef, useEffect } from 'react';
import UploadBox from '../components/ui/UploadBox';
import LoadingView from '../components/ui/LoadingView';

const styles = {
  fullContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  mainCard: {
    backgroundColor: '#ffffff',
    padding: '16px 20px',
    boxSizing: 'border-box',
    border: 'none',
    flex: 1,
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  compactHeaderSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '8px 16px',
    marginBottom: '12px',
    flexShrink: 0
  },
  pageTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#0f172a',
    fontWeight: '900',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  globalPrefixInput: {
    flex: 1,
    maxWidth: '380px',
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    outline: 'none'
  },
  splitWrapper: {
    display: 'flex',
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0
  },
  leftGalleryPanel: (leftWidth) => ({
    width: `${leftWidth}%`,
    height: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  }),
  // 🎯 [격자 레이아웃 스타일]: 이미지 썸네일 격자 배열
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '12px',
    width: '100%'
  },
  imageGridCard: (isSelected) => ({
    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
    borderRadius: '12px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)'
  }),
  rightMetaPanel: (leftWidth) => ({
    width: `calc(${100 - leftWidth}% - 12px)`,
    height: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  }),
  resizerBar: {
    width: '12px',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    userSelect: 'none'
  },
  resizerLine: {
    width: '4px',
    height: '40px',
    backgroundColor: '#cbd5e1',
    borderRadius: '2px'
  },
  saveBtn: {
    marginTop: '16px',
    padding: '14px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '15px'
  }
};

function ImageChunkingPage() {
  const [step, setStep] = useState('upload'); // 'upload' | 'loading' | 'editor'
  const [globalPrefix, setGlobalPrefix] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [imageServerUrl, setImageServerUrl] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [caption, setCaption] = useState('');
  const [imageType, setImageType] = useState('DIAGRAM');
  const [tags, setTags] = useState('');

  const [leftWidth, setLeftWidth] = useState(45); // 격자 구성을 위해 너비 45% 기본값
  const [isResizing, setIsResizing] = useState(false);
  const wrapperRef = useRef(null);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !wrapperRef.current) return;
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const relativeX = e.clientX - wrapperRect.left;
      let newWidth = (relativeX / wrapperRect.width) * 100;
      if (newWidth < 25) newWidth = 25;
      if (newWidth > 70) newWidth = 70;
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // PDF 또는 이미지 파일 업로드 시 일괄 데이터 처리
  const handleFileUpload = async (file) => {
    setStep('loading');
    setPdfFile(file);
    setGlobalPrefix(file.name.replace(/\.[^/.]+$/, ""));

    try {
      let extractedList = [];

      if (file.type.startsWith('image/')) {
        // 단일 이미지 파일 업로드 시 처리
        const objectUrl = URL.createObjectURL(file);
        extractedList = [
          { image_id: 'img_uploaded_1', page_number: 1, preview_url: objectUrl }
        ];
      } else {
        // PDF 파일 업로드 시 샘플 추출 목록 (백엔드 API 호출 지점)
        extractedList = [
          { image_id: 'img_1', page_number: 1, preview_url: 'https://via.placeholder.com/300x180?text=Page1+Diagram' },
          { image_id: 'img_2', page_number: 2, preview_url: 'https://via.placeholder.com/300x200?text=Page2+Flowchart' },
          { image_id: 'img_3', page_number: 3, preview_url: 'https://via.placeholder.com/300x150?text=Page3+Table' },
          { image_id: 'img_4', page_number: 4, preview_url: 'https://via.placeholder.com/300x180?text=Page4+Graph' },
          { image_id: 'img_5', page_number: 5, preview_url: 'https://via.placeholder.com/300x200?text=Page5+Photo' },
        ];
      }

      setImageList(extractedList);
      setStep('editor');
      if (extractedList.length > 0) {
        handleSelectImage(extractedList[0]);
      }
    } catch (err) {
      alert("파일 이미지 추출 중 오류가 발생했습니다.");
      setStep('upload');
    }
  };

  // 이미지 선택 시 OCR 및 서버 업로드 처리
  const handleSelectImage = async (imgObj) => {
    setSelectedImage(imgObj);
    setIsProcessingOcr(true);

    setTimeout(() => {
      setImageServerUrl(`https://img-server.aimeow.com/sop/2026/${imgObj.image_id}.png`);
      setOcrText(`[OCR 데이터 추출 완료]\n- 문서명: ${globalPrefix}\n- 페이지: ${imgObj.page_number} Page\n- 내용: 변경 관리 프로세스 플로우차트`);
      setCaption(`페이지 ${imgObj.page_number}에 포함된 절차 흐름도`);
      setIsProcessingOcr(false);
    }, 350);
  };

  const handleSaveImageChunk = async () => {
    if (!selectedImage) return;
    alert(`🖼️ 선택한 이미지 청크가 지식 DB에 성공적으로 적재되었습니다!\n(URL: ${imageServerUrl})`);
  };

  return (
    <div style={styles.fullContainer}>
      <div style={styles.mainCard}>
        {/* Step 1: 업로드 (안내 바너 + UploadBox) */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', width: '100%' }}>
            <ImageGuideBanner />
            <UploadBox onFileUpload={handleFileUpload} />
          </div>
        )}

        {/* Step 2: 로딩 */}
        {step === 'loading' && (
          <LoadingView message="파일 내 이미지를 추출하는 중입니다..." />
        )}

        {/* Step 3: 이미지 청킹 메인 스플릿 워크스페이스 */}
        {step === 'editor' && (
          <>
            {/* 콤팩트 상단 헤더 */}
            <div style={styles.compactHeaderSection}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <h2 style={styles.pageTitle}>
                  <span style={{ fontSize: '22px' }}>🖼️</span>
                  <span style={{ color: '#2563eb', fontWeight: '900' }}>AI Meow</span>
                  <span style={{ color: '#0f172a' }}>이미지 청킹 매니저</span>
                </h2>

                <div style={{ width: '1px', height: '18px', backgroundColor: '#cbd5e1' }} />

                <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                  📌 공통 헤더:
                </span>
                <input
                  type="text"
                  value={globalPrefix}
                  onChange={(e) => setGlobalPrefix(e.target.value)}
                  style={styles.globalPrefixInput}
                />
              </div>

              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                총 {imageList.length}개의 이미지 추출됨
              </span>
            </div>

            {/* 메인 2단 Split 영억 */}
            <div style={styles.splitWrapper} ref={wrapperRef}>
              {/* 좌측: 추출된 이미지 격자(Grid) 갤러리 */}
              <div style={styles.leftGalleryPanel(leftWidth)}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  📂 추출된 이미지 선택 (격자 뷰)
                </h3>

                {/* 🎯 [격자 배치 컨테이너] */}
                <div style={styles.imageGrid}>
                  {imageList.map((img) => {
                    const isSelected = selectedImage?.image_id === img.image_id;
                    return (
                      <div
                        key={img.image_id}
                        style={styles.imageGridCard(isSelected)}
                        onClick={() => handleSelectImage(img)}
                      >
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                            📷 {img.image_id}
                          </span>
                          <span style={{ backgroundColor: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                            P.{img.page_number}
                          </span>
                        </div>
                        
                        <div style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '6px', backgroundColor: '#f1f5f9' }}>
                          <img
                            src={img.preview_url}
                            alt="추출 이미지"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 리사이저 바 */}
              <div
                style={{ ...styles.resizerBar, backgroundColor: isResizing ? '#e2e8f0' : 'transparent' }}
                onMouseDown={startResize}
              >
                <div style={styles.resizerLine} />
              </div>

              {/* 우측: 선택된 이미지 OCR 및 메타데이터 정제 */}
              <div style={styles.rightMetaPanel(leftWidth)}>
                {selectedImage ? (
                  <>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      ⚙️ 이미지 OCR 및 메타데이터 정제
                      {isProcessingOcr && <span style={{ fontSize: '12px', color: '#2563eb', marginLeft: '8px' }}>(OCR 분석 중...)</span>}
                    </h3>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        🌐 이미지 서버 업로드 URL:
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={imageServerUrl}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        📝 OCR 읽은 텍스트 데이터:
                      </label>
                      <textarea
                        value={ocrText}
                        onChange={(e) => setOcrText(e.target.value)}
                        rows={6}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                          🏷️ 이미지 캡션/제목:
                        </label>
                        <input
                          type="text"
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="예: [그림 3] 승인 흐름도"
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                          📂 이미지 유형:
                        </label>
                        <select
                          value={imageType}
                          onChange={(e) => setImageType(e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        >
                          <option value="DIAGRAM">다이어그램 / 순서도</option>
                          <option value="CHART">차트 / 그래프</option>
                          <option value="TABLE">표 / 이미지</option>
                          <option value="PHOTO">현장 사진</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        🏷️ 수동 태그:
                      </label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="예: 승인절차, GxP검토"
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      />
                    </div>

                    <button style={styles.saveBtn} onClick={handleSaveImageChunk}>
                      🖼️ 이미지 청크 지식 DB에 적재하기
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                    왼쪽 패널에서 이미지를 선택해 주세요.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ImageChunkingPage;

// 📌 [페이지 내장 서브 컴포넌트]: ImageGuideBanner
function ImageGuideBanner() {
  const steps = [
    { num: '01', title: '📁 파일 업로드', desc: 'PDF 또는 이미지 드래그' },
    { num: '02', title: '🔍 이미지 추출', desc: 'PDF 내 도표/사진 자동 추출' },
    { num: '03', title: '⚡ OCR & 서버 탑재', desc: '선택 이미지 텍스트 읽기' },
    { num: '04', title: '🏷️ 메타데이터 정제', desc: '캡션/유형/태그 추가' },
    { num: '05', title: '💾 지식 DB 저장', desc: 'Vector DB 최종 적재' },
  ];

  return (
    <div style={{
      width: '100%',
      maxWidth: '860px',
      backgroundColor: '#f8fafc',
      border: '1px solid #cbd5e1',
      borderRadius: '16px',
      padding: '12px 18px',
      marginBottom: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🐾</span> 스마트 이미지 청킹 작업 가이드
        </span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 10px', borderRadius: '12px' }}>
          Image-to-RAG Pipeline
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div style={{
              flex: 1,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 5px', borderRadius: '4px', marginBottom: '3px' }}>
                STEP {step.num}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', marginBottom: '2px' }}>
                {step.title}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {step.desc}
              </span>
            </div>
            {idx < steps.length - 1 && <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold' }}>➔</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}