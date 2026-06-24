# koZan Android (Expo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo Managed) Android app for koZan — auth, personal study room (no monitoring), community rooms (no video), Q&A.

**Architecture:** New `mobile/` directory alongside `frontend/` and `backend/`. Expo Router 4 (file-based routing), NativeWind v4 (Tailwind classes), Zustand + AsyncStorage. Backend untouched.

**Tech Stack:** Expo SDK 53, Expo Router ~4.0, React Native 0.76, NativeWind ^4.1, Reanimated ~3.16, react-native-svg ~15.8, AsyncStorage ~2.1, Socket.io-client ^4.8, Zustand ^5.0

---

## File Map

| File | Action |
|------|--------|
| `mobile/app.json` | Create |
| `mobile/babel.config.js` | Create |
| `mobile/metro.config.js` | Create |
| `mobile/tailwind.config.js` | Create |
| `mobile/tsconfig.json` | Create |
| `mobile/global.css` | Create |
| `mobile/nativewind-env.d.ts` | Create |
| `mobile/constants/config.ts` | Create |
| `mobile/constants/colors.ts` | Create |
| `mobile/store/authStore.ts` | Create |
| `mobile/lib/api.ts` | Create |
| `mobile/app/_layout.tsx` | Create |
| `mobile/app/(auth)/_layout.tsx` | Create |
| `mobile/app/(auth)/index.tsx` | Create |
| `mobile/app/(main)/_layout.tsx` | Create |
| `mobile/app/(main)/personal-room/index.tsx` | Create |
| `mobile/app/(main)/community/index.tsx` | Create |
| `mobile/app/(main)/community/[roomId].tsx` | Create |
| `mobile/components/auth/BeehiveButton.tsx` | Create |
| `mobile/components/auth/AuthForm.tsx` | Create |
| `mobile/components/personal-room/useStudyTimer.ts` | Create |
| `mobile/components/personal-room/SetupWizard.tsx` | Create |
| `mobile/components/personal-room/StudySessionView.tsx` | Create |
| `mobile/components/personal-room/SessionSummary.tsx` | Create |
| `mobile/components/community/HexGrid.tsx` | Create |
| `mobile/components/community/useRoomSocket.ts` | Create |
| `mobile/components/community/QASection.tsx` | Create |
| `mobile/components/community/QuestionCard.tsx` | Create |
| `mobile/__tests__/authStore.test.ts` | Create |
| `mobile/__tests__/useStudyTimer.test.ts` | Create |

---

## Task 1: Project Bootstrap

**Files:** `mobile/` (entire scaffold + config files)

- [ ] **Step 1: Scaffold Expo project**

Run in `koZan/` root:
```bash
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install react-native-reanimated react-native-svg
npx expo install @react-native-async-storage/async-storage
npm install nativewind tailwindcss zustand socket.io-client
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: Replace `app.json`**

```json
{
  "expo": {
    "name": "koZan",
    "slug": "kozan",
    "version": "1.0.0",
    "scheme": "kozan",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "splash": {
      "backgroundColor": "#ffec8c"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#ffec8c"
      }
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Replace `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Create `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 6: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        honey: '#fbbf24',
        'honey-dark': '#f59e0b',
      },
    },
  },
};
```

- [ ] **Step 7: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 9: Replace `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]
}
```

- [ ] **Step 10: Update `package.json` — add jest config**

Open `package.json`, add after `"scripts"`:
```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 11: Verify setup compiles**

```bash
npx tsc --noEmit
```
Expected: no errors (or only "cannot find module" for files not yet created — acceptable at this step).

- [ ] **Step 12: Commit**

```bash
cd ..
git add mobile/
git commit -m "feat(mobile): bootstrap Expo project with NativeWind + Expo Router"
```

---

## Task 2: Constants, Auth Store & API Client

**Files:** `constants/config.ts`, `constants/colors.ts`, `store/authStore.ts`, `lib/api.ts`, `__tests__/authStore.test.ts`

- [ ] **Step 1: Write failing authStore test**

Create `mobile/__tests__/authStore.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../store/authStore';

beforeEach(() => {
  useAuthStore.setState({ username: null, accessToken: null, isLoggedIn: false });
});

test('setAuth sets credentials and isLoggedIn=true', () => {
  const { result } = renderHook(() => useAuthStore());
  act(() => result.current.setAuth('testuser', 'tok123'));
  expect(result.current.username).toBe('testuser');
  expect(result.current.accessToken).toBe('tok123');
  expect(result.current.isLoggedIn).toBe(true);
});

test('logout clears all credentials', () => {
  const { result } = renderHook(() => useAuthStore());
  act(() => result.current.setAuth('testuser', 'tok123'));
  act(() => result.current.logout());
  expect(result.current.username).toBeNull();
  expect(result.current.accessToken).toBeNull();
  expect(result.current.isLoggedIn).toBe(false);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd mobile && npx jest __tests__/authStore.test.ts
```
Expected: FAIL — "Cannot find module '../store/authStore'"

- [ ] **Step 3: Create `constants/config.ts`**

```ts
// Geliştirmede: bilgisayarın yerel IP'si (ör. 192.168.1.42) ya da ngrok URL
export const API_BASE_URL = 'http://192.168.1.100:3000';
export const WS_URL = API_BASE_URL;
```

- [ ] **Step 4: Create `constants/colors.ts`**

```ts
export const C = {
  bg: '#ffec8c',
  card: '#fef3c7',
  border: '#fde68a',
  borderActive: '#fbbf24',
  accent: '#fbbf24',
  accentDark: '#f59e0b',
  orange: '#fb923c',
  textDark: '#92400e',
  textMed: '#b45309',
  textLight: '#d97706',
  btnPrimary: '#fbbf24',
  btnPrimaryText: '#78350f',
  disabled: '#fef3c7',
  disabledText: '#d97706',
  red: '#ef4444',
  redLight: '#fca5a5',
} as const;
```

- [ ] **Step 5: Create `store/authStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  username: string | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  setAuth: (username: string, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      accessToken: null,
      isLoggedIn: false,
      setAuth: (username, accessToken) => set({ username, accessToken, isLoggedIn: true }),
      logout: () => set({ username: null, accessToken: null, isLoggedIn: false }),
    }),
    {
      name: 'kozan-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

- [ ] **Step 6: Run authStore test — should pass**

```bash
npx jest __tests__/authStore.test.ts
```
Expected: PASS (2 tests)

- [ ] **Step 7: Create `lib/api.ts`**

```ts
import { API_BASE_URL } from '../constants/config';

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

async function postAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

async function patchAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message: string | string[] };
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? 'Bir hata oluştu.');
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type StudyMethod = 'POMODORO' | 'BASLAYAMIYORUM' | 'KLASIK' | 'RASTGELE' | 'OZEL';

export interface StudySessionConfig {
  topic: string;
  method: StudyMethod;
  workMinutes: number;
  breakMinutes: number;
  totalRounds: number;
  monitoringType: 'NONE';
}

export interface StudySession extends StudySessionConfig {
  id: string;
  userId: string;
  completedRounds: number;
  startedAt: string;
  endedAt: string | null;
  xpAwarded: number;
}

export interface Room {
  id: string;
  title: string;
  slug: string | null;
  type: 'PERSONAL' | 'COMMUNITY';
  owner: { id: string; name: string } | null;
  createdAt: string;
}

export interface Question {
  id: string;
  content: string | null;
  upvotes: number;
  author: { id: string; name: string; username: string };
  roomId: string;
  createdAt: string;
  _count?: { answers: number };
}

export interface Answer {
  id: string;
  content: string | null;
  author: { id: string; name: string; username: string };
  createdAt: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  username: string;
}

// ── API ────────────────────────────────────────────────────────────────────

export const api = {
  login: (email: string, password: string) =>
    post<AuthResponse>('/auth/login', { email, password }),

  register: (data: { email: string; username: string; name: string; password: string }) =>
    post<{ message: string }>('/auth/register', data),

  verifyEmail: (email: string, code: string) =>
    post<AuthResponse>('/auth/verify-email', { email, code }),

  getRooms: (token?: string) => get<Room[]>('/rooms', token),

  getRoom: (id: string, token?: string) => get<Room>(`/rooms/${id}`, token),

  getRoomQuestions: (roomId: string, token?: string) =>
    get<Question[]>(`/rooms/${roomId}/questions`, token),

  createQuestion: (roomId: string, content: string, token: string) => {
    const fd = new FormData();
    fd.append('roomId', roomId);
    fd.append('content', content);
    return fetch(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(async (res) => {
      if (!res.ok) {
        const err = (await res.json()) as { message: string | string[] };
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message);
      }
      return res.json() as Promise<Question>;
    });
  },

  getAnswers: (questionId: string) =>
    get<Answer[]>(`/questions/${questionId}/answers`),

  createAnswer: (questionId: string, content: string, token: string) => {
    const fd = new FormData();
    fd.append('content', content);
    return fetch(`${API_BASE_URL}/questions/${questionId}/answers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(async (res) => {
      if (!res.ok) {
        const err = (await res.json()) as { message: string | string[] };
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message);
      }
      return res.json() as Promise<Answer>;
    });
  },

  voteQuestion: (questionId: string, token: string) =>
    postAuth<{ upvotes: number; voted: boolean }>(`/questions/${questionId}/vote`, {}, token),

  createStudySession: (config: StudySessionConfig, token: string) =>
    postAuth<StudySession>('/study-sessions', config, token),

  incrementRound: (sessionId: string, token: string) =>
    patchAuth<StudySession>(`/study-sessions/${sessionId}/round`, {}, token),

  endStudySession: (sessionId: string, token: string) =>
    patchAuth<StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }>(
      `/study-sessions/${sessionId}/end`, {}, token
    ),
};
```

- [ ] **Step 8: Commit**

```bash
git add mobile/constants/ mobile/store/ mobile/lib/ mobile/__tests__/authStore.test.ts
git commit -m "feat(mobile): add auth store, API client, and constants"
```

---

## Task 3: Navigation Layout

**Files:** `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(main)/_layout.tsx`

- [ ] **Step 1: Create `app/_layout.tsx`**

```tsx
import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';

function AuthGuard() {
  const { isLoggedIn } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuth) {
      router.replace('/(auth)');
    } else if (isLoggedIn && inAuth) {
      router.replace('/(main)/personal-room');
    }
  }, [isLoggedIn, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGuard />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Create `app/(main)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fef3c7' },
        headerTintColor: '#92400e',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/app/
git commit -m "feat(mobile): add navigation layout with auth guard"
```

---

## Task 4: Auth Screen

**Files:** `components/auth/BeehiveButton.tsx`, `components/auth/AuthForm.tsx`, `app/(auth)/index.tsx`

- [ ] **Step 1: Create `components/auth/BeehiveButton.tsx`**

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const SIZE = 200;

export default function BeehiveButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ width: SIZE, height: SIZE }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.93); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
        style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute' }}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
            <Polygon
              points="100,5 190,52 190,148 100,195 10,148 10,52"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="3"
            />
          </Svg>
        </View>
        <Text style={{ color: '#78350f', fontWeight: '900', fontSize: 22, letterSpacing: 2 }}>
          koZan
        </Text>
        <Text style={{ color: '#b45309', fontSize: 11, marginTop: 4, letterSpacing: 1 }}>
          BAŞLA
        </Text>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Create `components/auth/AuthForm.tsx`**

```tsx
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { api } from '../../lib/api';
import { C } from '../../constants/colors';

type FormMode = 'login' | 'register' | 'otp';

interface Props {
  onSuccess: (username: string, accessToken: string) => void;
}

const inputStyle = {
  backgroundColor: '#fef3c7',
  borderWidth: 1.5,
  borderColor: '#fde68a',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
  color: C.textDark,
  fontSize: 15,
  marginBottom: 10,
} as const;

const btnStyle = {
  backgroundColor: C.accent,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center' as const,
  marginTop: 4,
};

export default function AuthForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<FormMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [otp, setOtp] = useState('');

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(loginEmail, loginPassword);
      onSuccess(res.username, res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      await api.register({ email: regEmail, username: regUsername, name: regName, password: regPassword });
      setPendingEmail(regEmail);
      setMode('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyEmail(pendingEmail, otp);
      onSuccess(res.username, res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Doğrulama kodu geçersiz.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError(null);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ width: '100%', maxWidth: 400 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode !== 'otp' && (
          <View style={{
            flexDirection: 'row', backgroundColor: '#fef3c7',
            borderWidth: 1.5, borderColor: '#fde68a', borderRadius: 16,
            padding: 4, marginBottom: 16,
          }}>
            {(['login', 'register'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => switchMode(tab)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: mode === tab ? C.accent : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontWeight: '600', fontSize: 14,
                  color: mode === tab ? C.btnPrimaryText : C.textLight,
                }}>
                  {tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {mode === 'login' && (
          <View>
            <TextInput
              style={inputStyle} placeholder="E-posta" placeholderTextColor={C.textLight}
              value={loginEmail} onChangeText={setLoginEmail}
              keyboardType="email-address" autoCapitalize="none"
            />
            <TextInput
              style={inputStyle} placeholder="Şifre" placeholderTextColor={C.textLight}
              value={loginPassword} onChangeText={setLoginPassword} secureTextEntry
            />
            {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Pressable style={btnStyle} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color={C.btnPrimaryText} />
                : <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Giriş Yap</Text>
              }
            </Pressable>
          </View>
        )}

        {mode === 'register' && (
          <View>
            <TextInput
              style={inputStyle} placeholder="E-posta" placeholderTextColor={C.textLight}
              value={regEmail} onChangeText={setRegEmail}
              keyboardType="email-address" autoCapitalize="none"
            />
            <TextInput
              style={inputStyle} placeholder="@kullanici_adi" placeholderTextColor={C.textLight}
              value={regUsername}
              onChangeText={(t) => setRegUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
            />
            <TextInput
              style={inputStyle} placeholder="Ad Soyad" placeholderTextColor={C.textLight}
              value={regName} onChangeText={setRegName}
            />
            <TextInput
              style={inputStyle}
              placeholder="Şifre (min. 8 kar., 1 büyük, 1 rakam, 1 özel)"
              placeholderTextColor={C.textLight}
              value={regPassword} onChangeText={setRegPassword} secureTextEntry
            />
            {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Pressable style={btnStyle} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color={C.btnPrimaryText} />
                : <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Kayıt Ol</Text>
              }
            </Pressable>
          </View>
        )}

        {mode === 'otp' && (
          <View>
            <Text style={{ textAlign: 'center', color: C.textMed, marginBottom: 16, fontSize: 14 }}>
              <Text style={{ fontWeight: '700' }}>{pendingEmail}</Text>
              {' '}adresine 6 haneli kod gönderildi.
            </Text>
            <TextInput
              style={[inputStyle, { textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 8 }]}
              placeholder="000000" placeholderTextColor={C.textLight}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad" maxLength={6}
            />
            {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Pressable style={[btnStyle, { opacity: otp.length !== 6 ? 0.5 : 1 }]}
              onPress={handleVerify} disabled={loading || otp.length !== 6}>
              {loading
                ? <ActivityIndicator color={C.btnPrimaryText} />
                : <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Doğrula</Text>
              }
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/index.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import BeehiveButton from '../../components/auth/BeehiveButton';
import AuthForm from '../../components/auth/AuthForm';
import { C } from '../../constants/colors';

type Screen = 'idle' | 'auth';

export default function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('idle');
  const { setAuth } = useAuthStore();

  function handleSuccess(username: string, accessToken: string) {
    setAuth(username, accessToken);
    // AuthGuard in _layout.tsx handles redirect automatically
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={styles.container}>
        {screen === 'idle' && (
          <View style={styles.center}>
            <Text style={styles.logo}>koZan</Text>
            <Text style={styles.tagline}>Çalışmayı bir alışkanlığa dönüştür.</Text>
            <View style={{ marginTop: 40 }}>
              <BeehiveButton onPress={() => setScreen('auth')} />
            </View>
          </View>
        )}

        {screen === 'auth' && (
          <View style={styles.formContainer}>
            <AuthForm onSuccess={handleSuccess} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { alignItems: 'center' },
  logo: { fontSize: 40, fontWeight: '900', color: C.textDark, letterSpacing: 3 },
  tagline: { fontSize: 14, color: C.textMed, marginTop: 8, textAlign: 'center' },
  formContainer: { width: '100%', alignItems: 'center' },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/components/auth/ mobile/app/\(auth\)/
git commit -m "feat(mobile): add auth screen with login, register, OTP"
```

---

## Task 5: Personal Room — Timer Hook

**Files:** `components/personal-room/useStudyTimer.ts`, `__tests__/useStudyTimer.test.ts`

- [ ] **Step 1: Write failing timer tests**

Create `mobile/__tests__/useStudyTimer.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react-native';
import { useStudyTimer } from '../components/personal-room/useStudyTimer';

jest.useFakeTimers();

const baseConfig = {
  workMinutes: 1,
  breakMinutes: 1,
  totalRounds: 2,
  method: 'POMODORO' as const,
};

test('starts in work phase', () => {
  const { result } = renderHook(() =>
    useStudyTimer(baseConfig, { onRoundComplete: jest.fn(), onSessionDone: jest.fn() })
  );
  expect(result.current.phase).toBe('work');
  expect(result.current.currentRound).toBe(1);
});

test('transitions to break after work phase', () => {
  const onRoundComplete = jest.fn();
  const { result } = renderHook(() =>
    useStudyTimer(baseConfig, { onRoundComplete, onSessionDone: jest.fn() })
  );
  act(() => { jest.advanceTimersByTime(60 * 1000 + 500); });
  expect(result.current.phase).toBe('break');
  expect(onRoundComplete).toHaveBeenCalledWith(1);
});

test('calls onSessionDone after all rounds', () => {
  const onSessionDone = jest.fn();
  const { result } = renderHook(() =>
    useStudyTimer(baseConfig, { onRoundComplete: jest.fn(), onSessionDone })
  );
  // Round 1 work → break → Round 2 work → done
  act(() => { jest.advanceTimersByTime(60 * 1000 + 500); }); // work1 done
  act(() => { jest.advanceTimersByTime(60 * 1000 + 500); }); // break1 done
  act(() => { jest.advanceTimersByTime(60 * 1000 + 500); }); // work2 done
  expect(onSessionDone).toHaveBeenCalled();
  expect(result.current.phase).toBe('done');
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest __tests__/useStudyTimer.test.ts
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create `components/personal-room/useStudyTimer.ts`**

(Direct port from web — no DOM dependencies, works identically in React Native)

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyMethod } from '../../lib/api';

export type TimerPhase = 'work' | 'break' | 'done';

export interface TimerState {
  phase: TimerPhase;
  remaining: number;
  currentRound: number;
  totalRounds: number;
  workMinutes: number;
  breakMinutes: number;
}

interface TimerConfig {
  workMinutes: number;
  breakMinutes: number;
  totalRounds: number;
  method: StudyMethod;
}

interface TimerCallbacks {
  onRoundComplete: (round: number) => void;
  onSessionDone: () => void;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomMinutes() {
  return { work: randomBetween(10, 45), brk: randomBetween(5, 15) };
}

export function useStudyTimer(config: TimerConfig, callbacks: TimerCallbacks) {
  const { workMinutes: initWork, breakMinutes: initBreak, totalRounds, method } = config;
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  function initialMinutes() {
    if (method === 'RASTGELE') {
      const r = getRandomMinutes();
      return { work: r.work, brk: r.brk };
    }
    return { work: initWork, brk: initBreak };
  }

  const [phase, setPhase] = useState<TimerPhase>('work');
  const [currentRound, setCurrentRound] = useState(1);
  const [workMins, setWorkMins] = useState(() => initialMinutes().work);
  const [breakMins, setBreakMins] = useState(() => initialMinutes().brk);
  const [remaining, setRemaining] = useState(() => initialMinutes().work * 60);
  const [running, setRunning] = useState(true);

  const phaseRef = useRef(phase);
  const roundRef = useRef(currentRound);
  const workMinsRef = useRef(workMins);
  const breakMinsRef = useRef(breakMins);
  phaseRef.current = phase;
  roundRef.current = currentRound;
  workMinsRef.current = workMins;
  breakMinsRef.current = breakMins;

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);

  useEffect(() => {
    if (!running || phase === 'done') return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (phaseRef.current === 'work') {
            const round = roundRef.current;
            cbRef.current.onRoundComplete(round);
            if (round >= totalRounds) {
              setPhase('done');
              cbRef.current.onSessionDone();
              return 0;
            }
            setPhase('break');
            return breakMinsRef.current * 60;
          } else {
            const nextRound = roundRef.current + 1;
            setCurrentRound(nextRound);
            if (method === 'RASTGELE') {
              const r = getRandomMinutes();
              setWorkMins(r.work);
              setBreakMins(r.brk);
              setPhase('work');
              return r.work * 60;
            }
            setPhase('work');
            return workMinsRef.current * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, totalRounds, method]);

  return { phase, remaining, currentRound, totalRounds, workMinutes: workMins, breakMinutes: breakMins, pause, resume };
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
npx jest __tests__/useStudyTimer.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/components/personal-room/useStudyTimer.ts mobile/__tests__/useStudyTimer.test.ts
git commit -m "feat(mobile): add study timer hook (port from web)"
```

---

## Task 6: Personal Room — UI

**Files:** `SetupWizard.tsx`, `StudySessionView.tsx`, `SessionSummary.tsx`, `app/(main)/personal-room/index.tsx`

- [ ] **Step 1: Create `components/personal-room/SetupWizard.tsx`**

Step 3 is simplified — no monitoring options, just a confirm screen.

```tsx
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StudyMethod, StudySessionConfig } from '../../lib/api';
import { C } from '../../constants/colors';

const METHOD_PRESETS: { id: StudyMethod; label: string; desc: string; work: number; brk: number; rounds: number }[] = [
  { id: 'POMODORO',       label: 'Pomodoro',       desc: '25 dk çalış · 5 dk mola · 5 tekrar',  work: 25, brk: 5,  rounds: 5 },
  { id: 'BASLAYAMIYORUM', label: 'Başlayamıyorum',  desc: '10 dk çalış · 5 dk mola · 5 tekrar',  work: 10, brk: 5,  rounds: 5 },
  { id: 'KLASIK',         label: 'Klasik',          desc: '45 dk çalış · 15 dk mola · 5 tekrar', work: 45, brk: 15, rounds: 5 },
  { id: 'RASTGELE',       label: 'Rastgele',        desc: 'Rastgele süreler · 5 tekrar',          work: 25, brk: 10, rounds: 5 },
  { id: 'OZEL',           label: 'Özel',            desc: 'Kendi süreni belirle',                 work: 25, brk: 5,  rounds: 5 },
];

interface Props {
  onComplete: (config: StudySessionConfig) => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [method, setMethod] = useState<StudyMethod | null>(null);
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [customRounds, setCustomRounds] = useState(5);

  function getConfig(): StudySessionConfig {
    const preset = METHOD_PRESETS.find((p) => p.id === method)!;
    return {
      topic,
      method: method!,
      workMinutes:  method === 'OZEL' ? customWork   : preset.work,
      breakMinutes: method === 'OZEL' ? customBreak  : preset.brk,
      totalRounds:  method === 'OZEL' ? customRounds : preset.rounds,
      monitoringType: 'NONE',
    };
  }

  const canStep1 = topic.trim().length > 0;
  const canStep2 = method !== null && (method !== 'OZEL' || (customWork >= 1 && customBreak >= 1 && customRounds >= 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Progress dots */}
        <View style={s.progress}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.dot, step >= n && s.dotActive]}>
                <Text style={[s.dotText, step >= n && s.dotTextActive]}>{n}</Text>
              </View>
              {n < 3 && <View style={[s.line, step > n && s.lineActive]} />}
            </View>
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text style={s.title}>Bugün neye çalışacaksın?</Text>
            <Text style={s.subtitle}>Konu oturum boyunca görünecek.</Text>
            <TextInput
              style={s.input}
              placeholder="ör. Matematik — Türev ve İntegral"
              placeholderTextColor={C.textLight}
              value={topic}
              onChangeText={setTopic}
            />
            <View style={s.row}>
              <WBtn disabled={!canStep1} onPress={() => setStep(2)}>İleri →</WBtn>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={s.title}>Çalışma yöntemi</Text>
            <Text style={s.subtitle}>Bir yöntem seç.</Text>
            {METHOD_PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setMethod(p.id)}
                style={[s.card, method === p.id && s.cardActive]}
              >
                <Text style={[s.cardTitle, method === p.id && { color: C.textDark }]}>{p.label}</Text>
                <Text style={s.cardDesc}>{p.desc}</Text>
              </Pressable>
            ))}
            {method === 'OZEL' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {[
                  { label: 'Çalışma (dk)', value: customWork, set: setCustomWork },
                  { label: 'Mola (dk)',    value: customBreak, set: setCustomBreak },
                  { label: 'Tekrar',       value: customRounds, set: setCustomRounds },
                ].map(({ label, value, set }) => (
                  <View key={label} style={{ flex: 1 }}>
                    <Text style={s.label}>{label}</Text>
                    <TextInput
                      style={s.numInput}
                      keyboardType="number-pad"
                      value={String(value)}
                      onChangeText={(t) => set(Math.max(1, Number(t) || 1))}
                    />
                  </View>
                ))}
              </View>
            )}
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <WBtn secondary onPress={() => setStep(1)}>← Geri</WBtn>
              <WBtn disabled={!canStep2} onPress={() => setStep(3)}>İleri →</WBtn>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={s.title}>Hazır mısın?</Text>
            <Text style={s.subtitle}>
              İzleme bu sürümde devre dışı. Oturumunu başlatmak için devam et.
            </Text>
            <View style={[s.row, { justifyContent: 'space-between', marginTop: 24 }]}>
              <WBtn secondary onPress={() => setStep(2)}>← Geri</WBtn>
              <WBtn onPress={() => onComplete(getConfig())}>Başlat ▶</WBtn>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WBtn({ children, onPress, disabled, secondary }: {
  children: React.ReactNode; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
        backgroundColor: secondary ? 'transparent' : disabled ? C.disabled : C.accent,
        borderWidth: secondary ? 1.5 : 0, borderColor: C.border,
      }}
    >
      <Text style={{ color: secondary ? C.textMed : disabled ? C.disabledText : C.btnPrimaryText, fontWeight: '600', fontSize: 14 }}>
        {children}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 8 },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.card, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: C.accent, borderColor: C.accentDark },
  dotText: { fontSize: 11, fontWeight: '700', color: C.textLight },
  dotTextActive: { color: C.btnPrimaryText },
  line: { width: 36, height: 2, backgroundColor: C.border, marginHorizontal: 4 },
  lineActive: { backgroundColor: C.accent },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.textLight, marginBottom: 16 },
  input: { backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.textDark, fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  card: { backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardActive: { borderColor: C.borderActive, backgroundColor: '#fef9c3' },
  cardTitle: { fontWeight: '600', fontSize: 14, color: C.textMed },
  cardDesc: { fontSize: 12, color: C.textLight, marginTop: 2 },
  label: { fontSize: 11, color: C.textLight, marginBottom: 4 },
  numInput: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 8, padding: 8, color: C.textDark, fontSize: 14, textAlign: 'center' },
});
```

- [ ] **Step 2: Create `components/personal-room/StudySessionView.tsx`**

Mobile version: no camera, no CheckInModal. Timer auto-advances, calls `incrementRound` API per round.

```tsx
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStudyTimer } from './useStudyTimer';
import { api, type StudySession } from '../../lib/api';
import { C } from '../../constants/colors';

interface Props {
  session: StudySession;
  token: string;
  onSessionEnd: (ended: StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }) => void;
}

export default function StudySessionView({ session, token, onSessionEnd }: Props) {
  const [ending, setEnding] = useState(false);

  const timer = useStudyTimer(
    {
      workMinutes: session.workMinutes,
      breakMinutes: session.breakMinutes,
      totalRounds: session.totalRounds,
      method: session.method,
    },
    {
      onRoundComplete: (round) => {
        api.incrementRound(session.id, token).catch(console.error);
      },
      onSessionDone: () => handleEnd(),
    },
  );

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      const ended = await api.endStudySession(session.id, token);
      onSessionEnd(ended);
    } catch (e) {
      console.error(e);
      setEnding(false);
    }
  }

  const mins = String(Math.floor(timer.remaining / 60)).padStart(2, '0');
  const secs = String(timer.remaining % 60).padStart(2, '0');
  const isWork = timer.phase === 'work';
  const isDone = timer.phase === 'done';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Topic bar */}
      <View style={s.topicBar}>
        <Text style={s.topicText} numberOfLines={1}>{session.topic}</Text>
      </View>

      <View style={s.body}>
        {/* Phase badge */}
        <View style={[s.badge, { borderColor: isWork ? C.accent : C.orange }]}>
          <Text style={[s.badgeText, { color: isWork ? C.textMed : '#c2410c' }]}>
            {isDone ? 'Tamamlandı' : isWork ? 'ÇALIŞMA' : 'MOLA'}
          </Text>
        </View>

        {/* Timer */}
        <Text style={[s.clock, { color: isWork ? '#f59e0b' : C.orange }]}>
          {mins}:{secs}
        </Text>

        {/* Round dots */}
        <View style={s.roundsContainer}>
          <Text style={s.roundsLabel}>TUR</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
            {Array.from({ length: session.totalRounds }).map((_, i) => (
              <View key={i} style={[s.roundDot, {
                backgroundColor: i < timer.currentRound - 1 ? C.accent
                  : i === timer.currentRound - 1 ? (isWork ? C.accent : C.orange)
                  : C.border,
                opacity: i < timer.currentRound - 1 ? 0.5 : 1,
              }]} />
            ))}
          </View>
          <Text style={s.roundsCount}>{timer.currentRound} / {session.totalRounds}</Text>
        </View>

        {/* Duration info */}
        <Text style={s.durationInfo}>
          {timer.workMinutes} dk çalışma · {timer.breakMinutes} dk mola
        </Text>

        {/* End button */}
        <Pressable
          onPress={handleEnd}
          disabled={ending}
          style={[s.endBtn, { opacity: ending ? 0.5 : 1 }]}
        >
          <Text style={{ color: C.red, fontWeight: '600', fontSize: 14 }}>
            {ending ? 'Bitiriliyor…' : 'Oturumu Bitir'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topicBar: { backgroundColor: C.card, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  topicText: { color: C.textMed, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(251,191,36,0.1)' },
  badgeText: { fontWeight: '700', fontSize: 11, letterSpacing: 2 },
  clock: { fontFamily: 'monospace', fontSize: 80, fontWeight: '900', lineHeight: 90 },
  roundsContainer: { alignItems: 'center' },
  roundsLabel: { fontSize: 10, color: C.textLight, letterSpacing: 2 },
  roundDot: { width: 12, height: 12, borderRadius: 6 },
  roundsCount: { fontSize: 13, color: C.textLight },
  durationInfo: { fontSize: 12, color: C.textMed },
  endBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.redLight },
});
```

- [ ] **Step 3: Create `components/personal-room/SessionSummary.tsx`**

`requestAnimationFrame` works in React Native — port is direct.

```tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants/colors';

interface Props {
  topic: string;
  completedRounds: number;
  totalRounds: number;
  totalMinutes: number;
  xpAwarded: number;
  leveledUp: boolean;
  onNewSession: () => void;
  onGoHome: () => void;
}

export default function SessionSummary({ topic, completedRounds, totalRounds, totalMinutes, xpAwarded, leveledUp, onNewSession, onGoHome }: Props) {
  const early = completedRounds < totalRounds;
  const [displayXp, setDisplayXp] = useState(0);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    if (xpAwarded === 0) return;
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(eased * xpAwarded));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [xpAwarded]);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationLabel = hours > 0 ? `${hours}s ${mins}dk` : `${mins} dk`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>{early ? '⏹️' : '🎉'}</Text>
          <Text style={s.title}>{early ? 'Erken Bitirilen Oturum' : 'Oturum Tamamlandı!'}</Text>
          <Text style={s.topic} numberOfLines={1}>{topic}</Text>
        </View>

        <View style={s.stats}>
          <StatCard label="Tekrar" value={`${completedRounds}/${totalRounds}`} />
          <StatCard label="Süre" value={durationLabel} />
          <StatCard label="Denetim" value="—" />
        </View>

        <View style={s.xpCard}>
          <Text style={s.xpLabel}>KAZANILAN XP</Text>
          <Text style={s.xpValue}>+{displayXp}</Text>
          {leveledUp && <Text style={s.levelUp}>🏆 Seviye atladın!</Text>}
        </View>

        <Pressable style={s.btnPrimary} onPress={onNewSession}>
          <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Yeni Oturum Başlat</Text>
        </Pressable>
        <Pressable style={s.btnSecondary} onPress={onGoHome}>
          <Text style={{ color: C.textMed, fontWeight: '600', fontSize: 15 }}>Ana Sayfaya Dön</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.textMed }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  header: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: C.textDark, textAlign: 'center' },
  topic: { fontSize: 13, color: C.textLight, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  xpCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, alignItems: 'center' },
  xpLabel: { fontSize: 10, letterSpacing: 2, color: C.textLight, marginBottom: 4 },
  xpValue: { fontSize: 56, fontWeight: '900', color: '#f59e0b', lineHeight: 64 },
  levelUp: { fontSize: 14, fontWeight: '600', color: C.textMed, marginTop: 8 },
  btnPrimary: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnSecondary: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});
```

- [ ] **Step 4: Create `app/(main)/personal-room/index.tsx`**

```tsx
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { api, type StudySessionConfig, type StudySession } from '../../../lib/api';
import SetupWizard from '../../../components/personal-room/SetupWizard';
import StudySessionView from '../../../components/personal-room/StudySessionView';
import SessionSummary from '../../../components/personal-room/SessionSummary';

type Screen = 'setup' | 'session' | 'summary';

interface SummaryData {
  session: StudySession;
  xpResult: { xp: number; role: string; leveledUp: boolean };
}

export default function PersonalRoomScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('setup');
  const [session, setSession] = useState<StudySession | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  async function handleSetupComplete(config: StudySessionConfig) {
    if (!accessToken) return;
    try {
      const s = await api.createStudySession(config, accessToken);
      setSession(s);
      setScreen('session');
    } catch (e) {
      console.error(e);
    }
  }

  function handleSessionEnd(ended: StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }) {
    setSummary({ session: ended, xpResult: ended.xpResult });
    setScreen('summary');
  }

  if (screen === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (screen === 'session' && session && accessToken) {
    return (
      <StudySessionView
        session={session}
        token={accessToken}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  if (screen === 'summary' && summary) {
    const s = summary.session;
    const started = new Date(s.startedAt);
    const ended = s.endedAt ? new Date(s.endedAt) : new Date();
    const totalMinutes = Math.round((ended.getTime() - started.getTime()) / 60000);

    return (
      <SessionSummary
        topic={s.topic}
        completedRounds={s.completedRounds}
        totalRounds={s.totalRounds}
        totalMinutes={totalMinutes}
        xpAwarded={summary.xpResult.xp}
        leveledUp={summary.xpResult.leveledUp}
        onNewSession={() => { setSession(null); setSummary(null); setScreen('setup'); }}
        onGoHome={() => router.replace('/(auth)')}
      />
    );
  }

  return null;
}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/components/personal-room/ mobile/app/\(main\)/personal-room/
git commit -m "feat(mobile): add personal room screens (setup, session, summary)"
```

---

## Task 7: Community Rooms List

**Files:** `components/community/HexGrid.tsx`, `app/(main)/community/index.tsx`

- [ ] **Step 1: Create `components/community/HexGrid.tsx`**

SVG hexagons replacing CSS `clip-path`.

```tsx
import { Pressable, Text, View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { Room } from '../../lib/api';
import { C } from '../../constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const HEX_W = Math.min(150, (SCREEN_W - 48) / 3);
const HEX_H = Math.round(HEX_W * 1.1547);
const COLS = 3;
const ROW_STEP = Math.round(HEX_H * 0.75);
const HEX_COLORS = ['#ffb940', '#ffd34f'];

// Pointy-top hexagon SVG points for a 100×115.47 viewBox
const HEX_POINTS = '50,0 100,25 100,75 50,100 0,75 0,25';

function HexRoom({ room, onPress, index }: { room: Room; onPress: () => void; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = HEX_COLORS[index % HEX_COLORS.length];

  return (
    <Animated.View style={[{ width: HEX_W, height: HEX_H }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.92); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
        style={{ width: HEX_W, height: HEX_H, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute' }}>
          <Svg width={HEX_W} height={HEX_H} viewBox="0 0 100 115.47">
            <Polygon points={HEX_POINTS} fill={bg} />
          </Svg>
        </View>
        <Text style={s.roomTitle} numberOfLines={3}>{room.title}</Text>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  rooms: Room[];
  onRoomPress: (room: Room) => void;
}

export default function HexGrid({ rooms, onRoomPress }: Props) {
  const totalRows = Math.ceil(rooms.length / COLS);
  const containerH = (totalRows - 1) * ROW_STEP + HEX_H + 16;
  const containerW = COLS * HEX_W + Math.floor(HEX_W / 2);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ width: containerW, height: containerH, position: 'relative' }}>
          {rooms.map((room, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const isOddRow = row % 2 === 1;
            const x = col * HEX_W + (isOddRow ? Math.floor(HEX_W / 2) : 0);
            const y = row * ROW_STEP;

            return (
              <View key={room.id} style={{ position: 'absolute', left: x, top: y }}>
                <HexRoom room={room} onPress={() => onRoomPress(room)} index={i} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  roomTitle: {
    color: '#78350f', fontWeight: '700', fontSize: 12,
    textAlign: 'center', paddingHorizontal: 12, lineHeight: 16,
  },
});
```

- [ ] **Step 2: Create `app/(main)/community/index.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { api, type Room } from '../../../lib/api';
import HexGrid from '../../../components/community/HexGrid';
import { C } from '../../../constants/colors';

export default function CommunityScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRooms(accessToken ?? undefined)
      .then((all) => setRooms(all.filter((r) => r.type === 'COMMUNITY')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accessToken]);

  function handleRoomPress(room: Room) {
    router.push(`/(main)/community/${room.slug || room.id}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        <Text style={s.title}>TOPLULUK ODALARI</Text>
        <Text style={s.subtitle}>Bir odaya gir, sorularını sor ve cevapla.</Text>

        {loading && <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 40 }} />}

        {!loading && rooms.length === 0 && (
          <Text style={{ color: C.textMed, marginTop: 20 }}>Henüz topluluk odası yok.</Text>
        )}

        {!loading && rooms.length > 0 && (
          <HexGrid rooms={rooms} onRoomPress={handleRoomPress} />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: '900', color: C.textDark, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: C.textMed, marginTop: 4, marginBottom: 20 },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/components/community/HexGrid.tsx mobile/app/\(main\)/community/index.tsx
git commit -m "feat(mobile): add community rooms list with SVG hexagon grid"
```

---

## Task 8: Community Room Detail + Q&A

**Files:** `useRoomSocket.ts`, `QuestionCard.tsx`, `QASection.tsx`, `app/(main)/community/[roomId].tsx`

- [ ] **Step 1: Create `components/community/useRoomSocket.ts`**

Direct port — only change is using `WS_URL` from constants.

```ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Question } from '../../lib/api';
import { WS_URL } from '../../constants/config';

export interface Participant {
  userId: string;
  username: string;
}

export interface Toast {
  id: string;
  message: string;
}

export function useRoomSocket(roomId: string, token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);
  const [connected, setConnected] = useState(false);

  function addToast(message: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  useEffect(() => {
    const socket = io(WS_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('room:join', roomId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:users', (users: { userId: string; username: string }[]) => {
      setParticipants(users);
    });
    socket.on('room:user:joined', (user: { userId: string; username: string }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === user.userId)) return prev;
        return [...prev, user];
      });
      addToast(`${user.username} odaya katıldı`);
    });
    socket.on('room:user:left', (user: { userId: string; username: string }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== user.userId));
      addToast(`${user.username} odadan ayrıldı`);
    });
    socket.on('question:new', (q: Question) => {
      setNewQuestions((prev) => [q, ...prev]);
    });

    return () => {
      socket.emit('room:leave', roomId);
      socket.disconnect();
    };
  }, [roomId, token]);

  return { participants, toasts, newQuestions, connected };
}
```

- [ ] **Step 2: Create `components/community/QuestionCard.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, FlatList } from 'react-native';
import { api, type Question, type Answer } from '../../lib/api';
import { C } from '../../constants/colors';

interface Props {
  q: Question;
  accessToken?: string | null;
}

export default function QuestionCard({ q, accessToken }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [sending, setSending] = useState(false);
  const [upvotes, setUpvotes] = useState(q.upvotes);
  const [voting, setVoting] = useState(false);

  async function toggleExpand() {
    if (!expanded && answers.length === 0) {
      setLoadingAnswers(true);
      try {
        const res = await api.getAnswers(q.id);
        setAnswers(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAnswers(false);
      }
    }
    setExpanded((v) => !v);
  }

  async function handleVote() {
    if (!accessToken || voting) return;
    setVoting(true);
    try {
      const res = await api.voteQuestion(q.id, accessToken);
      setUpvotes(res.upvotes);
    } catch (e) {
      console.error(e);
    } finally {
      setVoting(false);
    }
  }

  async function handleAnswer() {
    if (!accessToken || !answerText.trim()) return;
    setSending(true);
    try {
      const a = await api.createAnswer(q.id, answerText.trim(), accessToken);
      setAnswers((prev) => [...prev, a]);
      setAnswerText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={s.card}>
      <Pressable onPress={toggleExpand}>
        <Text style={s.content}>{q.content}</Text>
        <View style={s.meta}>
          <Text style={s.author}>@{q.author.username}</Text>
          <Text style={s.answerCount}>{q._count?.answers ?? 0} cevap</Text>
        </View>
      </Pressable>

      {/* Vote button */}
      <Pressable onPress={handleVote} style={s.voteBtn} disabled={voting || !accessToken}>
        <Text style={s.voteText}>▲ {upvotes}</Text>
      </Pressable>

      {expanded && (
        <View style={s.answers}>
          {loadingAnswers && <Text style={{ color: C.textLight, fontSize: 12 }}>Yükleniyor…</Text>}

          {answers.map((a) => (
            <View key={a.id} style={s.answerRow}>
              <Text style={s.answerAuthor}>@{a.author.username}</Text>
              <Text style={s.answerContent}>{a.content}</Text>
            </View>
          ))}

          {accessToken && (
            <View style={s.replyRow}>
              <TextInput
                style={s.replyInput}
                placeholder="Cevabını yaz…"
                placeholderTextColor={C.textLight}
                value={answerText}
                onChangeText={setAnswerText}
                multiline
              />
              <Pressable
                style={[s.replyBtn, { opacity: !answerText.trim() || sending ? 0.4 : 1 }]}
                onPress={handleAnswer}
                disabled={!answerText.trim() || sending}
              >
                <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 13 }}>
                  {sending ? '…' : 'Yanıtla'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  content: { color: C.textDark, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: 11, color: C.textLight },
  answerCount: { fontSize: 11, color: C.textLight },
  voteBtn: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  voteText: { fontSize: 12, color: C.textMed, fontWeight: '600' },
  answers: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 8 },
  answerRow: { backgroundColor: '#fef9c3', borderRadius: 10, padding: 10 },
  answerAuthor: { fontSize: 10, color: C.textLight, marginBottom: 2 },
  answerContent: { fontSize: 13, color: C.textDark, lineHeight: 18 },
  replyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  replyInput: { flex: 1, backgroundColor: '#fef9c3', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: C.textDark, fontSize: 13 },
  replyBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
```

- [ ] **Step 3: Create `components/community/QASection.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api, type Question } from '../../lib/api';
import QuestionCard from './QuestionCard';
import { C } from '../../constants/colors';

interface Props {
  roomId: string;
  newQuestions: Question[];
  accessToken?: string | null;
}

export default function QASection({ roomId, newQuestions, accessToken }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getRoomQuestions(roomId, accessToken ?? undefined)
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!newQuestions.length) return;
    setQuestions((prev) => {
      const incoming = newQuestions[0];
      if (prev.some((q) => q.id === incoming.id)) return prev;
      return [incoming, ...prev];
    });
  }, [newQuestions]);

  async function handleSubmit() {
    if (!accessToken || !text.trim()) return;
    setSending(true);
    try {
      const q = await api.createQuestion(roomId, text.trim(), accessToken);
      setText('');
      setQuestions((prev) => {
        if (prev.some((p) => p.id === q.id)) return prev;
        return [q, ...prev];
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const deduped = questions.filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i);

  return (
    <View style={s.container}>
      <Text style={s.heading}>SORULAR & CEVAPLAR</Text>

      {accessToken && (
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Sorunuzu yazın…"
            placeholderTextColor={C.textLight}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable
            style={[s.sendBtn, { opacity: !text.trim() || sending ? 0.4 : 1 }]}
            onPress={handleSubmit}
            disabled={!text.trim() || sending}
          >
            <Text style={{ color: C.btnPrimaryText, fontWeight: '700' }}>
              {sending ? '…' : 'Sor'}
            </Text>
          </Pressable>
        </View>
      )}

      {loading && <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />}

      {!loading && deduped.length === 0 && (
        <Text style={{ color: C.textLight, fontSize: 13, marginTop: 12 }}>
          Bu odada henüz soru yok. İlk soruyu sen sor!
        </Text>
      )}

      <FlatList
        data={deduped}
        keyExtractor={(q) => q.id}
        renderItem={({ item }) => <QuestionCard q={item} accessToken={accessToken} />}
        showsVerticalScrollIndicator={false}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 16, fontWeight: '900', color: C.textDark, letterSpacing: 1, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#fef9c3', borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.textDark, fontSize: 14 },
  sendBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
});
```

- [ ] **Step 4: Create `app/(main)/community/[roomId].tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/authStore';
import { useRoomSocket } from '../../../components/community/useRoomSocket';
import QASection from '../../../components/community/QASection';
import { C } from '../../../constants/colors';

export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { accessToken, username } = useAuthStore();
  const { participants, toasts, newQuestions, connected } = useRoomSocket(roomId, accessToken);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.textMed, fontWeight: '600' }}>← Geri</Text>
        </Pressable>
        <View style={[s.connDot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
      </View>

      {/* Toasts */}
      {toasts.map((t) => (
        <View key={t.id} style={s.toast}>
          <Text style={s.toastText}>{t.message}</Text>
        </View>
      ))}

      <View style={s.body}>
        {/* Participants sidebar */}
        <View style={s.sidebar}>
          <Text style={s.sidebarTitle}>Katılımcılar</Text>
          <Text style={s.sidebarCount}>{participants.length} kişi</Text>
          <FlatList
            data={participants}
            keyExtractor={(p) => p.userId}
            renderItem={({ item }) => (
              <View style={s.participant}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.username[0]?.toUpperCase()}</Text>
                </View>
                <Text style={s.participantName} numberOfLines={1}>
                  {item.username}{item.username === username ? ' (sen)' : ''}
                </Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Q&A */}
        <View style={s.qa}>
          <QASection
            roomId={roomId}
            newQuestions={newQuestions}
            accessToken={accessToken}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  backBtn: { padding: 4 },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  toast: { backgroundColor: '#78350f', marginHorizontal: 16, marginTop: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  toastText: { color: '#fef9c3', fontSize: 12 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 100, backgroundColor: C.card, borderRightWidth: 1, borderRightColor: C.border, padding: 10 },
  sidebarTitle: { fontSize: 10, fontWeight: '700', color: C.textLight, letterSpacing: 1, marginBottom: 2 },
  sidebarCount: { fontSize: 11, color: C.textMed, marginBottom: 8 },
  participant: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.btnPrimaryText, fontWeight: '700', fontSize: 13 },
  participantName: { flex: 1, fontSize: 11, color: C.textDark },
  qa: { flex: 1 },
});
```

- [ ] **Step 5: Commit**

```bash
git add mobile/components/community/ mobile/app/\(main\)/community/\[roomId\].tsx
git commit -m "feat(mobile): add community room detail with Q&A and socket"
```

---

## Task 9: Navigation Wiring & Home Screen

**Files:** `app/(main)/index.tsx` (home screen with nav buttons + logout)

- [ ] **Step 1: Create `app/(main)/index.tsx`**

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { username, logout } = useAuthStore();

  function handleLogout() {
    logout();
    // AuthGuard redirects to /(auth)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        <Text style={s.welcome}>Merhaba, @{username}</Text>
        <Text style={s.tagline}>Bugün ne çalışıyoruz?</Text>

        <Pressable style={s.navBtn} onPress={() => router.push('/(main)/personal-room')}>
          <Text style={s.navBtnText}>Kişisel Oda</Text>
          <Text style={s.navBtnSub}>Kendi başına çalış</Text>
        </Pressable>

        <Pressable style={[s.navBtn, { backgroundColor: '#ffb940' }]}
          onPress={() => router.push('/(main)/community')}>
          <Text style={s.navBtnText}>Topluluk Odaları</Text>
          <Text style={s.navBtnSub}>Soru sor, cevapla</Text>
        </Pressable>

        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={{ color: C.textLight, fontSize: 13 }}>Çıkış Yap</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 28, justifyContent: 'center', gap: 16 },
  welcome: { fontSize: 26, fontWeight: '900', color: C.textDark },
  tagline: { fontSize: 14, color: C.textMed, marginBottom: 8 },
  navBtn: { backgroundColor: C.accent, borderRadius: 20, padding: 24 },
  navBtnText: { color: C.btnPrimaryText, fontWeight: '800', fontSize: 18 },
  navBtnSub: { color: C.btnPrimaryText, fontSize: 12, marginTop: 4, opacity: 0.7 },
  logoutBtn: { alignSelf: 'center', marginTop: 8, padding: 8 },
});
```

- [ ] **Step 2: Update AuthGuard redirect target**

In `app/_layout.tsx`, change the logged-in redirect from `'/(main)/personal-room'` to `'/(main)'`:
```tsx
router.replace('/(main)');
```

- [ ] **Step 3: Run all tests**

```bash
cd mobile && npx jest
```
Expected: PASS (all tests green)

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add mobile/app/\(main\)/index.tsx mobile/app/_layout.tsx
git commit -m "feat(mobile): add home screen and complete navigation wiring"
```

---

## Task 10: Expo Go Test

**Prerequisites:** Backend running, phone and computer on same WiFi.

- [ ] **Step 1: Find your computer's local IP**

```bash
# macOS/Linux
ipconfig getifaddr en0
# Windows PowerShell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
```

- [ ] **Step 2: Update `constants/config.ts`**

Replace `192.168.1.100` with your actual IP:
```ts
export const API_BASE_URL = 'http://YOUR_IP_HERE:3000';
export const WS_URL = API_BASE_URL;
```

- [ ] **Step 3: Start the backend**

```bash
cd backend && npm run start:dev
```

- [ ] **Step 4: Start Expo**

```bash
cd mobile && npx expo start
```

- [ ] **Step 5: Scan QR code with Expo Go on Android**

Open Expo Go → tap "Scan QR code" → scan the terminal QR.

- [ ] **Step 6: Smoke test checklist**

```
[ ] Auth screen loads (beehive button visible)
[ ] Tap beehive → AuthForm appears
[ ] Login with valid credentials → navigates to Home
[ ] "Kişisel Oda" → SetupWizard opens
[ ] Complete wizard → timer starts, phase shows "ÇALIŞMA"
[ ] "Oturumu Bitir" → SessionSummary with XP appears
[ ] "Topluluk Odaları" → hex grid loads
[ ] Tap a room → Q&A section loads
[ ] Post a question → appears in list
[ ] Logout → returns to auth screen
```

- [ ] **Step 7: Final commit**

```bash
git add mobile/constants/config.ts
git commit -m "feat(mobile): complete Android (Expo) port — ready for testing"
```
