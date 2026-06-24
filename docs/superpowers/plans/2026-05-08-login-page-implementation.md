# koZan Giriş Sayfası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend'e `username` alanı ekle ve koZan web frontendinin arı temalı, animasyonlu giriş sayfasını sıfırdan oluştur.

**Architecture:** Next.js 15 App Router + Framer Motion animasyonları + Zustand auth state. Sayfa `idle → revealing → auth → loggedIn` state machine'i ile çalışır. Backend NestJS'te `username` unique alanı ve login response'unda `username` dönüşü eklenir.

**Tech Stack:** NestJS (backend), Prisma, Next.js 15, Tailwind CSS 3, Framer Motion 11, Zustand 5

**Portlar:** Backend `http://localhost:3000`, Frontend `http://localhost:3001`

---

## Dosya Haritası

### Backend (değişecek dosyalar)
- `backend/prisma/schema.prisma` — `username` alanı eklenir
- `backend/src/auth/dto/register.dto.ts` — `username` alanı eklenir
- `backend/src/users/users.service.ts` — `findByUsername()` ve `create()` güncellenir
- `backend/src/auth/auth.service.ts` — `register()` ve `issueTokenPair()` güncellenir

### Frontend (yeni dosyalar)
- `frontend/` — Next.js 15 projesi
- `frontend/public/images/` — tüm PNG varlıkları
- `frontend/src/app/layout.tsx` — global layout, sarı arka plan
- `frontend/src/app/page.tsx` — giriş sayfası state machine
- `frontend/src/app/personal-room/page.tsx` — placeholder
- `frontend/src/app/community/page.tsx` — placeholder
- `frontend/src/components/login/BeehiveButton.tsx` — hover/click animasyonlu petek butonu
- `frontend/src/components/login/LogoSection.tsx` — logo + k o z a n harfleri
- `frontend/src/components/login/AuthForm.tsx` — giriş/kayıt/OTP form toggle
- `frontend/src/components/login/NavButtons.tsx` — login sonrası 2 yuvarlak buton
- `frontend/src/store/authStore.ts` — Zustand auth state
- `frontend/src/lib/api.ts` — fetch wrapper

---

## Task 1: Prisma Şemasına `username` Ekle

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: `username` alanını şemaya ekle**

`backend/prisma/schema.prisma` dosyasında `User` modelini şu şekilde güncelle:

```prisma
model User {
  id                      String         @id @default(uuid())
  email                   String         @unique
  username                String         @unique
  password                String
  name                    String
  role                    Role           @default(BEGINNER)
  xp                      Int            @default(0)
  isEmailVerified         Boolean        @default(false)
  emailVerificationCode   String?
  emailVerificationExpiry DateTime?
  createdAt               DateTime       @default(now())
  rooms                   Room[]
  questions               Question[]
  questionVotes           QuestionVote[]
  answers                 Answer[]
  noteUnits               NoteUnit[]
  refreshTokens           RefreshToken[]

  @@index([email])
  @@index([username])
}
```

- [ ] **Step 2: Migration oluştur ve çalıştır**

```bash
cd backend
npx prisma migrate dev --name add_username_to_user
```

Beklenen çıktı:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied from new schema changes:
migrations/
  └─ 20260508xxxxxx_add_username_to_user/
    └─ migration.sql
```

> **Not:** Eğer veritabanında mevcut `User` kaydı varsa migration başarısız olur çünkü `username` `NOT NULL`. O durumda dev veritabanını sıfırla: `npx prisma migrate reset` (bütün verileri siler, sadece geliştirme ortamında yap).

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add unique username field to User model"
```

---

## Task 2: UsersService'e `findByUsername` ve `username` Desteği Ekle

**Files:**
- Modify: `backend/src/users/users.service.ts`

- [ ] **Step 1: `users.service.ts` dosyasını güncelle**

`backend/src/users/users.service.ts` dosyasını tamamen şu içerikle yaz:

```typescript
import { Injectable } from '@nestjs/common';
import { RoomType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: { email: string; password: string; name: string; username: string }) {
    return this.prisma.user.create({ data });
  }

  async setVerificationCode(email: string, code: string, expiry: Date) {
    return this.prisma.user.update({
      where: { email },
      data: { emailVerificationCode: code, emailVerificationExpiry: expiry },
    });
  }

  async verifyEmail(email: string) {
    return this.prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });
  }

  async createPersonalRoom(userId: string, userName: string) {
    return this.prisma.room.create({
      data: { title: `${userName}'ın Odası`, type: RoomType.PERSONAL, ownerId: userId },
    });
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async deleteRefreshToken(tokenHash: string) {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async deleteAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async deleteExpiredRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }
}
```

- [ ] **Step 2: Backend'i derle, hata yok mu kontrol et**

```bash
cd backend
npm run build
```

Beklenen çıktı: hatasız derleme, `dist/` güncellenir.

- [ ] **Step 3: Commit**

```bash
git add backend/src/users/users.service.ts
git commit -m "feat(users): add findByUsername and username to create()"
```

---

## Task 3: RegisterDto + AuthService `username` Desteği

**Files:**
- Modify: `backend/src/auth/dto/register.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: `register.dto.ts` güncelle**

`backend/src/auth/dto/register.dto.ts` dosyasını şu içerikle yaz:

```typescript
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' })
  @MaxLength(20, { message: 'Kullanıcı adı en fazla 20 karakter olabilir.' })
  @Matches(/^[a-z0-9_]+$/, { message: 'Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir.' })
  username: string;

  @IsString()
  @MinLength(2, { message: 'İsim en az 2 karakter olmalıdır.' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_])[A-Za-z\d!@#$%^&*(),.?":{}|<>\-_]{8,}$/, {
    message: 'Şifre en az 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir.',
  })
  password: string;
}
```

- [ ] **Step 2: `auth.service.ts` güncelle**

`backend/src/auth/auth.service.ts` dosyasını şu içerikle yaz:

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MAIL_QUEUE, type VerificationMailJob } from '../mail/mail.processor';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailValidatorService } from './services/email-validator.service';

@Injectable()
export class AuthService {
  private readonly refreshExpiresDays: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailValidator: EmailValidatorService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    config: ConfigService,
  ) {
    this.refreshExpiresDays = config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 7);
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) throw new ConflictException('Bu e-posta zaten kayıtlı.');

    const existingUsername = await this.usersService.findByUsername(dto.username);
    if (existingUsername) throw new ConflictException('Bu kullanıcı adı zaten alınmış.');

    await this.emailValidator.validate(dto.email);

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      name: dto.name,
      password: hashed,
    });

    await this.usersService.createPersonalRoom(user.id, user.name);

    const code = this.generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setVerificationCode(user.email, code, expiry);

    await this.mailQueue.add('send-verification', {
      to: user.email,
      name: user.name,
      code,
    } satisfies VerificationMailJob);

    return { message: 'Kayıt başarılı. E-posta adresinize doğrulama kodu gönderildi.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Geçersiz istek.');

    if (user.isEmailVerified) return { message: 'E-posta zaten doğrulanmış.' };

    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpiry ||
      user.emailVerificationCode !== dto.code ||
      user.emailVerificationExpiry < new Date()
    ) {
      throw new BadRequestException('Doğrulama kodu geçersiz veya süresi dolmuş.');
    }

    await this.usersService.verifyEmail(user.email);
    return this.issueTokenPair(user.id, user.email, user.username);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Lütfen önce e-posta adresinizi doğrulayın.');
    }

    await this.usersService.deleteExpiredRefreshTokens(user.id);

    return this.issueTokenPair(user.id, user.email, user.username);
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.usersService.findRefreshToken(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.usersService.deleteRefreshToken(tokenHash);
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş.');
    }

    await this.usersService.deleteRefreshToken(tokenHash);
    return this.issueTokenPair(stored.user.id, stored.user.email, stored.user.username);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.usersService.deleteRefreshToken(tokenHash);
    return { message: 'Çıkış yapıldı.' };
  }

  async logoutAll(userId: string) {
    await this.usersService.deleteAllRefreshTokens(userId);
    return { message: 'Tüm oturumlar kapatıldı.' };
  }

  // ── Yardımcılar ─────────────────────────────────────────────────────────────

  private async issueTokenPair(userId: string, email: string, username: string) {
    const access_token = this.jwtService.sign({ sub: userId, email, username });

    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(
      Date.now() + this.refreshExpiresDays * 24 * 60 * 60 * 1000,
    );
    await this.usersService.saveRefreshToken(userId, tokenHash, expiresAt);

    return { access_token, refresh_token: rawRefresh, username };
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

- [ ] **Step 3: Backend'i derle**

```bash
cd backend
npm run build
```

Beklenen: hata yok.

- [ ] **Step 4: Dev modda çalıştır ve Swagger'da test et**

```bash
cd backend
npm run start:dev
```

Tarayıcıda `http://localhost:3000/api/docs` aç. `POST /auth/register` endpoint'inde artık `username` alanı görünmeli. `POST /auth/login` response'unda `username` dönmeli.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/dto/register.dto.ts backend/src/auth/auth.service.ts
git commit -m "feat(auth): add username to register, login response, and token pair"
```

---

## Task 4: Next.js Projesi Oluştur

**Files:**
- Create: `frontend/` (tüm Next.js proje dizini)

- [ ] **Step 1: Next.js projesini oluştur**

```bash
cd "c:/Users/Göksu/OneDrive/Desktop/koZan"
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack
```

Sorularsa çıkarsa: `Yes` her şeye (TypeScript, Tailwind, ESLint, App Router, src/ dizini zaten flag'lerle seçildi).

- [ ] **Step 2: Framer Motion ve Zustand yükle**

```bash
cd frontend
npm install framer-motion zustand
```

- [ ] **Step 3: PNG dosyalarını kopyala**

```bash
cd "c:/Users/Göksu/OneDrive/Desktop/koZan"
mkdir -p frontend/public/images
cp png/*.png frontend/public/images/
```

- [ ] **Step 4: Next.js'in varsayılan example dosyalarını temizle**

`frontend/src/app/page.tsx` içeriğini şu basit içerikle değiştir (animasyonlu içerik sonraki task'ta gelecek):

```tsx
export default function Home() {
  return <main />;
}
```

`frontend/src/app/globals.css` içeriğini şu şekilde yap (Tailwind direktifleri yeter):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Dev sunucusunun ayakta kalktığını kontrol et**

```bash
cd frontend
npm run dev -- --port 3001
```

`http://localhost:3001` adresini aç — boş beyaz sayfa görünmeli. `Ctrl+C` ile kapat.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/Göksu/OneDrive/Desktop/koZan"
git add frontend/
git commit -m "feat(frontend): initialize Next.js 15 project with Tailwind and Framer Motion"
```

---

## Task 5: Global Layout + Tailwind Renk Konfigürasyonu

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: `tailwind.config.ts` güncelle**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        honey: {
          light: '#ffec8c',
          DEFAULT: '#ffd000',
          dark: '#ffb700',
          input: '#fef9c3',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 2: `layout.tsx` güncelle**

`frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'koZan',
  description: 'Birlikte çalış, birlikte öğren.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body
        className={`${inter.className} min-h-screen`}
        style={{ backgroundColor: '#ffec8c' }}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/tailwind.config.ts
git commit -m "feat(frontend): configure honey yellow theme and global layout"
```

---

## Task 6: Zustand Auth Store + API Lib

**Files:**
- Create: `frontend/src/store/authStore.ts`
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: `authStore.ts` oluştur**

`frontend/src/store/authStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  username: string | null
  accessToken: string | null
  isLoggedIn: boolean
  setAuth: (username: string, accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      accessToken: null,
      isLoggedIn: false,
      setAuth: (username, accessToken) =>
        set({ username, accessToken, isLoggedIn: true }),
      logout: () =>
        set({ username: null, accessToken: null, isLoggedIn: false }),
    }),
    {
      name: 'kozan-auth',
      partialize: (state) => ({
        username: state.username,
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
)
```

- [ ] **Step 2: `api.ts` oluştur**

`frontend/src/lib/api.ts`:

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  email: string
  username: string
  name: string
  password: string
}

interface VerifyEmailPayload {
  email: string
  code: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  username: string
}

interface ApiError {
  message: string | string[]
  statusCode: number
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err: ApiError = await res.json()
    const msg = Array.isArray(err.message) ? err.message[0] : err.message
    throw new Error(msg ?? 'Bir hata oluştu.')
  }

  return res.json() as Promise<T>
}

export const api = {
  login: (payload: LoginPayload) =>
    post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    post<{ message: string }>('/auth/register', payload),

  verifyEmail: (payload: VerifyEmailPayload) =>
    post<AuthResponse>('/auth/verify-email', payload),
}
```

- [ ] **Step 3: `.env.local` oluştur**

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/authStore.ts frontend/src/lib/api.ts frontend/.env.local
git commit -m "feat(frontend): add Zustand auth store and API fetch wrapper"
```

---

## Task 7: `BeehiveButton` Komponenti

**Files:**
- Create: `frontend/src/components/login/BeehiveButton.tsx`

- [ ] **Step 1: Komponenti oluştur**

`frontend/src/components/login/BeehiveButton.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface BeehiveButtonProps {
  onReveal: () => void
}

export function BeehiveButton({ onReveal }: BeehiveButtonProps) {
  return (
    <motion.button
      onClick={onReveal}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 1.15 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.4 } }}
      className="cursor-pointer focus:outline-none"
      aria-label="koZan'a giriş yap"
    >
      <Image
        src="/images/beehive.png"
        alt="Beehive"
        width={192}
        height={192}
        priority
      />
    </motion.button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/login/BeehiveButton.tsx
git commit -m "feat(frontend): add BeehiveButton with hover and exit animations"
```

---

## Task 8: `LogoSection` Komponenti

**Files:**
- Create: `frontend/src/components/login/LogoSection.tsx`

- [ ] **Step 1: Komponenti oluştur**

`frontend/src/components/login/LogoSection.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const LETTERS = ['k', 'o', 'z', 'a', 'n'] as const

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

const letterVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

interface LogoSectionProps {
  username?: string | null
}

export function LogoSection({ username }: LogoSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-3"
    >
      <Image
        src="/images/koZanlogo.png"
        alt="koZan logo"
        width={80}
        height={80}
        priority
      />

      {username ? (
        <motion.p
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-xl font-semibold text-amber-800"
        >
          Hoşgeldin, {username}
        </motion.p>
      ) : (
        <motion.div
          key="letters"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2"
        >
          {LETTERS.map((letter) => (
            <motion.div key={letter} variants={letterVariants}>
              <Image
                src={`/images/${letter}.png`}
                alt={letter}
                width={28}
                height={28}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/login/LogoSection.tsx
git commit -m "feat(frontend): add LogoSection with letter PNGs and welcome state"
```

---

## Task 9: `AuthForm` Komponenti

**Files:**
- Create: `frontend/src/components/login/AuthForm.tsx`

- [ ] **Step 1: Komponenti oluştur**

`frontend/src/components/login/AuthForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

type FormMode = 'login' | 'register' | 'otp'

interface AuthFormProps {
  onSuccess: (username: string, accessToken: string) => void
}

const inputClass =
  'w-full bg-yellow-100 border border-yellow-300 rounded-2xl px-4 py-3 outline-none focus:border-[#ffd000] transition text-gray-700 placeholder-gray-400'

const buttonClass =
  'w-full bg-[#ffd000] hover:bg-[#ffb700] transition rounded-2xl py-3 font-semibold text-gray-800'

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<FormMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState('')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regName, setRegName] = useState('')
  const [regPassword, setRegPassword] = useState('')

  // OTP state
  const [otp, setOtp] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.login({ email: loginEmail, password: loginPassword })
      onSuccess(res.username, res.access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.register({
        email: regEmail,
        username: regUsername,
        name: regName,
        password: regPassword,
      })
      setPendingEmail(regEmail)
      setMode('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.verifyEmail({ email: pendingEmail, code: otp })
      onSuccess(res.username, res.access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doğrulama başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full max-w-sm"
    >
      {/* Tab toggle — sadece login/register modlarında göster */}
      {mode !== 'otp' && (
        <div className="flex bg-yellow-100 rounded-2xl p-1 mb-5 border border-yellow-300">
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setError(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                mode === tab
                  ? 'bg-[#ffd000] text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* LOGIN FORMU */}
        {mode === 'login' && (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleLogin}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              placeholder="E-posta"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Şifre"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className={inputClass}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </motion.form>
        )}

        {/* KAYIT FORMU */}
        {mode === 'register' && (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegister}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              placeholder="E-posta"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              className={inputClass}
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 select-none">@</span>
              <input
                type="text"
                placeholder="kullanici_adi"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                required
                className={`${inputClass} pl-8`}
              />
            </div>
            <input
              type="text"
              placeholder="Ad Soyad"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Şifre (min. 8 karakter, 1 büyük harf, 1 rakam, 1 özel)"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              className={inputClass}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
            </button>
          </motion.form>
        )}

        {/* OTP DOĞRULAMA */}
        {mode === 'otp' && (
          <motion.form
            key="otp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleVerify}
            className="flex flex-col gap-3"
          >
            <p className="text-center text-gray-700 text-sm">
              <strong>{pendingEmail}</strong> adresine 6 haneli doğrulama kodu gönderildi.
            </p>
            <input
              type="text"
              placeholder="Doğrulama kodu"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              className={`${inputClass} text-center tracking-widest text-lg font-mono`}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading || otp.length !== 6} className={buttonClass}>
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/login/AuthForm.tsx
git commit -m "feat(frontend): add AuthForm with login/register/OTP toggle"
```

---

## Task 10: `NavButtons` Komponenti

**Files:**
- Create: `frontend/src/components/login/NavButtons.tsx`

- [ ] **Step 1: Komponenti oluştur**

`frontend/src/components/login/NavButtons.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const buttons = [
  {
    icon: '/images/bee.png',
    label: 'Kişisel Oda',
    href: '/personal-room',
  },
  {
    icon: '/images/beehiveee.png',
    label: 'Topluluk Odaları',
    href: '/community',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const buttonVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
}

export function NavButtons() {
  const router = useRouter()

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex gap-8"
    >
      {buttons.map(({ icon, label, href }) => (
        <div key={href} className="flex flex-col items-center gap-2">
          <motion.button
            variants={buttonVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(href)}
            className="w-28 h-28 rounded-full bg-yellow-100 border-2 border-[#ffd000] flex items-center justify-center shadow-sm focus:outline-none"
            aria-label={label}
          >
            <Image src={icon} alt={label} width={56} height={56} />
          </motion.button>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/login/NavButtons.tsx
git commit -m "feat(frontend): add NavButtons with spring pop animation"
```

---

## Task 11: Ana Sayfa — State Machine Birleştirme

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: `page.tsx` yaz**

`frontend/src/app/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BeehiveButton } from '@/components/login/BeehiveButton'
import { LogoSection } from '@/components/login/LogoSection'
import { AuthForm } from '@/components/login/AuthForm'
import { NavButtons } from '@/components/login/NavButtons'
import { useAuthStore } from '@/store/authStore'

type PageState = 'idle' | 'auth' | 'loggedIn'

export default function Home() {
  const [pageState, setPageState] = useState<PageState>('idle')
  const { username, isLoggedIn, setAuth } = useAuthStore()

  // Önceki oturumdan login kalıyorsa direkt loggedIn göster
  const effectiveState: PageState = isLoggedIn ? 'loggedIn' : pageState

  function handleReveal() {
    setPageState('auth')
  }

  function handleAuthSuccess(newUsername: string, accessToken: string) {
    setAuth(newUsername, accessToken)
    setPageState('loggedIn')
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <AnimatePresence mode="wait">
          {effectiveState === 'idle' && (
            <BeehiveButton key="beehive" onReveal={handleReveal} />
          )}
        </AnimatePresence>

        {effectiveState !== 'idle' && (
          <>
            <LogoSection username={effectiveState === 'loggedIn' ? username : null} />

            <AnimatePresence mode="wait">
              {effectiveState === 'auth' && (
                <AuthForm key="form" onSuccess={handleAuthSuccess} />
              )}
              {effectiveState === 'loggedIn' && (
                <NavButtons key="nav" />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(frontend): assemble login page state machine"
```

---

## Task 12: Placeholder Sayfalar + next.config Ayarı

**Files:**
- Create: `frontend/src/app/personal-room/page.tsx`
- Create: `frontend/src/app/community/page.tsx`
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Placeholder sayfaları oluştur**

`frontend/src/app/personal-room/page.tsx`:

```tsx
export default function PersonalRoom() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-2xl font-semibold text-amber-800">Kişisel Oda — yakında</p>
    </main>
  )
}
```

`frontend/src/app/community/page.tsx`:

```tsx
export default function Community() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-2xl font-semibold text-amber-800">Topluluk Odaları — yakında</p>
    </main>
  )
}
```

- [ ] **Step 2: `next.config.ts` — external image domain kaldır (local PNG'ler `public/` altında)**

`frontend/next.config.ts` dosyasının şu şekilde olduğunu kontrol et (images remote pattern gerekmez):

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 3: Son test — hem backend hem frontend çalıştır**

Terminal 1:
```bash
cd backend
npm run start:dev
```

Terminal 2:
```bash
cd frontend
npm run dev -- --port 3001
```

`http://localhost:3001` adresini aç ve şu akışı test et:

1. Ortada `beehive.png` görünüyor → hover'da büyüyor ✓
2. Tıklayınca petek kayboluyor, logo + `k o z a n` harfleri geliyor ✓
3. Form görünüyor, "Kayıt Ol" sekmesine geç → tüm alanlar açılıyor ✓
4. `@` prefix kullanıcı adı inputunda görünüyor ✓
5. Kayıt sonrası OTP formu geliyor ✓
6. Doğrulama sonrası (veya login ile) "Hoşgeldin, [username]" ve 2 buton çıkıyor ✓
7. "Kişisel Oda" butonuna tık → `/personal-room` açılıyor ✓
8. "Topluluk Odaları" → `/community` açılıyor ✓

- [ ] **Step 4: Final commit**

```bash
cd "c:/Users/Göksu/OneDrive/Desktop/koZan"
git add frontend/src/app/personal-room/ frontend/src/app/community/ frontend/next.config.ts
git commit -m "feat(frontend): add placeholder pages for personal-room and community"
```

---

## Özet — Terminalde Ne Yapılacak

```bash
# Backend (Terminal 1)
cd c:/Users/Göksu/OneDrive/Desktop/koZan/backend
npm run start:dev

# Frontend (Terminal 2)
cd c:/Users/Göksu/OneDrive/Desktop/koZan/frontend
npm run dev -- --port 3001
```

**Tarayıcıda:** `http://localhost:3001`
