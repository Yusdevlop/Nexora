import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import { Shell, PENDING_JOIN_KEY } from './components/Shell'
import { LogoMark } from './components/Logo'
import Auth from './pages/Auth'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import Profile from './pages/Profile'
import Analysis from './pages/Analysis'
import JoinRoute from './pages/JoinRoute'
import NoAccess from './pages/NoAccess'
import { CLAUDE_MODE } from './lib/mode'

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Yüklənir">
      <LogoMark size={96} />
      <span className="splash-name">Kapital</span>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Giriş etməmiş adam dəvət linkinə toxunubsa, kodu saxla — girişdən sonra qoşulacaq
  useEffect(() => {
    const m = location.pathname.match(/^\/join\/([A-Za-z0-9]+)/)
    if (m && !session && !loading) localStorage.setItem(PENDING_JOIN_KEY, m[1].toUpperCase())
  }, [location.pathname, session, loading])

  if (!isConfigured) return <Setup />
  if (loading) return <Splash />
  if (!session) return CLAUDE_MODE ? <NoAccess /> : <Auth />

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="join/:code" element={<JoinRoute />} />
        <Route path="profile" element={<Profile />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
