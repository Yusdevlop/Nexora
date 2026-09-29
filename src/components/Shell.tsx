import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { AddTransactionSheet } from './AddTransactionSheet'
import { AddContext } from '../context/AddContext'
import { TransactionsProvider, GroupsProvider } from '../context/DataContext'
import { CategoriesProvider } from '../context/CategoriesContext'
import { RecurringProvider } from '../context/RecurringContext'
import { useOnline } from '../lib/pwa'
import type { TxType } from '../lib/types'

export const PENDING_JOIN_KEY = 'kapital:pendingJoin'

function Frame() {
  const online = useOnline()
  const location = useLocation()
  const navigate = useNavigate()
  const [add, setAdd] = useState<{ open: boolean; type: TxType }>({ open: false, type: 'expense' })

  const openAdd = useCallback((type: TxType = 'expense') => setAdd({ open: true, type }), [])

  // PWA qısayolları: /?add=expense|income|saving
  useEffect(() => {
    const p = new URLSearchParams(location.search).get('add')
    if (p === 'expense' || p === 'income' || p === 'saving') {
      openAdd(p)
      navigate(location.pathname, { replace: true })
    }
  }, [location.search, location.pathname, navigate, openAdd])

  // Giriş etməmişdən əvvəl açılmış dəvət linki
  useEffect(() => {
    const code = localStorage.getItem(PENDING_JOIN_KEY)
    if (code) {
      localStorage.removeItem(PENDING_JOIN_KEY)
      navigate(`/join/${code}`, { replace: true })
    }
  }, [navigate])

  return (
    <AddContext.Provider value={openAdd}>
      <div className="app">
        {!online && (
          <div className="offline-bar" role="status">
            <Icon name="wifioff" size={16} /> Oflayn rejim — son yadda qalan məlumat göstərilir
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>

        <nav className="tabbar" aria-label="Əsas naviqasiya">
          <NavLink to="/" end className="tab">
            <Icon name="home" />
            <span>Ana</span>
          </NavLink>
          <NavLink to="/transactions" className="tab">
            <Icon name="list" />
            <span>Əməliyyat</span>
          </NavLink>
          <button className="fab" onClick={() => openAdd()} aria-label="Əməliyyat əlavə et">
            <Icon name="plus" size={28} />
          </button>
          <NavLink to="/groups" className="tab">
            <Icon name="users" />
            <span>Qruplar</span>
          </NavLink>
          <NavLink to="/profile" className="tab">
            <Icon name="user" />
            <span>Profil</span>
          </NavLink>
        </nav>

        <AddTransactionSheet open={add.open} initialType={add.type} onClose={() => setAdd((a) => ({ ...a, open: false }))} />
      </div>
    </AddContext.Provider>
  )
}

export function Shell() {
  return (
    <CategoriesProvider>
      <TransactionsProvider>
        <RecurringProvider>
          <GroupsProvider>
            <Frame />
          </GroupsProvider>
        </RecurringProvider>
      </TransactionsProvider>
    </CategoriesProvider>
  )
}
