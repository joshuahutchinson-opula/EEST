import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Chromium's PWA title bar appends the page <title> after the manifest "name" unless they
// match exactly — so when running installed/pinned (standalone display mode), swap the title
// to match the manifest's "name" verbatim. Normal browser tabs keep the full <title> from
// index.html since display-mode is never "standalone" there.
if (window.matchMedia("(display-mode: standalone)").matches) {
  document.title = "Operations Center";
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
