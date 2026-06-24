# koZan — Giriş Sayfası Tasarım Speci

**Tarih:** 2026-05-08  
**Branch:** backend → frontend branch oluşturulacak  
**Kapsam:** Giriş sayfası (web only), backend `username` alanı eklemesi

---

## 1. Genel Bakış

koZan uygulamasının web frontendinin ilk sayfası. Arı/petek teması, sarı renk paleti. Tek route (`/`) üzerinde 3 aşamalı animasyonlu akış. Kullanıcı giriş ve kayıt işlemlerini aynı sayfada toggle ile yapar.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Stil | Tailwind CSS 3 |
| Animasyon | Framer Motion 11 |
| State | Zustand 5 |
| HTTP | fetch (lib/api.ts wrapper) |
| Backend | NestJS (mevcut) |

---

## 3. Renk Paleti

| Kullanım | Değer |
|----------|-------|
| Sayfa arka planı | `#ffec8c` |
| Buton / vurgu | `#ffd000` |
| Buton hover | `#ffb700` |
| Input arka planı | `bg-yellow-100` (~`#fef9c3`) |
| Input border | `border-yellow-300` |

---

## 4. PNG Varlıkları

Tüm dosyalar `png/` klasöründen `frontend/public/images/` altına kopyalanır.

| Dosya | Kullanım yeri |
|-------|---------------|
| `beehive.png` | Aşama 1 — merkez buton |
| `koZanlogo.png` | Aşama 2+ — logo |
| `k.png o.png z.png a.png n.png` | Aşama 2+ — "k o z a n" harf dizisi |
| `bee.png` | Login sonrası sol nav butonu |
| `beehiveee.png` | Login sonrası sağ nav butonu |

---

## 5. Backend Değişiklikleri

### 5.1 Prisma Şeması (`backend/prisma/schema.prisma`)

`User` modeline eklenir:
```prisma
username  String   @unique
@@index([username])
```

Migration: `npx prisma migrate dev --name add_username`

### 5.2 RegisterDto (`backend/src/auth/dto/register.dto.ts`)

Yeni alan:
```typescript
@IsString()
@MinLength(3)
@MaxLength(20)
@Matches(/^[a-z0-9_]+$/, { message: 'Sadece küçük harf, rakam ve alt çizgi kullanılabilir.' })
username: string;
```

### 5.3 UsersService (`backend/src/users/users.service.ts`)

- `findByUsername(username: string)` metodu eklenir
- `create()` `username` alanını alır ve kaydeder

### 5.4 AuthService (`backend/src/auth/auth.service.ts`)

- `register()`: `usersService.create()` öncesinde `findByUsername()` kontrolü → çakışma varsa `ConflictException('Bu kullanıcı adı zaten alınmış.')`
- `issueTokenPair()`: imza `(userId, email, username)` olur, return `{ access_token, refresh_token, username }`
- `login()` → `issueTokenPair` çağrısına `user.username` eklenir

---

## 6. Frontend Proje Yapısı

```
koZan/
└── frontend/
    ├── public/
    │   └── images/              ← png/ klasöründeki tüm .png'ler
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx           ← global font, bg #ffec8c
    │   │   ├── page.tsx             ← login sayfası (/)
    │   │   ├── personal-room/
    │   │   │   └── page.tsx         ← placeholder
    │   │   └── community/
    │   │       └── page.tsx         ← placeholder
    │   ├── components/
    │   │   └── login/
    │   │       ├── BeehiveButton.tsx
    │   │       ├── LogoSection.tsx
    │   │       ├── AuthForm.tsx
    │   │       └── NavButtons.tsx
    │   ├── store/
    │   │   └── authStore.ts         ← Zustand
    │   └── lib/
    │       └── api.ts               ← fetch wrapper
    ├── tailwind.config.ts
    └── package.json
```

---

## 7. Sayfa State Machine

Sayfa 3 aşamalı bir state machine olarak çalışır: `idle → revealing → auth | loggedIn`

### 7.1 `idle` — Başlangıç

- Ekran ortasında `beehive.png` (Next.js `<Image>`, `w-48 h-48`)
- **Hover:** `scale: 1.08`, `transition: 0.2s ease`
- **Tıklama:** `revealing` aşamasına geçer

### 7.2 `revealing` — Geçiş Animasyonu

Framer Motion `AnimatePresence` yönetir:

1. `beehive.png` → `scale 1 → 1.15 → 0`, `opacity 1 → 0` — `0.5s`
2. `koZanlogo.png` + harf PNG'leri (`k o z a n`, `gap-2` ile yatay dizi) → `opacity 0 → 1`, `y 10 → 0` — `0.4s`
3. Form alanları → `opacity 0 → 1`, `y 20 → 0`, `delay: 0.1s` — `0.3s`

### 7.3 `auth` — Form Görünümü

**Toggle sekmeler:**
- Pill şeklinde `Giriş Yap` / `Kayıt Ol` — aktif sekme `bg-[#ffd000]`, pasif `bg-yellow-100`

**Giriş formu alanları:**
- E-posta
- Şifre

**Kayıt formu alanları:**
- E-posta
- Kullanıcı adı (`@` prefix gösterilir, gri `@` simgesi input başında)
- Ad Soyad
- Şifre

**Input stili:**
```
bg-yellow-100  rounded-2xl  border border-yellow-300
px-4 py-3  w-full  outline-none
focus:border-[#ffd000] transition
```

**Submit butonu:**
```
bg-[#ffd000]  rounded-2xl  w-full  py-3
hover:bg-[#ffb700]  transition  font-semibold
```

**Hata mesajları:** inputun altında `text-red-500 text-sm`

**API çağrıları (`lib/api.ts`):**
- `POST /auth/login` → `{ email, password }` → `{ access_token, refresh_token, username }`
- `POST /auth/register` → `{ email, username, name, password }` → başarıda `{ message }` döner, **otomatik login yapılmaz**
- `POST /auth/verify-email` → `{ email, code }` → `{ access_token, refresh_token, username }`

**Kayıt sonrası e-posta doğrulama akışı:**
Backend kayıt sonrası e-posta doğrulaması gerektiriyor (`isEmailVerified` kontrolü). Kayıt başarılı olursa form yerinde değişir: 6 haneli OTP input + "Kodunuzu girin" açıklaması görünür. Kullanıcı kodu girince `POST /auth/verify-email` çağrılır, başarıda `loggedIn` state'ine geçilir.

**Zustand store (`authStore.ts`):**
```typescript
interface AuthState {
  username: string | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  setAuth: (username: string, token: string) => void;
  logout: () => void;
}
```
`accessToken` localStorage'a da yazılır (hydration için).

### 7.4 `loggedIn` — Giriş Sonrası

- Form `opacity 0` ile kaybolur
- `k o z a n` harfleri `opacity 0` olur, yerlerine **"Hoşgeldin, [username]"** `opacity 0 → 1` ile belirir
- `koZanlogo.png` aynı yerde sabit kalır
- İki yuvarlak nav butonu `scale 0 → 1` "pop" animasyonuyla çıkar:

**Sol buton — Kişisel Oda:**
- `w-28 h-28`, `rounded-full`
- İçinde `bee.png` (`w-14 h-14`)
- Altında "Kişisel Oda" `text-sm font-medium`
- `bg-yellow-100 border-2 border-[#ffd000]`
- Hover: `scale: 1.05`
- Click: `router.push('/personal-room')`

**Sağ buton — Topluluk Odaları:**
- Aynı stil
- İçinde `beehiveee.png`
- Altında "Topluluk Odaları"
- Click: `router.push('/community')`

---

## 8. Placeholder Sayfalar

`/personal-room` ve `/community` şimdilik boş sayfa döner, sonraki sprintlerde doldurulur.

---

## 9. Kapsam Dışı

- Refresh token yönetimi (sonraki sprint)
- E-posta doğrulama UI (backend var, UI sonra)
- Responsive / mobil optimizasyon (şimdilik desktop-first)
- Dark mode
