import os
import time
import shutil
import pdfplumber
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from config import get_user_workspace
from routers.settings import get_config

router = APIRouter(prefix="/api", tags=["Text Chunking"])


def format_table_to_lines(table):
    """pdfplumber 표 데이터를 마크다운 라인 목록으로 변환"""
    lines = []
    for row in table:
        row_text = " | ".join([str(cell or "").strip().replace('\n', ' ') for cell in row])
        if row_text.replace('|', '').strip():  # 완전히 빈 행 제외
            lines.append(f"| {row_text} |")
    return lines


@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    user_pdf_dir = get_user_workspace(user_id=user_id, subfolder="pdf")
    file_path = os.path.join(user_pdf_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        t_start = time.time()
        response_data = []
        global_line_idx = 0
        
        with pdfplumber.open(file_path) as pdf:
            for idx, page in enumerate(pdf.pages):
                current_page_num = idx + 1
                page_elements = []  # (top_y_coordinate, list_of_text_lines) 형태 저장

                # 1. 페이지 내 표 탐지 및 Y좌표(bbox[1]) 기반 수집
                find_tables = page.find_tables()
                tables = page.extract_tables()
                table_bboxes = [table.bbox for table in find_tables]

                for f_table, raw_table in zip(find_tables, tables):
                    top_y = f_table.bbox[1]  # 표의 상단 Y좌표
                    formatted_lines = format_table_to_lines(raw_table)
                    if formatted_lines:
                        page_elements.append((top_y, formatted_lines))

                # 2. 표 영역 내부 문자는 제외하고 일반 텍스트 라인 추출
                def not_within_bboxes(obj):
                    def crop_bbox(bbox):
                        return (
                            obj["x0"] >= bbox[0] and obj["top"] >= bbox[1] and
                            obj["x1"] <= bbox[2] and obj["bottom"] <= bbox[3]
                        )
                    return not any(crop_bbox(bbox) for bbox in table_bboxes)

                non_table_page = page.filter(not_within_bboxes)
                
                # 라인별 위치 정보(top)를 보존하여 텍스트 추출
                words = non_table_page.extract_words()
                if words:
                    # Y좌표 오차(3px 내외)를 고려하여 같은 라인의 단어들끼리 그룹화
                    lines_by_y = {}
                    for word in words:
                        # 약 3 pixel 단위로 Y좌표 반올림하여 동일 행 그룹핑
                        y_key = round(word["top"] / 3.0) * 3.0
                        if y_key not in lines_by_y:
                            lines_by_y[y_key] = []
                        lines_by_y[y_key].append(word)

                    for y_key in sorted(lines_by_y.keys()):
                        line_words = lines_by_y[y_key]
                        # 좌측(x0) 기준 정렬 후 텍스트 결합
                        line_words.sort(key=lambda w: w["x0"])
                        line_text = " ".join([w["text"] for w in line_words]).strip()
                        if line_text:
                            actual_y = line_words[0]["top"]
                            page_elements.append((actual_y, [line_text]))

                # 3. 🎯 핵심: Y좌표(top_y) 기준 위에서 아래 순서로 모든 요소 정렬!
                page_elements.sort(key=lambda x: x[0])

                # 4. 정렬된 순서대로 response_data 생성
                for _, text_lines in page_elements:
                    for line in text_lines:
                        response_data.append({
                            "line_index": str(global_line_idx),
                            "text": line,
                            "is_split_point": False,
                            "is_deleted": False,
                            "page_number": current_page_num,
                            "source_filename": file.filename,
                            "user_id": user_id
                        })
                        global_line_idx += 1

        print(f"📑 [PDF 파싱 성공] 소요시간: {time.time() - t_start:.2f}초 | 정렬 완료 총 라인: {global_line_idx}개")
        return response_data

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        print(f"❌ PDF 파싱 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF 파싱 실패: {str(e)}")