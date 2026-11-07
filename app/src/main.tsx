import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { ToastProvider } from './components/feedback'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)

const loader = document.getElementById('app-loader')
if (loader) {
  let seen = false
  try {
    seen = sessionStorage.getItem('bbp-intro-seen') === '1'
    sessionStorage.setItem('bbp-intro-seen', '1')
  } catch {
    // The intro still works when storage is unavailable.
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.setTimeout(() => {
    loader.classList.add('is-exiting')
    loader.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('is-booting')
    window.setTimeout(() => loader.remove(), reduced ? 150 : 720)
  }, seen || reduced ? 120 : 1350)
}
