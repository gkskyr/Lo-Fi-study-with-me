# CLIP Monitoring + Safari Uyumluluğu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC denetiminde dHash'i CLIP embeddings ile değiştir; Safari için `getDisplayMedia` yerine screenshot upload + `file.lastModified` doğrulama ekle.

**Architecture:** `lib/clip.ts` CLIP modelini singleton olarak yönetir (lazy import, sadece client-side). `useMonitoring.ts` PC embedding tipini `boolean[]`'den `number[]`'e değiştirir ve `checkPCSafari` ekler. `CalibrationView` model yükleme progress bar'ı gösterir. `CheckInModal` mount'ta Safari tespiti yapıp `pc-safari-upload` adımına dallanır.

**Tech Stack:** `@xenova/transformers` v2, `Xenova/clip-vit-base-patch32` (~170MB, CDN cache), Next.js 16 App Router, IndexedDB, `File.lastModified` API

**Spec:** `docs/superpowers/specs/2026-06-10-clip-monitoring-design.md`

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|-------|-----------|
| `frontend/package.json` | Düzenle | `@xenova/transformers` ekle, TF.js paketlerini çıkar |
| `frontend/next.config.ts` | Düzenle | WASM + serverExternalPackages ayarı |
| `frontend/src/lib/clip.ts` | **Yeni** | CLIP singleton, embed, similarity, browser detection |
| `frontend/src/components/personal-room/useMonitoring.ts` | Düzenle | pc tipi, checkPC→CLIP, checkPCSafari ekle |
| `frontend/src/components/personal-room/CalibrationView.tsx` | Düzenle | Model yükleme progress bar |
| `frontend/src/components/personal-room/CheckInModal.tsx` | Düzenle | Safari branch + pc-safari-upload adımı |
| `frontend/src/app/denetim/page.tsx` | Düzenle | Açıklama metni güncelle |

---

## Task 1: Paket kurulumu ve Next.js yapılandırması

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/next.config.ts`

- [ ] **Adım 1: `@xenova/transformers` yükle, kullanılmayan TF.js paketlerini kaldır**

`frontend/` dizininde çalıştır:
```bash
npm install @xenova/transformers
npm uninstall @tensorflow/tfjs @tensorflow-models/mobilenet
```

Beklenen: `node_modules/@xenova/transformers` oluşur, tf paketleri silinir.

- [ ] **Adım 2: `next.config.ts`'i güncelle**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@xenova/transformers"],
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Adım 3: Build'in geçtiğini doğrula**

`frontend/` dizininde:
```bash
npm run build
```

Beklenen: Build hatasız tamamlanır. TypeScript hatası yoksa devam et.  
Sorun çıkarsa: `node_modules/next/dist/docs/` altında ilgili yapılandırma kılavuzuna bak.

---

## Task 2: `lib/clip.ts` oluştur

**Files:**
- Create: `frontend/src/lib/clip.ts`

Bu modül tek bir yerde tutulur; başka dosyalar buradan import eder. Model `null` kontrolü ile singleton garantisi verilir. `_loadPromise` ile eş zamanlı yükleme çağrıları birleştirilir.

- [ ] **Adım 1: `lib/clip.ts` dosyasını oluştur**

```typescript
// CLIP model singleton + browser detection utilities
// All functions are client-side only (never called during SSR)

let _processor: any = null;
let _model: any = null;
let _loadPromise: Promise<void> | null = null;

export async function loadClipModel(onProgress?: (pct: number) => void): Promise<void> {
  if (_model) return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const { AutoProcessor, CLIPVisionModelWithProjection, env } =
      await import("@xenova/transformers");

    env.allowLocalModels = false;

    // Processor is small (~1 MB) — load without progress
    _processor = await AutoProcessor.from_pretrained(
      "Xenova/clip-vit-base-patch32",
    );

    // Model is ~170 MB — track progress
    _model = await CLIPVisionModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch32",
      {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (info.status === "progress" && onProgress) {
            onProgress(Math.round(info.progress ?? 0));
          }
        },
      },
    );
  })();

  return _loadPromise;
}

async function embedFromURL(url: string): Promise<number[]> {
  const { RawImage } = await import("@xenova/transformers");
  const image = await RawImage.fromURL(url);
  const inputs = await _processor(image);
  const { image_embeds } = await _model(inputs);
  return Array.from(image_embeds.data as Float32Array);
}

export async function embedFile(file: File): Promise<number[]> {
  const url = URL.createObjectURL(file);
  try {
    return await embedFromURL(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function embedVideoFrame(video: HTMLVideoElement): Promise<number[]> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
  );
  const url = URL.createObjectURL(blob);
  try {
    return await embedFromURL(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function clipSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
```

- [ ] **Adım 2: TypeScript hatasız derlendiğini doğrula**

```bash
cd frontend && npx tsc --noEmit
```

Beklenen: Hata yok. `@xenova/transformers` tip tanımları eksikse `npm install --save-dev @types/xenova__transformers` veya `any` tipi yeterli.

---

## Task 3: `useMonitoring.ts` güncelle

**Files:**
- Modify: `frontend/src/components/personal-room/useMonitoring.ts`

`pc` alanı `boolean[]` → `number[]` olur (CLIP embedding). Eski IDB verisi geçersiz kalır; `loadCalibration` sırasında boolean array okunursa `pc` olmamış gibi davranılır (kullanıcı yeniden kalibre eder).

- [ ] **Adım 1: Dosyanın tamamını aşağıdaki içerikle değiştir**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import {
  getBoxPixels, captureRegion, thumbprint, similarity,
} from "@/lib/monitoring";
import {
  loadClipModel, embedFile, embedVideoFrame, clipSimilarity, isSafari,
} from "@/lib/clip";

const IDB_DB = "kozan-monitoring";
const IDB_STORE = "calibration";

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbPut(key: string, value: unknown) {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => res((req.result as T) ?? null);
    req.onerror = () => rej(req.error);
  });
}

export interface CheckResult {
  passed: boolean;
  similarity: number;
}

interface Stored {
  cam?: number[];    // 32x32 grayscale thumbprint
  pc?: number[];     // 512-dim CLIP embedding
}

function isValidPcEmbedding(v: unknown): v is number[] {
  // Eski boolean[] verisini reddet; CLIP embedding 512 sayıdan oluşur
  return Array.isArray(v) && v.length === 512 && typeof v[0] === "number";
}

export interface UseMonitoringReturn {
  cameraCalibrated: boolean;
  pcCalibrated: boolean;
  loadCalibration: (userId: string) => Promise<{ camera: boolean; pc: boolean }>;
  calibrateCamera: (video: HTMLVideoElement, userId: string) => Promise<void>;
  calibratePC: (file: File, userId: string) => Promise<void>;
  checkCamera: (video: HTMLVideoElement) => Promise<CheckResult>;
  checkPC: () => Promise<CheckResult>;
  checkPCSafari: (file: File) => Promise<CheckResult>;
}

const CLIP_THRESHOLD = 0.72;

export function useMonitoring(): UseMonitoringReturn {
  const [cameraCalibrated, setCameraCalibrated] = useState(false);
  const [pcCalibrated, setPcCalibrated] = useState(false);
  const userIdRef = useRef("");
  const camThumbRef = useRef<number[] | null>(null);
  const pcEmbeddingRef = useRef<number[] | null>(null);

  async function persist(userId: string) {
    const data: Stored = {};
    if (camThumbRef.current) data.cam = camThumbRef.current;
    if (pcEmbeddingRef.current) data.pc = pcEmbeddingRef.current;
    await idbPut(`mon-${userId}`, data);
  }

  const loadCalibration = useCallback(async (userId: string) => {
    userIdRef.current = userId;
    const data = await idbGet<Stored>(`mon-${userId}`);
    if (!data) return { camera: false, pc: false };
    if (data.cam) { camThumbRef.current = data.cam; setCameraCalibrated(true); }
    if (isValidPcEmbedding(data.pc)) {
      pcEmbeddingRef.current = data.pc;
      setPcCalibrated(true);
    }
    return { camera: !!data.cam, pc: isValidPcEmbedding(data.pc) };
  }, []);

  const calibrateCamera = useCallback(async (video: HTMLVideoElement, userId: string) => {
    userIdRef.current = userId;
    const box = getBoxPixels(video);
    const img = captureRegion(video, box);
    camThumbRef.current = thumbprint(img);
    setCameraCalibrated(true);
    await persist(userId);
  }, []);

  const calibratePC = useCallback(async (file: File, userId: string) => {
    userIdRef.current = userId;
    // Model must already be loaded (CalibrationView calls loadClipModel before this)
    pcEmbeddingRef.current = await embedFile(file);
    setPcCalibrated(true);
    await persist(userId);
  }, []);

  const checkCamera = useCallback(async (video: HTMLVideoElement): Promise<CheckResult> => {
    if (!camThumbRef.current) return { passed: true, similarity: 1 };
    const box = getBoxPixels(video);
    const current = captureRegion(video, box);
    const sim = similarity(camThumbRef.current, thumbprint(current));
    return { passed: sim > 0.65, similarity: sim };
  }, []);

  // Non-Safari: captures screen via getDisplayMedia, embeds with CLIP
  const checkPC = useCallback(async (): Promise<CheckResult> => {
    if (!pcEmbeddingRef.current) return { passed: true, similarity: 1 };
    if (isSafari()) return { passed: false, similarity: 0 }; // Safari uses checkPCSafari

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const sv = document.createElement("video");
      sv.srcObject = stream;
      sv.muted = true;
      await sv.play();
      await new Promise((r) => setTimeout(r, 400));

      const embedding = await embedVideoFrame(sv);
      const sim = clipSimilarity(pcEmbeddingRef.current, embedding);
      return { passed: sim > CLIP_THRESHOLD, similarity: sim };
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }, []);

  // Safari: user uploads a screenshot, we embed and compare
  const checkPCSafari = useCallback(async (file: File): Promise<CheckResult> => {
    if (!pcEmbeddingRef.current) return { passed: true, similarity: 1 };
    const embedding = await embedFile(file);
    const sim = clipSimilarity(pcEmbeddingRef.current, embedding);
    return { passed: sim > CLIP_THRESHOLD, similarity: sim };
  }, []);

  return {
    cameraCalibrated, pcCalibrated, loadCalibration,
    calibrateCamera, calibratePC,
    checkCamera, checkPC, checkPCSafari,
  };
}
```

- [ ] **Adım 2: TypeScript kontrolü**

```bash
cd frontend && npx tsc --noEmit
```

Beklenen: Hata yok.

---

## Task 4: `CalibrationView.tsx` — model yükleme progress bar

**Files:**
- Modify: `frontend/src/components/personal-room/CalibrationView.tsx`

Sadece `savePc` fonksiyonu ve state değişir. Kamera kalibrasyonu ve diğer adımlar aynı kalır.

- [ ] **Adım 1: Import satırını güncelle**

Mevcut:
```typescript
import { useMonitoring } from "./useMonitoring";
```

Yeni (dosyanın başına ekle):
```typescript
import { loadClipModel } from "@/lib/clip";
import { useMonitoring } from "./useMonitoring";
```

- [ ] **Adım 2: `clipProgress` state ekle**

`const [saving, setSaving] = useState(false);` satırının hemen altına:
```typescript
const [clipProgress, setClipProgress] = useState<number | null>(null);
```

- [ ] **Adım 3: `savePc` fonksiyonunu değiştir**

Mevcut:
```typescript
async function savePc() {
  if (!pcFile) return;
  setSaving(true);
  await mon.calibratePC(pcFile, userId);
  if (pcPreview) URL.revokeObjectURL(pcPreview);
  setSaving(false);
  setStep("done");
}
```

Yeni:
```typescript
async function savePc() {
  if (!pcFile) return;
  setSaving(true);
  setClipProgress(0);
  await loadClipModel((pct) => setClipProgress(pct));
  setClipProgress(null);
  await mon.calibratePC(pcFile, userId);
  if (pcPreview) URL.revokeObjectURL(pcPreview);
  setSaving(false);
  setStep("done");
}
```

- [ ] **Adım 4: Progress bar UI ekle — `pc-upload` adımındaki `Btn` içinde**

`{pcFile && (` bloğunun hemen üstüne:
```tsx
{clipProgress !== null && (
  <div className="w-full">
    <p className="text-xs text-yellow-600 mb-1 text-center">
      AI modeli hazırlanıyor… %{clipProgress}
    </p>
    <div className="w-full rounded-full h-2" style={{ background: "#3c1a0a" }}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${clipProgress}%`, background: "#ffd000" }}
      />
    </div>
  </div>
)}
```

---

## Task 5: `CheckInModal.tsx` — Safari branch

**Files:**
- Modify: `frontend/src/components/personal-room/CheckInModal.tsx`

- [ ] **Adım 1: Import satırlarını güncelle**

Mevcut:
```typescript
import { useMonitoring } from "./useMonitoring";
```

Yeni:
```typescript
import { isSafari, isIOS } from "@/lib/clip";
import { useMonitoring } from "./useMonitoring";
```

- [ ] **Adım 2: Step tipine `"pc-safari-upload"` ekle**

Mevcut:
```typescript
type Step = "loading" | "cam-wait" | "cam-countdown" | "pc-share" | "checking" | "result";
```

Yeni:
```typescript
type Step = "loading" | "cam-wait" | "cam-countdown" | "pc-share" | "pc-safari-upload" | "checking" | "result";
```

- [ ] **Adım 3: `safariFileError` state ekle**

`const [simScore, setSimScore] = useState(0);` satırının altına:
```typescript
const [safariFileError, setSafariFileError] = useState<string | null>(null);
```

- [ ] **Adım 4: Kalibrasyon useEffect'ini güncelle — Safari tespiti**

Mevcut:
```typescript
useEffect(() => {
  mon.loadCalibration(userId).then(() => {
    if (monitoringType === "PC") setStep("pc-share");
    else setStep("cam-wait");
  });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Yeni:
```typescript
useEffect(() => {
  mon.loadCalibration(userId).then(() => {
    if (monitoringType === "PC") {
      setStep(isSafari() ? "pc-safari-upload" : "pc-share");
    } else {
      setStep("cam-wait");
    }
  });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Ayrıca `runCamCheck` fonksiyonunda BOTH modunda PC'ye geçiş satırı:

Mevcut:
```typescript
if (monitoringType === "BOTH") {
  setStep("pc-share");
```

Yeni:
```typescript
if (monitoringType === "BOTH") {
  setStep(isSafari() ? "pc-safari-upload" : "pc-share");
```

- [ ] **Adım 5: `handleSafariFile` fonksiyonu ekle**

`runPcCheck` fonksiyonunun hemen altına:
```typescript
async function handleSafariFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  // lastModified check — skip on iOS (WebKit bug)
  if (!isIOS()) {
    const ageMs = Date.now() - file.lastModified;
    if (ageMs > 90_000) {
      setSafariFileError("Ekran görüntüsü çok eski. Lütfen yeni bir tane çek ve yükle.");
      return;
    }
  }

  setSafariFileError(null);
  setStep("checking");
  try {
    const result = await mon.checkPCSafari(file);
    if (monitoringType === "BOTH") {
      const both = (notebookPassedRef.current ?? true) && result.passed;
      finish(both, result.similarity);
    } else {
      finish(result.passed, result.similarity);
    }
  } catch {
    finish(false, 0);
  }
}
```

- [ ] **Adım 6: `pc-safari-upload` UI ekle**

`{step === "pc-share" && (` bloğunun hemen altına (kapatma parantezinin ardından):
```tsx
{step === "pc-safari-upload" && (
  <div className="space-y-4">
    {monitoringType === "BOTH" && (
      <p className="text-xs text-yellow-700">Kamera tamam. Şimdi ekranı doğrulayalım.</p>
    )}
    <p className="text-sm text-yellow-400">
      Çalışma materyalini ekrana aç, ardından ekran görüntüsü çek ve yükle.
    </p>
    <p className="text-xs text-yellow-700">
      Mac: <strong className="text-yellow-300">Cmd+Shift+4</strong> ·
      Windows: <strong className="text-yellow-300">Win+Shift+S</strong>
    </p>
    {safariFileError && (
      <p className="text-xs text-red-400">{safariFileError}</p>
    )}
    <label
      className="w-full py-2.5 rounded-xl text-sm font-semibold text-center block cursor-pointer"
      style={{ background: "#ffd000", color: "#1c0a00" }}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSafariFile}
      />
      Ekran görüntüsü yükle
    </label>
  </div>
)}
```

- [ ] **Adım 7: TypeScript kontrolü**

```bash
cd frontend && npx tsc --noEmit
```

Beklenen: Hata yok.

---

## Task 6: `denetim/page.tsx` — CLIP + Safari desteği

**Files:**
- Modify: `frontend/src/app/denetim/page.tsx`

- [ ] **Adım 1: Import satırlarını güncelle**

Mevcut (dosyanın başı):
```typescript
import { useMonitoring, type CheckResult } from "@/components/personal-room/useMonitoring";
```

Yeni:
```typescript
import { loadClipModel, isSafari, isIOS } from "@/lib/clip";
import { useMonitoring, type CheckResult } from "@/components/personal-room/useMonitoring";
```

- [ ] **Adım 2: `clipProgress` state ekle**

`const [existing, setExisting] = useState...` satırının hemen altına:
```typescript
const [clipProgress, setClipProgress] = useState<number | null>(null);
```

- [ ] **Adım 3: `savePc` fonksiyonunu güncelle — model yükleme ekle**

Mevcut:
```typescript
async function savePc() {
  if (!pcFile) return;
  await mon.calibratePC(pcFile, TEST_USER);
  if (pcPreview) URL.revokeObjectURL(pcPreview);
  setPcStep("saved");
  setExisting((prev) => ({ ...prev!, pc: true }));
}
```

Yeni:
```typescript
async function savePc() {
  if (!pcFile) return;
  setClipProgress(0);
  await loadClipModel((pct) => setClipProgress(pct));
  setClipProgress(null);
  await mon.calibratePC(pcFile, TEST_USER);
  if (pcPreview) URL.revokeObjectURL(pcPreview);
  setPcStep("saved");
  setExisting((prev) => ({ ...prev!, pc: true }));
}
```

- [ ] **Adım 4: Progress bar UI ekle — PC section'ında `savePc` butonunun üstüne**

`{pcFile && pcStep === "idle" && <Btn onClick={savePc}>Referans Olarak Kaydet</Btn>}` satırının hemen üstüne:
```tsx
{clipProgress !== null && (
  <div className="w-full mb-2">
    <p className="text-xs text-yellow-600 mb-1 text-center">
      AI modeli hazırlanıyor… %{clipProgress}
    </p>
    <div className="w-full rounded-full h-2" style={{ background: "#3c1a0a" }}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${clipProgress}%`, background: "#ffd000" }}
      />
    </div>
  </div>
)}
```

- [ ] **Adım 5: `runTest` fonksiyonunu güncelle — Safari'de `checkPCSafari` kullan**

Mevcut PC test bloğu:
```typescript
if (existing?.pc) {
  try {
    const r = await mon.checkPC();
    setPcResult(r);
  } catch {
    setPcResult({ passed: false, similarity: 0 });
  }
}
```

Yeni:
```typescript
if (existing?.pc) {
  try {
    if (isSafari()) {
      // Safari: open file picker for screenshot
      const file = await new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.oncancel = () => resolve(null);
        input.click();
      });
      if (!file) {
        setPcResult({ passed: false, similarity: 0 });
      } else if (!isIOS() && Date.now() - file.lastModified > 90_000) {
        alert("Ekran görüntüsü çok eski, lütfen yeni bir tane çek.");
        setPcResult({ passed: false, similarity: 0 });
      } else {
        const r = await mon.checkPCSafari(file);
        setPcResult(r);
      }
    } else {
      const r = await mon.checkPC();
      setPcResult(r);
    }
  } catch {
    setPcResult({ passed: false, similarity: 0 });
  }
}
```

- [ ] **Adım 7: Açıklama metni güncelle**

Mevcut:
```tsx
<p className="text-xs text-yellow-800 mb-6">
  Kamera: 32x32 MAD karşılaştırması (eşik: 65%) · PC: 256-bit dHash (eşik: 72%)
</p>
```

Yeni:
```tsx
<p className="text-xs text-yellow-800 mb-6">
  Kamera: 32x32 MAD karşılaştırması (eşik: 65%) · PC: CLIP embeddings (eşik: 72%)
  {" · "}
  <span className="text-yellow-900">Safari&apos;de PC kontrolü ekran görüntüsü yüklemeyle çalışır</span>
</p>
```

- [ ] **Adım 8: PC saved mesajını güncelle**

Mevcut:
```tsx
{pcStep === "saved" && <p className="text-center text-xs text-yellow-500">✅ PC referansı kaydedildi (dHash)</p>}
```

Yeni:
```tsx
{pcStep === "saved" && <p className="text-center text-xs text-yellow-500">✅ PC referansı kaydedildi (CLIP)</p>}
```

---

## Task 7: Manuel end-to-end test

Sunucuyu başlat:
```bash
cd frontend && npm run dev
```

**Test A — Chrome/Edge: Normal PC akışı**
- [ ] `http://localhost:3000/denetim` aç
- [ ] Çalışma materyalinin görselini yükle → "Referans Olarak Kaydet" → "AI modeli hazırlanıyor" progress bar görünür mü? (ilk seferde)
- [ ] "Denetimi Test Et" → ekran paylaşımı iste → materyali göster → "Geçti ✓" ve %72+ benzerlik bekle
- [ ] Aynı testi farklı içerikle (boş masaüstü, YouTube) tekrarla → "Kaldı ✗" ve düşük benzerlik bekle

**Test B — Safari: Screenshot upload akışı**
- [ ] Safari'de `http://localhost:3000/denetim` aç
- [ ] Kalibrasyon yap
- [ ] "Denetimi Test Et" → "Ekran görüntüsü yükle" butonu çıkıyor mu?
- [ ] `Cmd+Shift+4` ile materyalin açık olduğu ekranı çek → yükle → "Geçti ✓"
- [ ] 90 sn bekleyip eski bir PNG yükle → "Ekran görüntüsü çok eski" hatası çıkıyor mu?

**Test C — Kişisel oda akışı**
- [ ] Giriş yap → Kişisel Oda → PC denetimi seç → kalibrasyon ekranı açık
- [ ] Görsel yükle → progress bar → "Kaydet" → oturum başlat
- [ ] İlk tur bitince CheckInModal açılır → Chrome'da "Ekranı Paylaş", Safari'de "Ekran görüntüsü yükle" görmeli
