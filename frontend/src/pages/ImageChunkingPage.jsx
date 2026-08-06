import React, { useState, useRef, useEffect } from 'react';
import UploadBox from '../components/ui/UploadBox';
import LoadingView from '../components/ui/LoadingView';

const styles = {
  fullContainer: {
    width: '100%',
    height: '100%',        // 👈 100vh 사용 금지, 100% 사용
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
    minHeight: 0,          // 👈 Flex 자식 높이 오버플로우 방지 핵심
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
    position: 'relative'
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
  imageCard: (isSelected) => ({
    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
    borderRadius: '12px',
    padding: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '12px'
  }),
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
  
  // 선택된 이미지의 OCR & 메타데이터 상태
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [imageServerUrl, setImageServerUrl] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [caption, setCaption] = useState('');
  const [imageType, setImageType] = useState('DIAGRAM'); // 'DIAGRAM' | 'CHART' | 'PHOTO' | 'TABLE'
  const [tags, setTags] = useState('');

  // 패널 조절 리사이징
  const [leftWidth, setLeftWidth] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const wrapperRef = useRef(null);

  // 리사이징 이벤트
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

  // 1. PDF 업로드 & 내부에 포함된 이미지 자동 추출
  const handleFileUpload = async (file) => {
    setStep('loading');
    setPdfFile(file);
    setGlobalPrefix(file.name.replace(/\.[^/.]+$/, ""));

    try {
      // API 호출 예시 (백엔드에서 이미지 목록 수신)
      // const response = await extractPdfImagesApi(file);
      
      // 샘플 데이터 구조
      const sampleImages = [
        { image_id: 'img_1', page_number: 1, preview_url: 'https://via.placeholder.com/300x180?text=Page1+Diagram' },
        { image_id: 'img_2', page_number: 2, preview_url: 'https://via.placeholder.com/300x200?text=Page2+Flowchart' },
        { image_id: 'img_3', page_number: 3, preview_url: 'https://via.placeholder.com/300x150?text=Page3+Table' },
      ];

      setImageList(sampleImages);
      setStep('editor');
      
      // 첫 번째 이미지 자동 선택
      if (sampleImages.length > 0) {
        handleSelectImage(sampleImages[0]);
      }
    } catch (err) {
      alert("PDF 내 이미지 추출 중 오류가 발생했습니다.");
      setStep('upload');
    }
  };

  // 2. 이미지 선택 시 OCR 읽기 및 이미지 서버 자동 업로드
  const handleSelectImage = async (imgObj) => {
    setSelectedImage(imgObj);
    setIsProcessingOcr(true);

    try {
      // API 호출: OCR 읽기 및 이미지 서버 업로드
      // const res = await processOcrAndUploadApi(imgObj.image_id);
      
      // 가상 OCR 및 업로드 결과 적용
      setTimeout(() => {
        setImageServerUrl(`https://img-server.aimeow.com/sop/2026/${imgObj.image_id}.png`);
        setOcrText(`[OCR 데이터 추출 완료]\n- 문서명: ${globalPrefix}\n- 페이지: ${imgObj.page_number} Page\n- 내용: 변경 관리 프로세스 플로우차트 (신청 -> 검토 -> 승인)`);
        setCaption(`페이지 ${imgObj.page_number}에 포함된 절도 흐름도`);
        setIsProcessingOcr(false);
      }, 600);
    } catch (err) {
      alert("OCR 읽기 또는 이미지 서버 업로드 실패");
      setIsProcessingOcr(false);
    }
  };

  // 3. 메타데이터 최종 적재 저장
  const handleSaveImageChunk = async () => {
    if (!selectedImage) return;

    const payload = {
      global_prefix: globalPrefix,
      image_id: selectedImage.image_id,
      page_number: selectedImage.page_number,
      image_server_url: imageServerUrl,
      ocr_text: ocrText,
      caption: caption,
      image_type: imageType,
      tags: tags.split(',').map(t => t.trim())
    };

    try {
      // await saveImageChunkApi(payload);
      alert(`🖼️ 이미지 청크가 지식 DB에 성공적으로 적재되었습니다!\n(URL: ${imageServerUrl})`);
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={styles.fullContainer}>
      <div style={styles.mainCard}>
        {/* Step 1: 업로드 */}
        {step === 'upload' && (
          <UploadBox onFileUpload={handleFileUpload} />
        )}

        {/* Step 2: 로딩 */}
        {step === 'loading' && (
          <LoadingView message="PDF 내 이미지를 추출하는 중입니다..." />
        )}

        {/* Step 3: 이미지 청킹 에디터 */}
        {step === 'editor' && (
          <>
            {/* 상단 콤팩트 헤더 */}
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

            {/* Split 워크스페이스 */}
            <div style={styles.splitWrapper} ref={wrapperRef}>
              {/* 좌측: 추출된 이미지 갤러리 */}
              <div style={styles.leftGalleryPanel(leftWidth)}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  📂 추출된 이미지 리스트
                </h3>

                {imageList.map((img) => {
                  const isSelected = selectedImage?.image_id === img.image_id;
                  return (
                    <div
                      key={img.image_id}
                      style={styles.imageCard(isSelected)}
                      onClick={() => handleSelectImage(img)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                        <span>📷 {img.image_id}</span>
                        <span style={{ backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                          P.{img.page_number}
                        </span>
                      </div>
                      <img
                        src={img.preview_url}
                        alt="추출 이미지"
                        style={{ width: '100%', height: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  );
                })}
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
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚙️ 이미지 OCR 및 메타데이터 정제</span>
                      {isProcessingOcr && <span style={{ fontSize: '12px', color: '#2563eb' }}>(OCR 읽기 및 업로드 중...)</span>}
                    </h3>

                    {/* 이미지 서버 URL */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        🌐 이미지 서버 업로드 URL:
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={imageServerUrl}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                      />
                    </div>

                    {/* OCR 추출 텍스트 편집 */}
                    <div style={{ marginBottom: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        📝 OCR 읽은 텍스트 데이터 (수정 가능):
                      </label>
                      <textarea
                        value={ocrText}
                        onChange={(e) => setOcrText(e.target.value)}
                        rows={6}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', lineHeight: '1.5', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    {/* 캡션 / 메타데이터 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                          🏷️ 이미지 캡션/제목:
                        </label>
                        <input
                          type="text"
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="예: [그림 3] 변경 관리 승인 흐름도"
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
                          <option value="TABLE">표 / 스프레드시트 이미지</option>
                          <option value="PHOTO">현장 장비 / 실사 사진</option>
                        </select>
                      </div>
                    </div>

                    {/* 수동 태그 */}
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        🏷️ 수동 태그 (콤마 구분):
                      </label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="예: 승인절차, 센터장서명, GxP검토"
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      />
                    </div>

                    {/* 최종 DB 적재 버튼 */}
                    <button style={styles.saveBtn} onClick={handleSaveImageChunk}>
                      🖼️ 이미지 청크 및 메타데이터 지식 DB에 적재하기
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