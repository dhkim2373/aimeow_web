/**
 * 백엔드 API 기본 URL 설정
 * 1. 단일 포트 운영(Docker/FastAPI통합) 시 상대 경로("") 사용
 * 2. 분리 개발(Local Dev) 시 현재 호스트의 8100 포트 자동 추적
 */
const API_BASE_URL = window.location.port === '5173' 
  ? `http://${window.location.hostname}:8100` 
  : '';

/**
 * 1. 백엔드 서버에 설정된 기본 프로퍼티(TARGET_REST_API_URL 등) 조회
 */
export const fetchServerConfigApi = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`);
    if (!response.ok) {
      throw new Error("서버 프로퍼티 설정 조회 실패");
    }
    return await response.json();
  } catch (error) {
    console.warn("서버 설정 조회 중 오류 발생 (기본값 사용):", error);
    return { 
      target_api_url: "", 
      api_key: "",
      gemini_api_key: "",
      image_upload_url: "",
      image_server_token: "",
      file_field_name: "file",
      response_url_key: "auto"
    };
  }
};

/**
 * 2. PDF 파일 업로드 및 텍스트/라인 파싱 요청
 */
export const uploadPdfApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload-pdf`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error("PDF 파싱 중 서버 오류가 발생했습니다.");
  }

  return await response.json();
};

/**
 * 3. PDF 또는 문서 파일 업로드 시 파일 내 이미지 추출 요청
 */
export const extractPdfImagesApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/extract-images`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error("PDF 파일에서 이미지를 추출하는 중 서버 오류가 발생했습니다.");
  }

  return await response.json();
};

/**
 * 4. 이미지 파일 단일 업로드 및 OCR/기본 정보 추출 요청
 */
export const uploadImageApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error("이미지 분석 중 서버 오류가 발생했습니다.");
  }

  return await response.json();
};

/**
 * ✨ 5. Gemini Vision 메타데이터 자동 추출 API 요청
 */
export const extractVisionApi = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/extract-vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Gemini Vision 자동 분석에 실패했습니다.');
  }

  return await response.json();
};

/**
 * 6. 텍스트 정제 완료된 청크 데이터를 고객사 Target REST API 및 지식 DB로 전송
 */
export const saveChunksApi = async (globalPrefix, chunks) => {
  const targetApiUrl = localStorage.getItem('aimeow_target_api_url') || '';
  const apiKey = localStorage.getItem('aimeow_api_key') || '';

  const response = await fetch(`${API_BASE_URL}/api/save-chunks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      global_prefix: globalPrefix, 
      chunks: chunks,
      target_api_url: targetApiUrl,
      api_key: apiKey
    })
  });

  if (!response.ok) {
    throw new Error("지식 DB 적재 및 REST API 전송에 실패했습니다.");
  }

  return await response.json();
};

/**
 * 7. 정제 완료된 이미지 청크 데이터를 지식 DB로 전송
 */
export const saveImageChunkApi = async (payloadOrPrefix, imageData = null) => {
  let bodyPayload = {};

  if (typeof payloadOrPrefix === 'object' && payloadOrPrefix !== null) {
    bodyPayload = payloadOrPrefix;
  } else {
    bodyPayload = {
      global_prefix: payloadOrPrefix,
      image_data: imageData,
      target_api_url: localStorage.getItem('aimeow_target_api_url') || '',
      api_key: localStorage.getItem('aimeow_api_key') || ''
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/save-image-chunk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "이미지 청크 지식 DB 적재에 실패했습니다.");
  }

  return await response.json();
};

/**
 * 8. 서버 연동 설정(Target REST API / Gemini API / 이미지 서버) 저장 요청
 */
export const saveServerConfigApi = async (targetApiUrlOrConfig, apiKey = '') => {
  let payload = {};

  if (typeof targetApiUrlOrConfig === 'object' && targetApiUrlOrConfig !== null) {
    payload = {
      target_api_url: targetApiUrlOrConfig.target_api_url || targetApiUrlOrConfig.targetApiUrl || '',
      api_key: targetApiUrlOrConfig.api_key || targetApiUrlOrConfig.apiKey || '',
      gemini_api_key: targetApiUrlOrConfig.gemini_api_key || targetApiUrlOrConfig.geminiApiKey || '',
      image_upload_url: targetApiUrlOrConfig.image_upload_url || targetApiUrlOrConfig.imageUploadUrl || '',
      image_server_token: targetApiUrlOrConfig.image_server_token || targetApiUrlOrConfig.imageServerToken || '',
      file_field_name: targetApiUrlOrConfig.file_field_name || targetApiUrlOrConfig.fileFieldName || 'file',
      response_url_key: targetApiUrlOrConfig.response_url_key || targetApiUrlOrConfig.responseUrlKey || 'auto'
    };
  } else {
    payload = {
      target_api_url: targetApiUrlOrConfig || '',
      api_key: apiKey || '',
      gemini_api_key: '',
      file_field_name: 'file',
      response_url_key: 'auto'
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "서버 연동 설정 저장에 실패했습니다.");
  }

  return await response.json();
};

/**
 * 9. 이미지 OCR 처리 요청
 */
export const processImageOcrApi = async (imageId, previewUrl, userId = 'default_user') => {
  const formData = new FormData();
  formData.append('image_id', imageId);
  formData.append('preview_url', previewUrl);
  formData.append('user_id', userId);

  const response = await fetch(`${API_BASE_URL}/api/process-image-ocr`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('OCR 파싱 연동 중 서버 오류가 발생했습니다.');
  }

  return await response.json();
};

/**
 * 10. 마크다운 라인 배열을 백엔드로 보내어 MarkdownHeaderTextSplitter 기준 자동 분할 요청
 */
export const splitMarkdownApi = async (payload) => {
  const bodyData = Array.isArray(payload) ? { lines: payload } : payload;

  const response = await fetch(`${API_BASE_URL}/api/chunking/markdown-split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '마크다운 자동 청킹 처리에 실패했습니다.');
  }

  return await response.json();
};

/**
 * 🧩 11. 서버 랭체인 멀티 구분자 리커시브 캐릭터 스플리터 요청
 */
export const recursiveSplitApi = async (text, chunkSize, chunkOverlap, delimiters) => {
  const response = await fetch(`${API_BASE_URL}/api/chunking/recursive-split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      delimiters: delimiters
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || '랭체인 리커시브 청킹 처리에 실패했습니다.');
  }

  return await response.json();
};

// 🎯 [별칭 내보내기]
export const getSettingsConfig = fetchServerConfigApi;
export const saveSettingsConfig = saveServerConfigApi;
export const getConfig = fetchServerConfigApi;