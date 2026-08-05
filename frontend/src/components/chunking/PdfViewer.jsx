import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// 🎯 pdf.worker CDN 스크립트 매핑
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const styles = {
  leftPanel: { 
    height: '100%', 
    backgroundColor: '#334155', 
    borderRadius: '16px', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'flex-start', 
    color: '#94a3b8',
    border: '1px solid #475569',
    boxSizing: 'border-box',
    overflowY: 'auto',
    padding: '20px 10px',
    position: 'relative'
  },
  pdfPageIndicator: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: '6px 16px',
    borderRadius: '20px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    zIndex: 100,
    pointerEvents: 'auto', 
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    userSelect: 'none'
  },
  navBtn: (disabled) => ({
    background: 'none',
    border: 'none',
    color: disabled ? '#64748b' : '#ffffff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    padding: '0 6px'
  })
};

function PdfViewer({ pdfFile, leftWidth, activePage, setActivePage, numPages, setNumPages }) {
  return (
    <div style={{ ...styles.leftPanel, width: `${leftWidth}%` }}>
      <Document
        file={pdfFile}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<div style={{ color: '#94a3b8', marginTop: '40px' }}>PDF 로드 중...</div>}
      >
        <Page 
          key={activePage}
          pageNumber={activePage} 
          width={window.innerWidth * (leftWidth / 100) * 0.88}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
      
      {numPages && (
        <div style={styles.pdfPageIndicator}>
          <button 
            onClick={() => setActivePage(prev => Math.max(prev - 1, 1))}
            disabled={activePage === 1}
            style={styles.navBtn(activePage === 1)}
          >
            ◀
          </button>
          <span>📄 {activePage} / {numPages} Page</span>
          <button 
            onClick={() => setActivePage(prev => Math.min(prev + 1, numPages))}
            disabled={activePage === numPages}
            style={styles.navBtn(activePage === numPages)}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

export default PdfViewer;