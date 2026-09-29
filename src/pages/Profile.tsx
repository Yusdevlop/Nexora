import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icon'
import { LogoMark } from '../components/Logo'
import { CategoryManageSheet } from '../components/CategoryManageSheet'
import { RecurringSheet } from '../components/RecurringSheet'
import { friendlyError } from '../lib/format'
import { useInstall } from '../lib/pwa'
import { CLAUDE_MODE } from '../lib/mode'
import type { TxType } from '../lib/types'

export default function Profile() {
  const { user, displayName, updateName, signOut } = useAuth()
  const toast = useToast()
  const { canInstall, installed, install } = useInstall()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName)
  const [busy, setBusy] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [manageCatType, setManageCatType] = useState<TxType | null>(null)
  const [manageRecurring, setManageRecurring] = useState(false)

  const save = async () => {
    if (name.trim().length < 2) return toast('Ad ən azı 2 hərf olmalıdır', 'error')
    setBusy(true)
    try {
      await updateName(name)
      toast('Ad yeniləndi', 'success')
      setEditing(false)
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Profil</h1>
      </header>

      <section className="card profile-card">
        <span className="avatar big" aria-hidden>
          {(displayName.charAt(0) || '?').toLocaleUpperCase('az')}
        </span>
        {editing ? (
          <div className="inline-edit">
            <input className="field" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
            <button className="btn btn-primary small" disabled={busy} onClick={() => void save()}>
              Saxla
            </button>
          </div>
        ) : (
          <div className="profile-name">
            <strong>{displayName}</strong>
            <button
              className="icon-btn"
              aria-label="Adı dəyiş"
              onClick={() => {
                setName(displayName)
                setEditing(true)
              }}
            >
              <Icon name="edit" size={18} />
            </button>
          </div>
        )}
        {user?.email && <small className="muted">{user.email}</small>}
      </section>

      <section>
        <div className="section-head">
          <h2>Analiz və planlama</h2>
        </div>
        <div className="card list">
          <Link to="/analysis" className="setting">
            <span className="setting-ico emoji">📊</span>
            <span className="setting-main">
              <strong>Analiz</strong>
              <small>Kateqoriya paylanması, trend və tövsiyələr</small>
            </span>
            <Icon name="next" size={18} />
          </Link>
          <button className="setting" onClick={() => setManageCatType('expense')}>
            <span className="setting-ico emoji">🍽️</span>
            <span className="setting-main">
              <strong>Xərc kateqoriyaları</strong>
              <small>Əlavə et, rəng/ikon/limit təyin et</small>
            </span>
            <Icon name="next" size={18} />
          </button>
          <button className="setting" onClick={() => setManageCatType('income')}>
            <span className="setting-ico emoji">💼</span>
            <span className="setting-main">
              <strong>Gəlir kateqoriyaları</strong>
            </span>
            <Icon name="next" size={18} />
          </button>
          <button className="setting" onClick={() => setManageCatType('saving')}>
            <span className="setting-ico emoji">🐷</span>
            <span className="setting-main">
              <strong>Yığım kateqoriyaları</strong>
            </span>
            <Icon name="next" size={18} />
          </button>
          <button className="setting" onClick={() => setManageRecurring(true)}>
            <span className="setting-ico emoji">🔁</span>
            <span className="setting-main">
              <strong>Təkrarlanan əməliyyatlar</strong>
              <small>Maaş, kirayə kimi hər ay avtomatik əlavə olunanlar</small>
            </span>
            <Icon name="next" size={18} />
          </button>
        </div>
      </section>

      <section className="card list">
        {!CLAUDE_MODE && (
        <div className="setting">
            <span className="setting-ico">
              <LogoMark size={36} />
            </span>
            <span className="setting-main">
              <strong>Telefon tətbiqi</strong>
              <small>{installed ? 'Quraşdırılıb — ana ekrandan açırsınız' : canInstall ? 'Ana ekrana quraşdırın' : 'Chrome menyusu (⋮) → “Ana ekrana əlavə et”'}</small>
            </span>
            {canInstall && !installed && (
              <button className="btn btn-primary small" onClick={() => void install()}>
                Quraşdır
              </button>
            )}
          </div>
        )}
        <div className="setting">
          <span className="setting-ico emoji">🌗</span>
          <span className="setting-main">
            <strong>Görünüş</strong>
            <small>Telefonun açıq/tünd rejiminə avtomatik uyğunlaşır</small>
          </span>
        </div>
        <div className="setting">
          <span className="setting-ico emoji">☁️</span>
          <span className="setting-main">
            <strong>Cloud sinxronizasiya</strong>
            <small>{CLAUDE_MODE ? 'Şəxsi əməliyyatlar Claude hesabınıza bağlı, yalnız sizə görünən yaddaşda saxlanır' : 'Məlumatlarınız bütün cihazlarda eynidir və yalnız sizə görünür'}</small>
          </span>
        </div>
      </section>

      {!CLAUDE_MODE && (
      <button
        className={`btn ${confirmOut ? 'btn-danger' : 'btn-soft'}`}
        onClick={() => {
          if (!confirmOut) return setConfirmOut(true)
          void signOut()
        }}
      >
        <Icon name="logout" size={18} /> {confirmOut ? 'Çıxışı təsdiq et' : 'Hesabdan çıx'}
      </button>
      )}
      <p className="auth-foot">Kapital v1.0</p>

      <CategoryManageSheet open={manageCatType !== null} onClose={() => setManageCatType(null)} type={manageCatType ?? 'expense'} />
      <RecurringSheet open={manageRecurring} onClose={() => setManageRecurring(false)} />
    </div>
  )
}
