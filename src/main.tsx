/**
 * @file main.tsx
 * @description 应用入口文件
 * 
 * @copyright 2025 panyushan. 保留所有权利
 * @license 专有软件，未经许可不得使用、复制或分发
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
