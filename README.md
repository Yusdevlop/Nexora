# Kapital — şəxsi maliyyə + dostlarla real-time qrup yığımı

PWA (Android telefonda "Ana ekrana əlavə et" ilə tətbiq kimi işləyir) · Supabase (cloud DB + Auth + Realtime) · React + TypeScript + Vite.

Bütün funksiyalar həqiqidir: qeydiyyat/giriş, gəlir/xərc/yığım, qruplar, məqsədlər, üzvlər, tarixçə, real-time sinxronizasiya, oflayn keş, PWA quraşdırma. Nümunə (dummy) məlumat yoxdur.

---

## 1. Quraşdırma (təxminən 10 dəqiqə)

### 1.1 Supabase layihəsi yarat
1. https://supabase.com → **Sign in** → **New project**.
2. Ad: `kapital`. Region: **Frankfurt (eu-central-1)** (Bakıya ən yaxın). Database password təyin et və saxla.
3. Layihə hazır olana qədər 1–2 dəqiqə gözlə.

### 1.2 Verilənlər bazasını qur
1. Supabase → sol menyu **SQL Editor** → **New query**.
2. `supabase/schema.sql` faylının **bütün** məzmununu yapışdır → **Run**.
3. "Success" görməlisən. (Təkrar işə salmaq təhlükəsizdir.)

Bu, cədvəlləri, təhlükəsizlik qaydalarını (RLS) və real-time-ı bir dəfəyə qurur.

### 1.3 Auth ayarları
- **Authentication → Sign In / Providers → Email**: aktiv olsun.
- Rahat test üçün **"Confirm email"** seçimini **söndür**. (Açıq qalsa, qeydiyyatdan sonra e-poçta gələn linkə toxunmaq lazımdır — tətbiq bunu düzgün göstərir.)
- **Authentication → URL Configuration**:
  - **Site URL**: tətbiqin ünvanı (məs. `https://kapital.vercel.app`; lokalda `http://localhost:5173`)
  - **Redirect URLs**: eyni ünvanları əlavə et.

### 1.4 API məlumatlarını götür
Supabase → **Project Settings (⚙️) → API Keys** (və ya yuxarıdakı **Connect** düyməsi):

| Nə lazımdır | Haradan | .env-də hara yazılır |
|---|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | Project Settings → API | `VITE_SUPABASE_URL` |
| **anon** açarı (`eyJ...`) və ya **publishable** açarı (`sb_publishable_...`) | Project Settings → API Keys | `VITE_SUPABASE_ANON_KEY` |

> ⚠️ `service_role` / `secret` açarını **heç vaxt** `.env`-ə yazma və kimsəyə vermə. Yalnız anon/publishable açar istifadə olunur; məlumatların qorunması RLS qaydaları ilə təmin olunur.

### 1.5 .env faylı
Layihənin kökündə `.env.example`-ı `.env` adı ilə kopyala və doldur:

```env
VITE_SUPABASE_URL=https://abcdxyz123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_ENABLE_GOOGLE_LOGIN=false
```

### 1.6 İşə sal
```bash
npm install
npm run dev
```
Brauzerdə `http://localhost:5173` aç. Qeydiyyatdan keç və istifadə et.

---

## 2. Telefonda yoxlamaq (PWA HTTPS tələb edir)

PWA-nın quraşdırılması üçün ünvan **HTTPS** olmalıdır (localhost yalnız eyni cihazda işləyir). Ən asan yol:

**Netlify Drop (koddan-asılı olmayan, 2 dəqiqə):**
1. `.env` doldurulmuş halda: `npm run build`
2. https://app.netlify.com/drop səhifəsinə `dist` qovluğunu sürüklə.
3. Verilən `https://...netlify.app` ünvanını 1.3-dəki **Site URL / Redirect URLs**-ə əlavə et.

**Vercel:** GitHub-a yüklə → vercel.com → Import → **Environment Variables**-a `VITE_SUPABASE_URL` və `VITE_SUPABASE_ANON_KEY` əlavə et → Deploy. (`vercel.json` hazırdır.)

**Android-də quraşdırma:** Chrome-da ünvanı aç → sağ üst **⋮** → **Ana ekrana əlavə et / Tətbiqi quraşdır**. Tətbiq öz ikonu ilə, brauzer paneli olmadan açılır. İkona uzun basanda **Xərc / Gəlir / Yığım əlavə et** qısayolları çıxır.

---

## 3. Real-time testi (iki hesabla)
1. İki fərqli cihazda/brauzerdə iki ayrı hesab yarat (məs. Yusif və Elvin).
2. Yusif: **Qruplar → Yeni qrup** (məs. "Biznes Kapitalı", hədəf 2000). Qrupun menyusundan **dəvət kodunu** göndər.
3. Elvin: **Qruplar → Kodla qoşul** → kodu yaz.
4. Yusif **Pul əlavə et → 100** yazır → Elvində dərhal **"Yusif +100 AZN əlavə etdi"** bildirişi çıxır və qrup balansı avtomatik dəyişir.

Real-time işləmirsə: Supabase → **Database → Publications → supabase_realtime** içində 5 cədvəl (`transactions, groups, group_members, group_goals, group_contributions`) görünməlidir.

---

## 4. Təhlükəsizlik modeli (schema.sql-də)
- `transactions` — yalnız sahibi oxuyur/yazır. Başqası görə bilməz.
- `groups`, `group_members`, `group_goals`, `group_contributions` — yalnız həmin qrupun üzvləri oxuyur. Qrupa yalnız dəvət kodu ilə (`join_group`) qoşulmaq olur.
- Üzv yalnız **öz adına** pul əlavə edə bilər; yalnız **öz payını** çıxara bilər; yalnız öz əlavəsini silə bilər.
- Qrupu yalnız sahibi silir; sahib qrupdan çıxa bilməz (silə bilər).
- Profil adı yalnız eyni qrupdakı üzvlərə görünür; e-poçt heç kimə göstərilmir.

Bu qaydalar real PostgreSQL-də (iki istifadəçi + kənar şəxslə) sınaqdan keçirilib.

---

## 5. Gələcək: Google ilə giriş
1. Supabase → **Authentication → Providers → Google** → aktiv et; Google Cloud Console-da OAuth client yarat və Client ID/Secret-i Supabase-ə yaz (Supabase səhifəsində göstərilən callback URL-i Google-a əlavə et).
2. `.env`-də `VITE_ENABLE_GOOGLE_LOGIN=true` → "Google ilə davam et" düyməsi görünür. Kodda dəyişiklik lazım deyil (`AuthContext.signInWithGoogle` hazırdır).

---

## 6. Gələcək: Android APK / AAB (Google Play)
Layihə Capacitor-a hazırdır (`capacitor.config.json`, `webDir: dist`).

```bash
npm i @capacitor/core @capacitor/android
npm i -D @capacitor/cli
npx cap add android
npm run build && npx cap sync android
npx cap open android      # Android Studio açılır → Build → Generate Signed Bundle / APK
```
Google Play üçün **AAB** yığılır, imzalanır (keystore-u itirmə!) və Play Console-a yüklənir (bir dəfəlik developer haqqı tələb olunur). Qeyd: Capacitor-da Google girişi üçün əlavə deep-link ayarı lazımdır; e-poçt/şifrə girişi olduğu kimi işləyir.

---

## 7. Layihə strukturu
```
supabase/schema.sql        # DB sxemi, RLS, funksiyalar, realtime
src/context/               # Auth, Data (transactions + groups, realtime)
src/lib/useCloud.ts        # oxu + oflayn keş + realtime + yenidən-görünəndə yenilə
src/pages/                 # Home, Transactions, Groups, GroupDetail, Profile, Auth
src/components/            # Sheet (alt panel), qrafik, sürətli əlavə və s.
vite.config.ts             # PWA: manifest.json, service worker, qısayollar
scripts/generate-icons.mjs # npm run icons — ikonları yenidən yaradır
```

## 8. Məlum məhdudiyyətlər / növbəti addımlar
- Oflayn rejimdə son məlumat görünür, lakin yeni əməliyyat əlavə etmək üçün internet lazımdır (oflayn növbə hələ yoxdur).
- Şifrəni unutdum axını və push bildirişlər hələ əlavə olunmayıb.
- iOS üçün splash şəkilləri hazırlanmayıb (Android Chrome splash-ı manifest-dən avtomatik yaradır).
