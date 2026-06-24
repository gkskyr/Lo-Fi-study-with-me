# koZan Android (Expo) Dönüşüm Tasarımı

**Tarih:** 2026-06-11  
**Yazar:** Göksu Kayar  
**Durum:** Onaylandı

---

## 1. Kapsam

### Dahil
- Auth sistemi (giriş, kayıt, e-posta OTP doğrulama)
- Kişisel çalışma odası (kurulum sihirbazı, zamanlayıcı, oturum özeti, XP)
- Topluluk odaları (katılım, katılımcı listesi)
- Soru-Cevap sistemi (soru oluşturma, oylama, cevap ekleme)
- XP / seviye sistemi

### Dışarıda (sonraya bırakıldı)
- Monitoring sistemi (kamera kalibrasyon, check-in modal, yüz tanıma)
- Denetim sayfası (`/denetim`)
- Agora RTC video görüşme (Managed Workflow desteklemiyor)

---

## 2. Teknik Mimari

### Proje Yapısı
Yeni bir klasör: `mobile/` (mevcut `frontend/` ve `backend/` yanına)

```
koZan/
  frontend/       # mevcut Next.js web
  backend/        # mevcut NestJS (değişmez)
  mobile/         # yeni Expo uygulaması
    app/          # Expo Router — Next.js App Router ile aynı mantık
      (auth)/
        index.tsx       # giriş/kayıt
      personal-room/
        index.tsx
      community/
        index.tsx
        [roomId].tsx
    components/   # web'deki components/ ile birebir karşılık
    store/        # aynı Zustand store (authStore.ts kopyalanır)
    lib/          # API istemcisi, socket config
    constants/    # renkler, boyutlar, API URL
```

### Routing
- **Expo Router** — Next.js App Router ile aynı dosya bazlı yaklaşım
- Web'deki sayfa hiyerarşisi bire bir korunur

### Styling
- **NativeWind 4** — Tailwind class'larını React Native'e taşır
- Web'deki renk paleti (`tailwind.config`) aynen kopyalanır
- `StyleSheet` fallback sadece NativeWind desteklemediği durumlar için

### State Management
- Mevcut **Zustand** `authStore.ts` kopyalanır, `localStorage` → `AsyncStorage` ile değiştirilir (tek fark)

### Animasyonlar
- Framer Motion yerine **React Native Reanimated 3** (Expo Managed destekler)
- Kritik animasyonlar (BeehiveButton, hexagon geçişleri) taşınır, kalanlar sade tutulur

### Ağ / API
- `lib/api.ts` — tüm HTTP istekleri burada, base URL tek yerden ayarlanır
- Geliştirmede: `http://<bilgisayar-IP>:3000` (ngrok alternatif)
- Production'da: deploy edilen backend URL'i
- **Socket.io-client** doğrudan çalışır (değişiklik yok)

---

## 3. Ekranlar ve Bileşenler

### Auth Ekranı (`app/(auth)/index.tsx`)
Web'deki `AuthForm.tsx` baz alınır:
- Login / Register / OTP modları aynı
- Input alanları `TextInput` ile, buton animasyonu Reanimated ile
- Klavye açıldığında `KeyboardAvoidingView` ile form yukarı kayar

### Kişisel Çalışma Odası (`app/personal-room/index.tsx`)
Web'deki üç bileşen (SetupWizard, StudySessionView, SessionSummary) korunur:
- **SetupWizard**: 3 adım, konu girişi, çalışma yöntemi seçimi (monitoring adımı gösterilmez)
- **StudySessionView**: Zamanlayıcı, faz göstergesi, round hexagonları — kamera feed yok
- **SessionSummary**: XP özeti, seviye atlama bildirimi

### Topluluk (`app/community/index.tsx`)
- Hexagon panel UI — `react-native-svg` ile çizilir (web'de SVG/CSS ile yapılmış)
- Oda listesi, katılım butonu

### Topluluk Odası (`app/community/[roomId].tsx`)
- Katılımcı listesi (avatar + isim)
- **Soru-Cevap bölümü**: `FlatList` bazlı, web'deki `QASection` + `QuestionCard` taşınır
- Video grid yok (Agora kapsam dışı)

---

## 4. Değiştirilen / Uyarlanan Şeyler

| Web (Next.js) | Mobile (Expo) |
|---|---|
| `localStorage` | `AsyncStorage` |
| Framer Motion | React Native Reanimated 3 |
| Tailwind CSS | NativeWind 4 |
| `<div>`, `<p>`, `<button>` | `View`, `Text`, `Pressable` |
| `next/navigation` (useRouter) | `expo-router` (useRouter) |
| CSS hexagon (clip-path) | `react-native-svg` |
| `window`, `document` API | yok (atlanır) |
| `getDisplayMedia` (ekran paylaşımı) | yok (monitoring dışarıda) |
| Sharp görüntü işleme | yok (monitoring dışarıda) |

---

## 5. Bağımlılıklar (Yeni mobile/ paketi)

```json
{
  "expo": "~53.0",
  "expo-router": "~4.0",
  "react-native": "0.79",
  "nativewind": "^4.0",
  "tailwindcss": "^3.4",
  "react-native-reanimated": "~3.17",
  "react-native-safe-area-context": "~5.4",
  "react-native-screens": "~4.4",
  "react-native-svg": "~15.11",
  "@react-native-async-storage/async-storage": "~2.1",
  "socket.io-client": "^4.8.3",
  "zustand": "^5.0.13",
  "expo-font": "~13.3",
  "expo-status-bar": "~2.2"
}
```

---

## 6. Backend

**Hiçbir değişiklik yapılmaz.** Backend zaten REST API + WebSocket sunuyor. Sadece `CORS` ayarlarında mobil origin'e izin verildiğinden emin olunur (şu an `*` ise sorun yok).

---

## 7. Test Süreci (Expo Go)

1. `cd mobile && npx expo start`
2. Telefonda Expo Go uygulamasını aç
3. QR kodu tara
4. Backend için bilgisayar IP'si `constants/config.ts`'de ayarlanır

> **Not:** Agora kullanılmadığı için Expo Go yeterli — development build gerekmez.

---

## 8. Uygulama Adımları (Önerilen Sıra)

1. **Expo projesi kurulumu** — `mobile/` klasörü, Expo Router, NativeWind, bağımlılıklar
2. **Auth ekranı** — giriş, kayıt, OTP, Zustand store
3. **API katmanı** — `lib/api.ts`, config, socket client
4. **Kişisel çalışma odası** — SetupWizard, StudySessionView (monitoring'siz), SessionSummary
5. **Topluluk listesi** — hexagon UI, oda listesi
6. **Topluluk odası** — katılımcı listesi, Soru-Cevap sistemi
7. **Genel cila** — navigasyon akışı, hata ekranları, yükleme durumları
