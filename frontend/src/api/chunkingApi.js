// 백엔드 API 기본 URL (동적 호스트 처리)
const API_BASE_URL = `http://${window.location.hostname}:8100`;

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
    return { target_api_url: "", api_key: "" };
  }
};

/**
 * 2. PDF 파일 업로드 및 서버 파싱 요청
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

  return response.json();
};

/**
 * 3. 이미지 파일 업로드 및 OCR/기본 정보 추출 요청
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

  return response.json();
};

/**
 * 4. 정제 완료된 청크 데이터를 고객사 Target REST API 및 지식 DB로 전송
 */
export const saveChunksApi = async (globalPrefix, chunks) => {
  // 로컬스토리지 저장값(사용자 수정값) 가져오기
  const targetApiUrl = localStorage.getItem('aimeow_target_api_url') || '';
  const apiKey = localStorage.getItem('aimeow_api_key') || '';

  const response = await fetch(`${API_BASE_URL}/api/save-chunks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      global_prefix: globalPrefix, 
      chunks: chunks,
      // 🎯 백엔드 Webhook 발송용 Target REST API 정보 함께 전달
      target_api_url: targetApiUrl,
      api_key: apiKey
    })
  });

  if (!response.ok) {
    throw new Error("지식 DB 적재 및 REST API 전송에 실패했습니다.");
  }

  return response.json();
};