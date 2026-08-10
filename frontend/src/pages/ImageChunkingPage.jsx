import React, { useState, useRef, useEffect } from 'react';
import UploadBox from '../components/ui/UploadBox';
import LoadingView from '../components/ui/LoadingView';
import { extractPdfImagesApi, uploadImageApi, saveImageChunkApi } from '../api/chunkingApi';

const imageGuideSteps = [
  { num: '01', title: '📁 파일 업로드', desc: 'PDF 또는 이미지 드래그' },
  { num: '02', title: '🖼️ 이미지 선택', desc: '페이지별 렌더링 이미지 선택' },
  { num: '03', title: '✍️ 메타데이터 작성', desc: '수동 텍스트/표/캡션 입력' },
  { num: '04', title: '💾 지식 DB 저장', desc: 'URL + 정보 최종 적재' }
];

// 렌더링용 이미지 URL 정제 헬퍼
const getImageUrl = (img) => {
  if (!img) return '';
  if (img.image_data_base64) return img.image_data_base64;

  const url = img.preview_url || img.url || img.image_url || '';
  if (!url) return '';

  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  const backendHost = window.location.port === '5173'
    ? `http://${window.location.hostname}:8100`
    : '';

  return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

// 지식 DB 저장 및 서빙 URL 표시용 헬퍼 (blob 주소가 전송되는 것을 원천 차단)
const getHttpServerUrl = (img) => {
  if (!img) return '';
  const url = img.preview_url || img.image_server_url || img.url || img.image_url || '';
  if (!url || url.startsWith('blob:')) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (!url.startsWith('data:')) {
    const backendHost = window.location.port === '5173'
      ? `http://${window.location.hostname}:8100`
      : '';
    return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return '';
};

const styles = {
  fullContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    flex: 1
  },
  mainCard: {
    backgroundColor: '#ffffff',
    padding: '16px 20px',
    boxSizing: 'border-box',
    border: 'none',
    flex: 1,
    width: '100%',
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
  resetBtn: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease'
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
    padding: '12px',
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  }),
  thumbnailListSidebar: {
    width: '130px',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
    flexShrink: 0
  },
  imageGridCard: (isSelected) => ({
    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
    borderRadius: '10px',
    padding: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)'
  }),
  mainImageViewer: {
    flex: 1,
    height: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
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
    userSelect: 'none',
    flexShrink: 0
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
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
  }
};

function ImageChunkingPage() {
  const [step, setStep] = useState('upload'); 
  const [globalPrefix, setGlobalPrefix] = useState('');
  const [sourceFilename, setSourceFilename] = useState('');
  const [imageList, setImageList] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [imageServerUrl, setImageServerUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [caption, setCaption] = useState('');
  const [imageType, setImageType] = useState('TABLE');
  const [tags, setTags] = useState('');

  const [leftWidth, setLeftWidth] = useState(50);
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
      if (newWidth < 30) newWidth = 30;
      if (newWidth > 75) newWidth = 75;
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

  // 🎯 파일 업로드 핸들러 (Blob URL 생성 대신 백엔드 업로드 API 연동으로 서버 정적 URL 확보)
  const handleFileUpload = async (file) => {
    setStep('loading');
    setSourceFilename(file.name);
    const prefixName = file.name.replace(/\.[^/.]+$/, "");
    setGlobalPrefix(prefixName);

    try {
      let extractedList = [];

      if (file.type.startsWith('image/')) {
        // 단일 이미지 파일인 경우 백엔드 API로 업로드하여 서버 정적 URL 획득
        const apiRes = await uploadImageApi(file);
        const serverUrl = apiRes.preview_url || apiRes.image_url || apiRes.url;
        
        if (!serverUrl) {
          throw new Error("서버로부터 유효한 이미지 서빙 URL을 받지 못했습니다.");
        }

        extractedList = [{
          image_id: apiRes.image_id || 'img_single_1',
          page_number: 1,
          preview_url: serverUrl,
          ocr_text: apiRes.ocr_text || ''
        }];
      } else {
        // PDF 문서 파일인 경우 페이지별 이미지 추출 API 호출
        const responseData = await extractPdfImagesApi(file);

        if (Array.isArray(responseData)) {
          extractedList = responseData;
        } else if (Array.isArray(responseData?.images)) {
          extractedList = responseData.images;
        } else {
          extractedList = [];
        }
      }

      setImageList(extractedList);
      setStep('editor');

      if (Array.isArray(extractedList) && extractedList.length > 0) {
        handleSelectImage(extractedList[0]);
      }
    } catch (err) {
      console.error("이미지 추출 실패:", err);
      alert(err.message || "파일에서 이미지를 처리하는 중 오류가 발생했습니다.");
      setStep('upload');
    }
  };

  const handleSelectImage = (imgObj) => {
    setSelectedImage(imgObj);
    const cleanHttpUrl = getHttpServerUrl(imgObj);
    setImageServerUrl(cleanHttpUrl);

    setManualText(imgObj.ocr_text || '');
    setCaption(`[페이지 ${imgObj.page_number || 1}] 이미지/표 정보`);
    setTags('');
  };

  // 🎯 작업 초기화 (전체 상태 리셋 및 업로드 화면으로 전환)
  const handleReset = () => {
    if (window.confirm("현재 업로드된 이미지 및 작성 중인 작업 내용이 모두 초기화됩니다. 진행하시겠습니까?")) {
      setStep('upload');
      setGlobalPrefix('');
      setSourceFilename('');
      setImageList([]);
      setSelectedImage(null);
      setImageServerUrl('');
      setManualText('');
      setCaption('');
      setImageType('TABLE');
      setTags('');
    }
  };

  const handleSaveImageChunk = async () => {
    if (!selectedImage) return;

    if (!imageServerUrl || imageServerUrl.startsWith('blob:')) {
      alert("⚠️ 유효한 서버 이미지 URL이 아닙니다. 이미지가 정상적으로 업로드되었는지 확인해주세요.");
      return;
    }

    try {
      const payload = {
        user_name: 'admin',
        global_prefix: globalPrefix,
        source_filename: sourceFilename,
        image_url: imageServerUrl,
        ocr_text: manualText,
        caption: caption,
        image_type: imageType,
        tags: tags
      };

      await saveImageChunkApi(payload);
      alert(`🖼️ 수동 입력 메타데이터 및 이미지 정보가 성공적으로 DB에 저장되었습니다!`);
    } catch (err) {
      console.error("DB 저장 실패:", err);
      alert(err.message || "DB 저장 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={styles.fullContainer}>
      <div style={styles.mainCard}>
        {step === 'upload' && (
          <UploadBox 
            onFileUpload={handleFileUpload} 
            showGuide={true}
            guideTitle="수동 메타데이터 & 이미지 청킹 프로세스"
            guideBadge="Image-to-RAG Pipeline"
            guideSteps={imageGuideSteps}
          />
        )}

        {step === 'loading' && (
          <LoadingView message="PDF 및 이미지를 분석/추출하는 중입니다..." />
        )}

        {step === 'editor' && (
          <>
            <div style={styles.compactHeaderSection}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <h2 style={styles.pageTitle}>
                  <span style={{ fontSize: '22px' }}>🖼️</span>
                  <span style={{ color: '#2563eb', fontWeight: '900' }}>AI Meow</span>
                  <span style={{ color: '#0f172a' }}>이미지 & 메타데이터 매니저</span>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  총 {Array.isArray(imageList) ? imageList.length : 0}개의 이미지 추출됨
                </span>

                {/* 🎯 작업 초기화 버튼 */}
                <button type="button" style={styles.resetBtn} onClick={handleReset}>
                  <span>🔄</span>
                  <span>작업 초기화</span>
                </button>
              </div>
            </div>

            <div style={styles.splitWrapper} ref={wrapperRef}>
              <div style={styles.leftGalleryPanel(leftWidth)}>
                <div style={styles.thumbnailListSidebar}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                    📂 목록
                  </div>
                  {Array.isArray(imageList) && imageList.map((img, idx) => {
                    const isSelected = selectedImage?.image_id === img.image_id;
                    const finalImgSrc = getImageUrl(img);

                    return (
                      <div
                        key={img.image_id || `img_${idx}`}
                        style={styles.imageGridCard(isSelected)}
                        onClick={() => handleSelectImage(img)}
                      >
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', fontWeight: '700', color: '#475569' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' }}>
                            📷 P.{img.page_number || idx + 1}
                          </span>
                        </div>
                        
                        <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px', backgroundColor: '#f1f5f9' }}>
                          <img
                            src={finalImgSrc}
                            alt={`추출 이미지 ${img.page_number || idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.mainImageViewer}>
                  {selectedImage ? (
                    <img
                      src={getImageUrl(selectedImage)}
                      alt="선택된 이미지 원본"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      선택된 이미지가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{ ...styles.resizerBar, backgroundColor: isResizing ? '#e2e8f0' : 'transparent' }}
                onMouseDown={startResize}
              >
                <div style={styles.resizerLine} />
              </div>

              <div style={styles.rightMetaPanel(leftWidth)}>
                {selectedImage ? (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                        ⚙️ 이미지 메타데이터 및 내용 수동 정제
                      </h3>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        🌐 이미지 서빙 URL:
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={imageServerUrl}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                        📝 수동 입력 내용/표 (Markdown 직접 작성):
                      </label>
                      <textarea
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder={"이미지에 포함된 주요 내용이나 표(|---|---|)를 직접 작성하세요.\n\n예시:\n| 항목 | 내용 |\n| --- | --- |\n| 변경건 | 바코드 스캔 기능 추가 |"}
                        style={{ 
                          width: '100%', 
                          flex: 1,
                          minHeight: '200px',
                          padding: '10px', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '8px', 
                          fontSize: '12px', 
                          fontFamily: 'monospace', 
                          outline: 'none', 
                          lineHeight: '1.5',
                          resize: 'vertical'
                        }}
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
                          placeholder="예: [표 1] 변경 신청서 서식"
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
                          <option value="TABLE">표 / 양식</option>
                          <option value="DIAGRAM">다이어그램 / 순서도</option>
                          <option value="CHART">차트 / 그래프</option>
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
                      💾 이미지 & 수동 입력 정보 지식 DB에 저장하기
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