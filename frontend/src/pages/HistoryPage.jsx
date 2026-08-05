import React from 'react';

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#ffffff',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f1f5f9'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  emptyCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #e2e8f0',
    borderRadius: '16px',
    backgroundColor: '#f8fafc',
    color: '#64748b'
  }
};

function HistoryPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <span>🧬</span>
          <span style={{ color: '#2563eb' }}>AI Meow</span> 정제 히스토리 조회
        </h2>
      </div>

      <div style={styles.emptyCard}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📜</div>
        <p style={{ fontWeight: '700', fontSize: '16px', color: '#334155', margin: '0 0 6px 0' }}>
          저장된 정제 히스토리가 없습니다.
        </p>
        <p style={{ fontSize: '13px', margin: 0 }}>
          스마트 청킹 매니저에서 문서를 적재하면 이곳에서 이력을 확인할 수 있다냥!
        </p>
      </div>
    </div>
  );
}

export default HistoryPage;