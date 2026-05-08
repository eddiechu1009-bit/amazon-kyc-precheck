import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 需要子路徑，Netlify 用根路徑
// 透過環境變數 DEPLOY_TARGET 切換（預設為 github）
const deployTarget = process.env.DEPLOY_TARGET || 'github'

export default defineConfig({
  plugins: [react()],
  base: deployTarget === 'netlify' ? '/' : '/amazon-kyc-precheck/',
})
