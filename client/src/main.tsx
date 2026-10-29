import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { marked } from 'marked'
import './index.css'
import App from './App.tsx'

(window as any).marked = marked;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
