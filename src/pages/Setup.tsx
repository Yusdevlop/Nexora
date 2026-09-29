import { LogoMark } from '../components/Logo'

export default function Setup() {
  return (
    <main className="auth">
      <div className="auth-hero">
        <LogoMark size={72} />
        <h1>Bir addım qalıb</h1>
        <p>Supabase bağlantısı hələ qurulmayıb.</p>
      </div>
      <div className="card auth-card">
        <ol className="setup-steps">
          <li>
            Saytın qovluğunda <code>config.js</code> faylını Notepad ilə açın.
          </li>
          <li>
            Supabase → <b>Project Settings → API</b> bölməsindən <code>Project URL</code> və <code>anon</code> (və ya publishable) açarını kopyalayın.
          </li>
          <li>
            <code>SUPABASE_URL</code> və <code>SUPABASE_ANON_KEY</code> sətirlərindəki dırnaqların içinə yazın, faylı saxlayın.
          </li>
          <li>
            Qovluğu Netlify-a yenidən atın (və ya kompüterdə işləyirsinizsə <code>.env</code> faylını doldurub serveri yenidən başladın).
          </li>
          <li>
            Supabase <b>SQL Editor</b>-da <code>schema.sql</code> faylını bir dəfə işlədin.
          </li>
        </ol>
      </div>
    </main>
  )
}
