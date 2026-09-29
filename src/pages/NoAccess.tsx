import { LogoMark } from '../components/Logo'

export default function NoAccess() {
  return (
    <main className="auth">
      <div className="auth-hero">
        <LogoMark size={72} />
        <h1>Kapital</h1>
        <p>Yaddaş bağlantısı qurula bilmədi.</p>
      </div>
      <div className="card auth-card">
        <p>
          Bu səhifə yalnız <b>claude.ai</b>-da, hesabınıza daxil olmuş halda açılanda məlumat saxlaya bilir. Səhifəni birbaşa link kimi
          (çıxış etmiş və ya başqa təşkilatdan) açmısınızsa, claude.ai-a daxil olub yenidən cəhd edin.
        </p>
      </div>
    </main>
  )
}
