# CLIP Monitoring + Safari Uyumluluğu — Tasarım Dokümanı

**Tarih:** 2026-06-10  
**Kapsam:** PC denetimini dHash'ten CLIP'e geçirmek; Safari için screenshot upload + lastModified doğrulama

---

## Problem

Mevcut PC denetimi 256-bit dHash kullanıyor: tüm ekranı tek bir hash'e sıkıştırıp referansla karşılaştırıyor. Bu "ekranın genel tonu referansa benziyor mu?" sorusunu soruyor; "referans görsel ekranda görünüyor mu?" sorusunu değil. Sonuç: inek fotoğrafı referans, YouTube ekranı %76 geçti.

Ek sorun: `getDisplayMedia` Safari'de kullanılamıyor, PC modu Safari'de tamamen kırık.

---

## Çözüm

PC karşılaştırmasını **CLIP embeddings** (Transformers.js) ile değiştir. CLIP iki görseli semantik içeriklerine göre karşılaştırır — piksel ortalaması ya da gradient yönü değil. Safari için `getDisplayMedia` yerine manuel screenshot upload + `file.lastModified` doğrulaması.

---

## Mimari

### Yeni / Değişen Dosyalar

```
frontend/
├── src/
│   ├── lib/
│   │   ├── clip.ts              ← YENİ
│   │   └── monitoring.ts        ← değişmez (dHash fonksiyonları kalır, kullanılmaz)
│   └── components/personal-room/
│       ├── useMonitoring.ts     ← pc embedding tipi + checkPCSafari
│       ├── CalibrationView.tsx  ← model yükleme progress bar
│       └── CheckInModal.tsx     ← pc-safari-upload adımı
├── next.config.ts               ← WASM webpack ayarı
└── package.json                 ← @xenova/transformers
```

---

## `lib/clip.ts`

Sorumluluk: CLIP modelini singleton olarak yönet, görselleri embed et, benzerlik hesapla, tarayıcı tespiti yap.

```typescript
// Model
loadClipModel(onProgress?: (pct: number) => void): Promise<void>
  // Model: Xenova/clip-vit-base-patch32 (~170MB, ilk yüklemede indirilir, sonra cache)
  // İkinci çağrıda model zaten hazırsa erken döner

// Embedding
embedFile(file: File): Promise<Float32Array>           // 512-dim
embedVideoFrame(video: HTMLVideoElement): Promise<Float32Array>  // 512-dim

// Karşılaştırma
clipSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number
  // Cosine similarity, 0.0–1.0
  // Aynı içerik: ~0.85–0.95
  // Tamamen farklı: ~0.10–0.30
  // Eşik: 0.72

// Tarayıcı tespiti
isSafari(): boolean
  // /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
isIOS(): boolean
  // /iPad|iPhone|iPod/.test(ua) || (MacIntel + maxTouchPoints > 1)
```

---

## `useMonitoring.ts`

### IDB Tipi Değişikliği

```typescript
// Eski
interface Stored { cam?: number[]; pc?: boolean[]; }  // boolean[] = 256-bit dHash

// Yeni
interface Stored { cam?: number[]; pc?: number[]; }   // number[] = 512-dim CLIP embedding
```

Geriye dönük uyumluluk yok. Eski boolean[] veri okunduğunda CLIP embeddings beklendiği için karşılaştırma başarısız olur → kullanıcı yeniden kalibre eder. Sessizce handle edilir.

### Yeni İmzalar

```typescript
calibratePC(file: File, userId: string): Promise<void>
  // CLIP modeli yüklü olmalı (CalibrationView yükler)
  // embedFile(file) → 512-dim embedding → IDB'ye yaz

checkPC(): Promise<CheckResult>
  // Safari DEĞİLSE:
  //   getDisplayMedia → video frame → embedVideoFrame → clipSimilarity → eşik 0.72
  // Safari İSE:
  //   { passed: false, similarity: 0 } döner (CheckInModal Safari branch'i kullanır)

checkPCSafari(file: File): Promise<CheckResult>
  // embedFile(file) → clipSimilarity → eşik 0.72
  // (lastModified kontrolü CheckInModal'da yapılır, burada değil)
```

---

## `CalibrationView.tsx`

### PC Upload Adımındaki Değişiklik

`savePc()` çağrıldığında:

1. Model yüklü değilse `loadClipModel(onProgress)` çağrılır
2. Progress state güncellenir → UI:

```
[████████░░░░░░░]  AI modeli hazırlanıyor… %67
```

3. Model hazır → `calibratePC(file, userId)` → "done" adımına geç

Model cachelenmişse (~200ms) progress bar görünmeden geçer.

### Yeni State

```typescript
const [clipProgress, setClipProgress] = useState<number | null>(null);
// null → gösterme, 0–100 → progress bar
```

---

## `CheckInModal.tsx`

### Yeni Step

```typescript
type Step = "loading" | "cam-wait" | "cam-countdown" | "pc-share"
          | "pc-safari-upload"   // ← yeni
          | "checking" | "result";
```

### Safari Tespiti

```typescript
// loadCalibration tamamlanınca:
if (monitoringType === "PC" || monitoringType === "BOTH") {
  setStep(isSafari() ? "pc-safari-upload" : "pc-share");
} else {
  setStep("cam-wait");
}
```

### `pc-safari-upload` UI

```
Çalışma materyalini ekrana aç.
Cmd+Shift+4 (Mac) veya Win+Shift+S (Windows) ile ekran görüntüsü al.
Aşağıya yükle.

[  Dosya seç  ]

← dosya seçilince lastModified kontrolü:
   isIOS() → atla
   Date.now() - file.lastModified > 90_000 → hata: "Ekran görüntüsü çok eski, lütfen yeni çek"
   geçerliyse → checkPCSafari(file) → "checking" → "result"
```

### `runPcCheck()` Değişikliği

```typescript
// Mevcut: mon.checkPC() → dHash karşılaştırma
// Yeni:   mon.checkPC() → CLIP karşılaştırma (aynı imza, içerik değişiyor)
```

---

## `next.config.ts` — WASM Ayarı

Transformers.js WebAssembly kullandığı için Next.js webpack yapılandırmasına ek gerekiyor:

```typescript
webpack(config) {
  config.resolve.fallback = { ...config.resolve.fallback, fs: false };
  return config;
}
```

Ayrıca `serverExternalPackages: ['@xenova/transformers']` eklenmeli.

---

## Paket

```bash
npm install @xenova/transformers
```

`@tensorflow/tfjs` ve `@tensorflow-models/mobilenet` package.json'dan kaldırılabilir (kullanılmıyor).

---

## Eşikler

| Yöntem | Eşik | Aynı içerik | Farklı içerik |
|--------|------|-------------|----------------|
| dHash (eski) | 0.72 | ~0.85 | ~0.50 (zayıf!) |
| CLIP (yeni) | 0.72 | ~0.85–0.95 | ~0.10–0.30 |

---

## lastModified Doğrulama

- Limit: **90 saniye**
- iOS'ta atlanır (WebKit `lastModified` bug)
- Hata mesajı: "Ekran görüntüsü çok eski, lütfen yeni bir ekran görüntüsü çek"
- Spoof riski: düşük (terminal ile timestamp değiştirmek öğrenci için fazla uğraş)

---

## Ele Alınmayan Konular

- Kamera denetimi (MAD/thumbprint) değişmiyor
- dHash fonksiyonları `monitoring.ts`'te kalıyor ama artık çağrılmıyor
- `useTeachableMachine.ts` hâlâ ölü kod, bu PR kapsamında silinmiyor
