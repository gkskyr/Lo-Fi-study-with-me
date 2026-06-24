# koZan — Topluluk Sayfası Tasarım Speci

**Tarih:** 2026-05-08  
**Branch:** backend → community-page  
**Kapsam:** `/community` rotası — HexagonPanel (ses odası görünümü) + SORULAR & CEVAPLAR bölümü

---

## 1. Genel Bakış

Topluluk sayfası iki ana bölümden oluşur: sol üstte büyük altıgen (ses odası), sağda reddit benzeri soru/cevap akışı. Altıgen küçüldüğünde Q&A bölümü tüm genişliğe yayılır. Renk paleti ve font giriş sayfasıyla aynıdır (`#ffec8c` arka plan, `#ffd000` vurgu).

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────┐
│  [HexagonPanel - sol üst]   [QASection - sağ/kalan]      │
│  altıgen büyükken ~420px    altıgen büyükken ~kalan alan  │
│  altıgen küçükken ~140px    altıgen küçükken ~full width  │
└──────────────────────────────────────────────────────────┘
```

- Flexbox row, `items-start`
- HexagonPanel genişliği Framer Motion ile animate edilir
- QASection `flex-1` alır → otomatik genişler/daralır

---

## 3. HexagonPanel

### 3.1 Görünüm

| Durum | Genişlik | Yükseklik |
|-------|----------|-----------|
| Expanded | `~420px` | `~480px` |
| Collapsed | `~140px` | `~160px` |

- `hexagon (1).png` PNG'si frame olarak kullanılır (`<Image>` absoluteolarak kaplayan)
- `lofi-girl.jpg` altıgen clip-path ile içeride gösterilir: `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`
- Sol üst köşede küçük `×` butonu — hover'da görünür, tıklanınca toggle

### 3.2 Animasyon

- Framer Motion `motion.div` ile `width`, `height` tween `ease: "easeInOut"`, `duration: 0.4s`
- `×` butonu: `AnimatePresence` ile hover'da `opacity 0→1`, `scale 0.8→1`

### 3.3 Kullanıcı Listesi (ses odası)

- Expanded modda altıgenin alt yarısında kullanıcı profil ikonları — yatay sıra, `w-8 h-8 rounded-full`
- Kullanıcı adı altında küçük etiket
- Kamera açık olanların üstünde küçük video ikonu overlay
- Sağ tıklama → context menu: "Spam Gönder" (UI only, henüz işlevsiz)
- Collapsed modda sadece altıgen frame gösterilir, kullanıcılar gizlenir

### 3.4 Bildirimler (Join/Leave Toast)

- Biri katılınca/ayrılınca sağ kenarda 3 saniyelik yarı şeffaf toast: `bg-yellow-100/70 backdrop-blur-sm`
- Framer Motion `AnimatePresence` ile `x: 40→0`, `opacity 0→1`, 3s sonra `opacity→0`

---

## 4. QASection — SORULAR & CEVAPLAR

### 4.1 Başlık

```
SORULAR & CEVAPLAR
```
`text-3xl font-bold text-amber-900`, `mb-6`

### 4.2 QuestionCard

Her kart için:

```
┌─────────────────────────────────────────────────────────┐
│ [↑ arrow]  │  Kullanıcı adı  •  zaman         [🍯 dipper] │
│ [🔖 bkm]  │  Soru başlığı (bold)                         │
│ [⚠ spam]  │  Soru içeriği (2 satır preview)              │
│            │  Cevap sayısı  •  Oy sayısı                 │
└─────────────────────────────────────────────────────────┘
```

- Sol kolon: `arrow.png`, `bookmark.png`, `spam.png` dikey sıralı, `w-5 h-5`, tıklanabilir (state değiştirir, backend yok)
- Sağ üst: `honey-dipper.png` — tıklanabilir görsel, henüz filtreleme yok
- Kart stili: `bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-3`
- Hover: `border-yellow-400 shadow-sm transition`

### 4.3 Mock Veri

Şimdilik 5 adet statik soru — gerçek backend entegrasyonu sonraki sprint.

---

## 5. Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Animasyon | Framer Motion 11 |
| State (collapsed) | `useState` — local, Zustand gerekmez |
| Görüntüler | Next.js `<Image>` |
| Stil | Tailwind CSS 3 |

---

## 6. Dosya Yapısı

```
frontend/src/
├── app/community/
│   └── page.tsx                    ← güncellenir
├── components/community/
│   ├── HexagonPanel.tsx            ← yeni
│   ├── QASection.tsx               ← yeni
│   └── QuestionCard.tsx            ← yeni
└── public/images/
    └── lofi-girl.jpg               ← eklendi
```

---

## 7. Kapsam Dışı

- Gerçek WebSocket/ses odası entegrasyonu
- Honey-dipper filtre işlevselliği
- Oy/bookmark backend kaydı
- Mobil optimizasyon
