import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 외부 접근 허용 (--host와 동일)
    // 🎯 [핵심]: 외부 DDNS 도메인 접근 허용 목록 추가
    allowedHosts: [
      'aimeow.ddns.net',
      '.ddns.net' // ddns 서브도메인 전체를 와일드카드로 허용하고 싶을 경우
    ]
  }
})