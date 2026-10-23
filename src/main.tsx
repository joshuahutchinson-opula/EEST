import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/inter/900.css'
import './index.css'
import App from './App.tsx'

// Error monitoring, on only when VITE_SENTRY_DSN is set (loaded on demand, so it costs nothing otherwise).
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  import('@sentry/react').then((Sentry) => Sentry.init({ dsn: sentryDsn, environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
