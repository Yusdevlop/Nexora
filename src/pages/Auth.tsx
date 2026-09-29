import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/format'
import { Icon } from '../components/Icon'
import { LogoMark } from '../components/Logo'

const GOOGLE = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true'

export default function Auth() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    setInfo('')
    if (mode === 'signup' && name.trim().length < 2) return setErr('Adınızı yazın.')
    if (password.length < 6) return setErr('Şifrə ən azı 6 simvol olmalıdır.')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const { needsConfirm } = await signUp(name, email, password)
        if (needsConfirm) {
          setInfo('Qeydiyyat tamamlandı. E-poçtunuza göndərilən təsdiq linkinə toxunun, sonra giriş edin.')
          setMode('login')
        }
      }
    } catch (e) {
      setErr(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-hero">
        <LogoMark size={72} />
        <h1>Kapital</h1>
        <p>Pulunuzu izləyin, dostlarla birgə hədəfə çatın.</p>
      </div>

      <form className="card auth-card" onSubmit={submit} noValidate>
        <div className="segmented two" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
            Giriş
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>
            Qeydiyyat
          </button>
        </div>

        {mode === 'signup' && (
          <label className="label">
            Adınız
            <input className="field" autoComplete="name" placeholder="Məs. Yusif" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="label">
          E-poçt
          <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="ad@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="label">
          Şifrə
          <span className="pw">
            <input
              className="field"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Ən azı 6 simvol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Şifrəni gizlət' : 'Şifrəni göstər'}>
              <Icon name={show ? 'eyeoff' : 'eye'} size={20} />
            </button>
          </span>
        </label>

        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
        {info && <p className="form-info">{info}</p>}

        <button className="btn btn-primary" disabled={busy || !email || !password}>
          {busy ? 'Gözləyin…' : mode === 'login' ? 'Daxil ol' : 'Hesab yarat'}
        </button>

        {GOOGLE && (
          <button type="button" className="btn btn-soft" onClick={() => signInWithGoogle().catch((e) => setErr(friendlyError(e)))}>
            Google ilə davam et
          </button>
        )}
      </form>
      <p className="auth-foot">Məlumatlarınız cloud-da saxlanır və yalnız sizə görünür.</p>
    </main>
  )
}
