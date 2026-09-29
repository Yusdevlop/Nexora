import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { CLAUDE_MODE } from './lib/mode'
import './fonts.css'
import './styles.css'
import './lib/pwa' // beforeinstallprompt hadisəsini erkən tutmaq üçün
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { UpdateGate } from './components/UpdateGate'

// Claude-hosted səhifədə yol (path) naməlumdur, ona görə hash-router
const Router = CLAUDE_MODE ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <UpdateGate />
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </Router>
  </StrictMode>
)
