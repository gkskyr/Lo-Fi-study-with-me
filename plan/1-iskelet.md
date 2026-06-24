# koZan Backend — İskelet (Mimari Genel Görünüm)

---

## 1. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Neden Seçildi |
|---|---|---|
| Çerçeve | NestJS 11 | Angular benzeri modüler yapı; dekoratör tabanlı; TypeScript-first |
| Dil | TypeScript | Derleme zamanı tür güvenliği; büyük ekiplerde refactor kolaylığı |
| HTTP Sunucu | Express (NestExpressApplication) | Olgun ekosistem; multer entegrasyonu |
| WebSocket | Socket.io (@nestjs/websockets) | Oda tabanlı broadcast; fallback desteği; geniş client kütüphane yelpazesi |
| ORM | Prisma 7 + @prisma/adapter-pg | Tip-güvenli SQL sorguları; migration sistemi; otomatik client üretimi |
| Veritabanı | PostgreSQL (Supabase) | ACID garantileri; JSON alan desteği (Note.content); ilişkisel bütünlük |
| Bağlantı Havuzu | pgbouncer (port 6543) | Serverless ortamda bağlantı sayısını sınırlar |
| Önbellek / Kuyruk | Redis (ioredis) | In-memory; pub/sub; Bull queue arka planı |
| Arka Plan Kuyruğu | @nestjs/bull + Bull | Mail gönderimi async; retry ile hata toleransı |
| Video | Agora RTC | Token-tabanlı WebRTC; SDK ile kolay entegrasyon |
| Auth | JWT (access 15dk) + Opaque Refresh Token (7gün) | Kısa ömürlü access ile güvenlik; DB'de iptal edilebilir refresh |
| Validasyon | class-validator + class-transformer | Dekoratör tabanlı; NestJS ValidationPipe ile sıfır boilerplate |
| API Dokümantasyonu | @nestjs/swagger | OpenAPI 3.0 çıktısı; /api/docs adresinde |

---

## 2. Dizin Yapısı

```
backend/
├── prisma/
│   ├── schema.prisma          ← Veri modeli; burası veritabanının "anayasası"
│   ├── seed.ts                ← YKS, KPSS, ALES, DGS topluluk odaları
│   └── migrations/            ← Her ALTER TABLE bir klasör; sıralı, geri dönülemez
├── src/
│   ├── main.ts                ← Uygulama başlangıç noktası (bootstrap)
│   ├── app.module.ts          ← Kök modül; tüm alt modülleri birleştirir
│   │
│   ├── prisma/                ← Global DB bağlantısı (PrismaService)
│   ├── redis/                 ← Global Redis bağlantısı + PresenceService
│   │
│   ├── auth/                  ← Kayıt, giriş, token, e-posta doğrulama
│   │   ├── dto/               ← Gelen verinin şeması (RegisterDto, LoginDto...)
│   │   ├── guards/            ← JwtAuthGuard, JwtOptionalAuthGuard
│   │   ├── strategies/        ← Passport JWT stratejisi
│   │   ├── decorators/        ← @CurrentUser() dekoratörü
│   │   └── services/          ← EmailValidatorService
│   │
│   ├── users/                 ← Kullanıcı DB operasyonları (servis katmanı)
│   ├── mail/                  ← SMTP mailer + Bull queue processor
│   │
│   ├── rooms/                 ← Oda listeleme, kişisel oda, Agora token
│   │   ├── rooms.gateway.ts   ← WebSocket: join/leave, XP, real-time broadcast
│   │   └── dto/
│   │
│   ├── questions/             ← Soru, oy, cevap; resim yükleme
│   ├── notes/                 ← Hiyerarşik not defteri (NoteUnit>Topic>Note)
│   ├── xp/                    ← XP hesaplama + rol yükseltme
│   └── agora/                 ← RTC token üretici
├── uploads/                   ← Yüklenen resimler (statik servis)
└── plan/                      ← Bu dokümantasyon
```

---

## 3. Modül Bağımlılık Grafiği

```
AppModule
├── PrismaModule (@Global)      ← Her modül doğrudan kullanabilir, import gerekmez
├── RedisModule  (@Global)      ← Her modül REDIS_CLIENT inject edebilir
├── ConfigModule (isGlobal)     ← .env değişkenleri her yerde erişilebilir
├── ThrottlerModule             ← Global rate limit guard (dakikada 30 istek)
│
├── UsersModule  ──exports──► UsersService
│
├── MailModule
│   └── imports BullModule(mail queue)
│   exports MailService, BullModule
│
├── AuthModule
│   ├── imports UsersModule
│   ├── imports MailModule      ← mailQueue.add() için
│   ├── imports JwtModule       ← access token imzalama
│   └── exports JwtModule       ← RoomsModule ve NotesModule bunu kullanır
│
├── XpModule ──exports──► XpService
│
├── RoomsModule
│   ├── imports AuthModule      ← JwtModule (gateway JWT doğrulama için)
│   ├── imports XpModule        ← oda süresi XP'si için
│   └── exports RoomsService, RoomsGateway
│
├── QuestionsModule
│   ├── imports AuthModule
│   ├── imports RoomsModule     ← RoomsGateway (emit için)
│   └── imports XpModule        ← soru/cevap XP'si
│
├── NotesModule
│   └── imports AuthModule
│
└── AppModule providers:
    └── ThrottlerGuard (APP_GUARD) ← tüm endpoint'lere otomatik uygulanır
```

**Dairesel bağımlılık (circular dependency) yoktur:**
- XpModule → kimseyi import etmez (sadece global PrismaService kullanır)
- RoomsModule → XpModule import eder ama XpModule RoomsModule'ü bilmez ✓
- QuestionsModule → RoomsModule import eder, RoomsModule QuestionsModule'ü bilmez ✓

---

## 4. HTTP İstek Yaşam Döngüsü

```
İstemci (frontend/mobile)
    │
    │  HTTP isteği (örn: POST /questions)
    ▼
[Express HTTP Adapter]         ← Node.js TCP socket'i alır
    │
    ▼
[ThrottlerGuard] (global)      ← IP başına dakikada 30 istek; aşarsa 429 döner
    │
    ▼
[Router Matcher]               ← URL + Method eşleşmesi (QuestionsController)
    │
    ▼
[Guards] (sırayla)             ← JwtAuthGuard: Authorization header'ı kontrol eder
    │                             → JwtStrategy.validate() → UsersService.findById()
    │                             → request.user = User objesi
    ▼
[Interceptors]                 ← FilesInterceptor: multipart/form-data'yı ayrıştırır
    │                             multer diskStorage → uploads/ klasörüne yazar
    ▼
[ValidationPipe]               ← DTO dönüşümü: class-transformer (trim, lowercase)
    │                             + class-validator (IsString, MaxLength...)
    │                             Geçersizse 400 Bad Request döner
    ▼
[Controller metodu]            ← @Body(), @UploadedFiles(), @CurrentUser() inject
    │
    ▼
[Service metodu]               ← İş mantığı burada; DB sorguları, XP hesaplama
    │
    ▼
[PrismaService]                ← pg adapter üzerinden pgbouncer → PostgreSQL
    │
    ▼
[Yanıt serialization]          ← JSON.stringify; password alanları elle çıkarılır
    │
    ▼
İstemciye HTTP yanıtı
```

---

## 5. WebSocket Yaşam Döngüsü

```
İstemci
    │  io(url, { auth: { token: 'Bearer ...' } })
    ▼
[RoomsGateway.handleConnection()]
    │  JWT doğrulama → userId çıkar → sockets Map'e kaydet
    │  userSockets Map: userId → Set<socketId>
    ▼
İstemci: socket.emit('room:join', roomId)
    │
    ▼
[RoomsGateway.handleJoin()]
    │  client.join(roomId) → Socket.io oda grubuna ekle
    │  sockets Map'te joinedAt = now() kaydet
    │  client.emit('room:joined', { roomId })
    ▼
Diğer kullanıcı HTTP POST /questions yaparsa:
    │
    ▼
[QuestionsService.create()]
    │  roomsGateway.emitNewQuestion(roomId, question)
    │  → server.to(roomId).emit('question:new', question)
    │  → Odadaki TÜM socket'lere ulaşır
    ▼
İstemci: socket.on('question:new', handler)
```

---

## 6. Veritabanı Şeması İlişki Özeti

```
User
 ├── refreshTokens []     (1:N) — her oturum bir token
 ├── rooms []             (1:N) — kişisel oda sahibi
 ├── questions []         (1:N) — sorduğu sorular
 ├── questionVotes []     (1:N) — oy kayıtları
 ├── answers []           (1:N) — verdiği cevaplar
 └── noteUnits []         (1:N) — not defteri kökü
      └── topics []       (1:N)
           └── notes []   (1:N) — max 10 adet

Question
 ├── media []             (1:N) — QuestionMedia (resimler)
 ├── votes []             (1:N) — QuestionVote [userId+questionId unique]
 └── answers []           (1:N)
      └── media []        (1:N) — AnswerMedia

Room
 └── questions []         (1:N) — odaya ait sorular

Cascade silme kuralları:
  User silinince → tüm Room, Question, QuestionVote, Answer, NoteUnit, RefreshToken silinir
  Room silinince → tüm Question silinir (cascade)
  Question silinince → Media + Vote + Answer silinir
  Answer silinince → AnswerMedia silinir
  NoteUnit silinince → NoteTopic → Note silinir (cascade chain)
  Room.owner silinince → ownerId = NULL (SetNull) — oda kalmaya devam eder
```

---

## 7. Güvenlik Katmanları

```
1. Rate Limiting     → ThrottlerModule: dakikada 30 global, auth endpoint'lerinde 5
2. Input Validation  → ValidationPipe: her DTO'da whitelist + transform
3. Email Validation  → Abstract API + DNS MX + disposable domain listesi
4. Password Hashing  → bcrypt cost=10 (~100ms; rainbow table koruması)
5. JWT Access Token  → 15 dakika ömürlü; imzalanmış; stateless
6. Refresh Token     → 64-byte random; SHA-256 hash'i DB'de; rotation (her kullanımda yenilenir)
7. Route Guards      → JwtAuthGuard (zorunlu auth), JwtOptionalAuthGuard (opsiyonel)
8. Ownership Check   → Her serviste userId eşleşme kontrolü
9. File Validation   → MIME type kontrolü; maks 5MB; sadece resim
10. CORS             → app.enableCors() — production'da origin whitelist eklenmeli
```

---

## 8. Ortam Değişkenleri (.env)

```
DATABASE_URL        pgbouncer bağlantısı (runtime sorguları)
DIRECT_URL          doğrudan pg bağlantısı (migration için)
JWT_SECRET          access token imzalama anahtarı
JWT_ACCESS_EXPIRES  access token süresi (15m)
JWT_REFRESH_SECRET  refresh token (henüz kullanılmıyor; opaque token DB'de)
JWT_REFRESH_EXPIRES_DAYS  refresh token geçerlilik süresi (7)
REDIS_URL           Redis bağlantısı (Bull queue + presence)
SMTP_HOST/PORT/USER/PASS/FROM  Nodemailer SMTP ayarları
ABSTRACT_API_KEY    Email doğrulama API anahtarı
AGORA_APP_ID        Agora RTC uygulama kimliği
AGORA_APP_CERTIFICATE  Agora token imzalama sertifikası
```
