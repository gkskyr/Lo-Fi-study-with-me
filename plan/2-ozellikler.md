# koZan Backend — Sistemdeki Tüm Özellikler (Derin Analiz)

Her özellik için üç bakış açısı:
- **(a) Basit:** Yazılım bilmeyen birine anlatır gibi
- **(b) Teknik:** Stack/heap/bellek/karmaşıklık düzeyinde
- **(c) Eleştiri:** Tasarım desenleri ve kod kalitesi

---

## ÖZELLİK 1 — Kullanıcı Kaydı (Register)

**Endpoint:** `POST /auth/register`
**İlgili Dosyalar:** `auth.controller.ts` → `auth.service.ts` → `email-validator.service.ts` → `users.service.ts` → `mail.processor.ts`

**Çağrı Zinciri:**
```
AuthController.register(dto: RegisterDto)
  └─ AuthService.register(dto)
       ├─ UsersService.findByEmail(email)          [DB: SELECT]
       ├─ EmailValidatorService.validate(email)    [HTTP: Abstract API veya DNS MX]
       ├─ bcrypt.hash(password, 10)               [CPU: ~100ms]
       ├─ UsersService.create(data)               [DB: INSERT User]
       ├─ UsersService.createPersonalRoom(...)    [DB: INSERT Room]
       ├─ generateOtp()                           [Math.random()]
       ├─ UsersService.setVerificationCode(...)   [DB: UPDATE User]
       └─ mailQueue.add('send-verification', job) [Redis: LPUSH]
```

### (a) Basit Anlatım
Bir kafede ilk kez hesap açmak gibi düşün. Formunu doldurursun (ad, email, şifre). Kasiyer önce bu emailin var olup olmadığını kontrol eder — gerçek bir posta kutusuna sahip mi, tek kullanımlık (yandex, guerrilla) değil mi diye. Geçerliyse şifreni kilitleri bir kasaya koyar (şifreni asla düz okuyamaz hale getirir), seni sisteme ekler. Otomatik olarak senin için özel bir oda açar. Sonra telefonuna 6 haneli bir kod gönderir. O kodu girmeden sisteme giremezsin. "Kodu gönderildi" diyerek seni öylece bırakır — mail işi arka planda yapılır, beklemeni gerektirmez.

### (b) Teknik Analiz

**Bellek ve stack:**
- `register()` çağrısı stack frame oluşturur; tüm `await` noktalarında stack geri dönülür, Node.js event loop'u başka işleri yapar (non-blocking)
- `bcrypt.hash(password, 10)` → libuv thread pool'unda çalışır (CPU-bound iş event loop'u bloklamaz). Heap'te geçici `Buffer` nesnesi oluşturur (~60 byte salt + 60 byte hash)
- `crypto.randomBytes(6)` → OS PRNG'den (Windows: BCryptGenRandom, Linux: /dev/urandom) 6 byte alır; `Math.floor()` ile 6 haneli OTP'ye dönüştürülür
- `mailQueue.add()` → ioredis `LPUSH mail:wait jobJSON` komutu gönderir (O(1)); job heap'te serileştirilir, Redis'e kopyalanır, GC tarafından temizlenir

**Karmaşıklık:**
- Zaman: O(2^10) ≈ O(1024) bcrypt round'u — kasıtlı olarak yavaş (brute-force engeli)
- Alan: O(1) — input boyutundan bağımsız; sabit sayıda DB satırı yaratır
- DB: 3 yazma (User INSERT, Room INSERT, User UPDATE for OTP) + 1 okuma (email check); hepsi indeksli sorgular

**Güvenlik invariantı:** Şifre hash'i `$2b$10$...` formatında saklanır. `cost=10` → modern donanımda ~100ms. Her yıl `cost` +1 artırılmalı (Moore kanununun tersi — saldırganın donanımı güçlendikçe hash süresi de artırılır).

**Atomiklik problemi:** Kayıt bir transaction değil — User INSERT başarılı olursa ama Room INSERT veya OTP mail kuyruğu başarısız olursa, kullanıcı sistemde var ama doğrulama yapamaz. `Saga pattern` veya `$transaction()` ile çözülebilir (bkz. Eleştiri).

### (c) Tasarım Desenleri ve Eleştiri

**Kullanılan desenler:**
- **Facade Pattern:** `AuthService.register()` — dışarıdan bakıldığında tek bir `register()` çağrısı; içeride 7 farklı işlem orkestrasyonu yapılır
- **Template Method:** `EmailValidatorService` — `validate()` ana şablonu, `validateWithReputationApi()` ve `validateWithFallback()` alt implementasyonlar; dış API düşerse fallback devreye girer
- **Queue Pattern (Producer-Consumer):** `mailQueue.add()` producer, `MailProcessor.handleVerification()` consumer; birbirlerini bilmezler

**Güçlü yönler:**
- Mail kuyruğa alındı = kullanıcı beklemez; network hatası olsa bile `attempts: 3` ile retry yapılır
- Disposable email listesi + DNS MX kontrolü + Abstract API = üç katman e-posta kalitesi
- bcrypt cost=10 endüstri standardı

**Zayıf yönler:**
- Kayıt partial failure durumunda tutarsız state bırakır (User var ama OTP yok/hatalı)
- Argon2id bcrypt'ten daha iyi (GPU/ASIC direnci için memory-hard); 2024 NIST önerisi Argon2
- `generateOtp()` `Math.random()` kullanıyor — kriptografik değil. `crypto.randomInt(100000, 999999)` kullanılmalıydı
- PersonalRoom kaydı kayıt akışına gömülmüş; ayrı bir event (`UserCreated`) ve listener daha temiz olurdu

---

## ÖZELLİK 2 — E-posta Doğrulama

**Endpoint:** `POST /auth/verify-email`
**Çağrı Zinciri:**
```
AuthController.verifyEmail(dto: VerifyEmailDto)
  └─ AuthService.verifyEmail(dto)
       ├─ UsersService.findByEmail(email)     [DB: SELECT]
       ├─ Kod ve süre kontrolü               [in-memory karşılaştırma]
       ├─ UsersService.verifyEmail(email)    [DB: UPDATE]
       └─ AuthService.issueTokenPair(...)    [JWT imzala + DB refresh token]
```

### (a) Basit Anlatım
Kafeden aldığın kodu buraya yazıyorsun. Sistem kodu kontrol eder: doğru mu? 10 dakikası geçmemiş mi? Geçerliyse email sütununda "doğrulandı" işaretini koyar, kodu siler, sana hem kısa süreli (15 dakika) hem uzun süreli (7 gün) iki anahtar verir.

### (b) Teknik Analiz

**Token çifti üretimi (`issueTokenPair`):**
- `access_token`: `jwtService.sign({ sub: userId, email })` → HMAC-SHA256 imzalı; header.payload.signature formatı; 15 dakika TTL; stateless (DB sorgusu yok)
- `refresh_token`: `crypto.randomBytes(64).toString('hex')` → 128 karakter hex string; 512-bit entropi → kaba kuvvetle kırılamaz (2^512 olasılık)
- `tokenHash`: `SHA-256(rawRefresh)` → DB'de `RefreshToken.tokenHash` sütununda saklanır; ham token asla DB'ye yazılmaz

**Bellek:** JWT oluşturma heap'te ~300 byte geçici string. `randomBytes(64)` → 64 byte kernel buffer, hex'e çevrilir 128 byte string, GC'ye bırakılır.

**Karmaşıklık:** O(1) tümü için — kod karşılaştırması `===` O(1), ama timing attack'a açık (sabit zamanlı karşılaştırma kullanılmıyor — bkz. Eleştiri)

### (c) Tasarım Desenleri ve Eleştiri

**Kullanılan desenler:**
- **Repository Pattern:** `UsersService` DB erişimini soyutlar; servis DB'ye doğrudan dokunmaz
- **Token Rotation:** Refresh token her kullanımda yenilenir; eski geçersiz kılınır

**Eleştiri:**
- OTP kodu `===` ile karşılaştırılıyor — timing attack'a açık. Saldırgan yanıt süresini ölçerek kodun hangi karaktere kadar doğru olduğunu anlayabilir. `crypto.timingSafeEqual()` kullanılmalı
- OTP kodu DB'de düz metin saklanıyor. Hash'lenerek saklanabilirdi (paranoid güvenlik için)

---

## ÖZELLİK 3 — Giriş (Login)

**Endpoint:** `POST /auth/login`
**Çağrı Zinciri:**
```
AuthController.login(dto: LoginDto)
  └─ AuthService.login(dto)
       ├─ UsersService.findByEmail(email)
       ├─ bcrypt.compare(plainPassword, hash)
       ├─ isEmailVerified kontrolü
       ├─ UsersService.deleteExpiredRefreshTokens(userId)
       └─ issueTokenPair(userId, email)
```

### (a) Basit Anlatım
Email ve şifreni gir. Sistem şifreni veritabanındaki kilitli hallyle karşılaştırır (düz halini okuyamaz, sadece "aynı mı?" diye sorar). Geçerliyse iki anahtar verir: biri 15 dakika, biri 7 gün geçerli. Aynı zamanda o kullanıcıya ait süresi dolmuş anahtarları veritabanından temizler.

### (b) Teknik Analiz

**bcrypt.compare():** C++ binding üzerinden çalışır (node-gyp); libuv thread pool'unda bloklamadan işlenir. Giriş şifresini hash'leyip DB'deki hash ile sabit zamanlı karşılaştırır — timing attack'a karşı korumalıdır.

**Expired token cleanup:** `DELETE WHERE userId = ? AND expiresAt < NOW()` — indeksli sorgu, O(k) k = süresi dolmuş token sayısı. Ayrı bir cron job yerine her login'de temizlik yapılır (lazy cleanup). Avantaj: ek servis yok. Dezavantaj: aktif girişi biraz yavaşlatır.

**İki token stratejisi nedeni:**
- Access token (15dk): Kısa ömürlü = çalınsa 15dk sonra işe yaramaz; her istek DB sorgusu gerektirmez (stateless)
- Refresh token (7gün): Uzun ömürlü = kullanıcı her 15dk'da şifre girmez; çalınırsa logout-all ile iptal edilebilir

### (c) Tasarım Desenleri ve Eleştiri

**Strategy Pattern:** Login akışı `JwtStrategy.validate()` ile birleşir — Passport.js strateji deseni burada uygulanmıştır. Guard çağrıldığında strateji otomatik devreye girer.

**Eleştiri:** Login başarısız denemeler sayılmıyor — account lockout mekanizması yok. Saldırgan sınırsız şifre deneyebilir (ThrottlerGuard 5/dk sınırı var ama IP değiştirilerek aşılabilir). Redis'te `login:attempts:{email}` sayacı eklenebilir.

---

## ÖZELLİK 4 — Token Yenileme (Refresh)

**Endpoint:** `POST /auth/refresh` — `{ refresh_token: string }`

**Çağrı Zinciri:**
```
AuthController.refresh(dto: RefreshDto)
  └─ AuthService.refresh(rawRefreshToken)
       ├─ SHA-256(rawToken) → tokenHash
       ├─ UsersService.findRefreshToken(tokenHash)  [DB: SELECT + JOIN user]
       ├─ Süre kontrolü (expiresAt < now)
       ├─ UsersService.deleteRefreshToken(tokenHash) [DB: DELETE]
       └─ issueTokenPair(user.id, user.email)        [Yeni çift üret]
```

### (a) Basit Anlatım
15 dakikalık anahtarın bitti. Ama 7 günlük anahtarın var. Bunu sisteme veriyorsun, sistem onu koparıp atıyor ve sana yeni bir 15 dakikalık + yeni bir 7 günlük anahtar veriyor. Eski 7 günlük artık işe yaramaz. Buna "token rotation" denir — her kullanımda anahtar değişir.

### (b) Teknik Analiz

**Opaque token güvenliği:** `randomBytes(64)` = 512-bit. SHA-256 hash DB'de saklanır. Saldırgan DB'yi çalsa bile ham tokena ulaşamaz (one-way function). JWT'nin aksine, opaque token DB'de olmadan geçersizdir — stateful güvenlik modeli.

**Token rotation fayda:** Eğer bir refresh token çalınırsa, gerçek kullanıcı token kullanmaya devam eder. İkinci kullanımda sistem "bu token zaten kullanıldı" diyecek çünkü ilk kullanımda silinmiştir. Bu "refresh token reuse detection"dır — tam implementasyonu için eski tokenın silindiğini değil tüketildiğini (used=true) işaretlemek gerekir.

**Karmaşıklık:** O(1) — tüm DB sorguları `tokenHash` unique index üzerinden.

### (c) Tasarım Desenleri ve Eleştiri

**Command Pattern:** `refresh()` ve `logout()` birbirine simetrik komutlar — ikisi de tokenHash üzerinde işlem yapar.

**Eleştiri:** Token family tracking yok. Çalınmış token detect edilse bile (ikinci kullanım) sadece o token iptal edilir, kullanıcı uyarılmaz. Tam güvenlik için: her rotation'da önceki tokenı "rotated" olarak işaretle; eğer bir "rotated" token kullanılmaya çalışılırsa → o kullanıcının tüm tokenlarını iptal et ve alert gönder.

---

## ÖZELLİK 5 — Çıkış (Logout / Logout All)

**Endpoint:** `POST /auth/logout` (tek oturum) | `POST /auth/logout-all` (tüm oturumlar)

**Çağrı Zinciri:**
```
logout:
  AuthService.logout(rawRefreshToken)
    └─ UsersService.deleteRefreshToken(SHA-256(token))  [DB: DELETE]

logout-all:
  AuthService.logoutAll(userId)
    └─ UsersService.deleteAllRefreshTokens(userId)      [DB: DELETE WHERE userId]
```

### (a) Basit Anlatım
`logout`: Elindeki 7 günlük anahtarı sisteme veriyorsun, sistem onu yakıyor. Artık access token da süresi dolunca sisteme giremezsin.
`logout-all`: "Tüm cihazlardan çık" — telefon, bilgisayar, tablet; hepsindeki anahtarları yakıyor.

### (b) Teknik Analiz

Mevcut access token hâlâ 15 dakika geçerli — backend stateless olduğu için bu anında iptal edilemez. Bu JWT'nin bilinen bir trade-off'u. Tam anında iptal için: access token'ı da bir token blacklist'e (Redis SET) eklemek gerekir. TTL'li Redis SET ile `SETEX token:invalidated:{jti} 900 1` komutu → access token'ın kalan süresinde blacklist kontrolü eklenir.

**Karmaşıklık:** logout O(1), logout-all O(n) n=açık oturum sayısı; `WHERE userId = ?` indeksli sorgu.

### (c) Tasarım Desenleri ve Eleştiri

**Eleştiri:** Access token blacklist eksikliği — 15 dakika güvenlik açığı var. Düşük riskli uygulamalar için kabul edilebilir, yüksek güvenlik gerektiren durumlar için Redis blacklist şart.

---

## ÖZELLİK 6 — Oda Sistemi (Rooms)

**Endpoint'ler:**
- `GET /rooms` — tüm odalar (opsiyonel JWT)
- `GET /rooms/mine` — kişisel oda (JWT zorunlu)
- `GET /rooms/:id` — tek oda (opsiyonel JWT)
- `GET /rooms/:id/agora-token` — RTC token (JWT zorunlu)

**Çağrı Zinciri — GET /rooms:**
```
RoomsController.findAll(user | null)
  └─ RoomsService.findAll(currentUserId?)
       └─ prisma.room.findMany({
            where: {
              OR: [
                { type: COMMUNITY },
                { type: PERSONAL, ownerId: currentUserId }
              ]
            }
          })
```

**Çağrı Zinciri — GET /rooms/mine:**
```
RoomsController.findMine(user)
  └─ RoomsService.findOrCreatePersonal(userId)
       ├─ prisma.room.findFirst({ where: { type: PERSONAL, ownerId: userId } })
       └─ (yoksa) prisma.room.create(...)   ← self-healing
```

### (a) Basit Anlatım
`GET /rooms`: Topluluk odalarını (YKS, KPSS, ALES, DGS) herkes görebilir. Giriş yaparsan kendi özel odanı da listede görürsün.
`GET /rooms/mine`: "Benim odam nerede?" — eski kullanıcıların odası yoksa otomatik yaratır. Self-healing.
`GET /rooms/:id/agora-token`: "Bu odada video görüşmesi başlatmak istiyorum" — Agora'ya özel bir anahtar alırsın.

### (b) Teknik Analiz

**OR sorgusu optimizasyonu:** `WHERE type = 'COMMUNITY' OR (type = 'PERSONAL' AND ownerId = ?)` — iki index kullanılabilir: `idx_room_type`, `idx_room_owner_id`. PostgreSQL query planner tipik olarak Bitmap OR Index Scan seçer.

**Agora UID dönüşümü:**
```typescript
parseInt(uuid.replace(/-/g, '').slice(0, 8), 16) >>> 0
```
UUID'nin ilk 8 hex karakteri → 32-bit sayı. `>>> 0` (unsigned right shift) signed int'i uint32'ye zorlar. Agora UID aralığı 0–2^32-1. Çarpışma riski: 2^32 olasılıktan 2^16 karakteri alan = ~0.0015% çarpışma olasılığı. Küçük sistemler için kabul edilebilir; büyük sistemlerde UUID→uint32 için deterministic hash fonksiyonu gerekir.

**Statik yol önceliği:** `GET /rooms/mine` URL'sini router `GET /rooms/:id` ile karıştırmasın diye Controller'da `mine` endpoint'i `:id`'den önce tanımlanmıştır — NestJS Express adaptörü ilk eşleşmeyi kullanır.

### (c) Tasarım Desenleri ve Eleştiri

**Self-Healing / Idempotent Pattern:** `findOrCreatePersonal()` — çağrı kaç kez yapılırsa yapılsın sonuç aynı. Frontend hata yakalamak zorunda değil; "oda yok" durumu asla oluşmaz.

**Guard Composition:** `JwtOptionalAuthGuard` ilginç bir pattern — Passport'un hata fırlatan davranışını override eder, `user = null` döner. Bu sayede `GET /rooms` hem anonim hem yetkili kullanıcı için tek endpoint.

**Eleştiri:** Agora UID çarpışması düşük riskli ama UUID → 32-bit sıkıştırma kayıplı — daha sağlam çözüm: kullanıcıya DB'de `agoraUid Int @unique @default(autoincrement())` alanı açmak.

---

## ÖZELLİK 7 — Soru Sorma (Ask Question)

**Endpoint:** `POST /questions` — `multipart/form-data`
**Çağrı Zinciri:**
```
QuestionsController.create(dto, files, user)
  │ [FilesInterceptor: multer diskStorage → uploads/ klasörüne yazar]
  │ [imageFileFilter: MIME kontrolü; hatalıysa 400]
  └─ QuestionsService.create(dto, files, authorId)
       ├─ prisma.room.findUnique(roomId)           [oda var mı?]
       ├─ content + files validasyonu               [en az biri gerekli]
       ├─ prisma.question.create({                 [nested write]
       │    data: { content, media: { create: files.map(...) } },
       │    include: { author, media, _count }
       │  })
       ├─ roomsGateway.emitNewQuestion(roomId, q)  [socket broadcast]
       ├─ xpService.award(authorId, 5)             [DB: UPDATE user.xp]
       └─ roomsGateway.emitXpToUser(authorId, r)   [kişisel socket]
```

### (a) Basit Anlatım
Bir odada soru soruyorsun. Metin yazabilirsin, resim ekleyebilirsin (ikisi de opsiyonel ama en az biri gerekli). Soru kaydedilir. Aynı anda odadaki herkese "yeni soru var" bildirimi gider (real-time). 5 XP kazanırsın, XP göstergene anlık yansır.

### (b) Teknik Analiz

**Multipart yükleme:**
- `FilesInterceptor('files', 5, { storage: diskStorage, limits: { fileSize: 5MB } })` → multer middleware NestJS interceptor olarak sarılmış
- `diskStorage`: Dosya önce Node.js belleğinde değil, doğrudan diske yazılır (streaming). Bellek baskısı yoktur
- Dosya adı: `${Date.now()}-${Math.random() * 1e9}` — çarpışma olasılığı ≈ (1/10^9)^2 = ihmal edilebilir
- MIME filter: `file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)` — regex O(1); mimetype sunucu tarafı kontrolü (content-type header'ı sahtelenebilir — tam güvenlik için magic bytes kontrolü gerekir)

**Prisma nested write:** `media: { create: [...] }` → transaction içinde Question INSERT + N×QuestionMedia INSERT atomik olarak gerçekleşir. PostgreSQL ACID garantisiyle ya hepsi olur ya hiçbiri.

**Karmaşıklık:** O(k) k=yüklenen dosya sayısı (maks 5). Her dosya için `QuestionMedia` satırı insert edilir.

**XP akışı:**
1. `xpService.award()` → `UPDATE user SET xp = xp + 5` → atomik DB operasyonu
2. Threshold kontrolü → eşik aşıldıysa `UPDATE user SET role = ?`
3. `emitXpToUser()` → `userSockets` Map üzerinden o kullanıcının tüm socket'lerine `xp:updated` eventi

### (c) Tasarım Desenleri ve Eleştiri

**Observer Pattern:** `roomsGateway.emitNewQuestion()` — soru oluşturulduğunda odadaki tüm "dinleyiciler" (socket bağlantıları) bilgilendirilir. Gateway bir event bus gibi çalışır.

**Decorator Pattern:** `@UseInterceptors(FilesInterceptor(...))` → controller metodunu değiştirmeden dosya yükleme kapasitesi eklenir.

**Eleştiri:**
- Magic bytes kontrolü yok — kullanıcı `.jpg` uzantılı bir PHP dosyası yükleyebilir (MIME spoofing). `file-type` paketi gerçek dosya içeriğini okur
- Dosyalar sunucu diskinde saklanıyor — ölçeklenebilirlik sorunu. İkinci sunucu eklendiğinde dosyaları göremez. Çözüm: S3/Supabase Storage + CDN
- `Date.now() + Math.random()` yerine `crypto.randomUUID()` daha güvenli dosya adı

---

## ÖZELLİK 8 — Oy Verme (Toggle Vote)

**Endpoint:** `POST /questions/:id/vote`
**Çağrı Zinciri:**
```
QuestionsController.vote(id, user)
  └─ QuestionsService.vote(questionId, userId)
       ├─ prisma.question.findUnique(questionId)
       ├─ prisma.questionVote.findUnique({ userId_questionId })
       │
       ├── [Oy Varsa] ──────────────────────────────────────────────
       │    ├─ prisma.questionVote.delete(voteId)
       │    ├─ prisma.question.update({ upvotes: { decrement: 1 } })
       │    └─ gateway.emitVoteUpdated(roomId, { id, upvotes, voted: false })
       │
       └── [Oy Yoksa] ──────────────────────────────────────────────
            ├─ prisma.questionVote.create({ userId, questionId })
            ├─ prisma.question.update({ upvotes: { increment: 1 } })
            └─ gateway.emitVoteUpdated(roomId, { id, upvotes, voted: true })
```

### (a) Basit Anlatım
Bir soruyu beğenirsin, butona basarsın → oy verildi. Tekrar basarsın → oy geri çekildi. Sisteme her tıklamada "daha önce oy verdim mi?" diye sorar. Verdiyse siler, vermediyse ekler. Odadaki herkes anlık oy sayısı güncellemesini görür.

### (b) Teknik Analiz

**Unique constraint:** `@@unique([userId, questionId])` — DB seviyesinde aynı kullanıcının aynı soruya iki kez oy vermesi engellenir. Race condition koruması: iki eşzamanlı istek gelirse biri INSERT, diğeri unique violation hatasıyla düşer.

**upvotes sayacı:** `{ increment: 1 }` ve `{ decrement: 1 }` → Prisma atomic update. Raw SQL: `UPDATE questions SET upvotes = upvotes + 1`. Read-modify-write yerine DB seviyesinde atomik → concurrent update güvenli.

**Karmaşıklık:** O(1) — QuestionVote'ta `userId_questionId` composite unique index; Question'da `id` primary key. İki index lookup + bir update.

**N+1 sorunu:** Şu anda yoktur çünkü her vote işleminde sadece bir soru ve bir vote satırı sorgulanır. Ancak ileride "bir kullanıcının tüm oy verdiği soruları getir" eklenirse dikkat edilmeli.

### (c) Tasarım Desenleri ve Eleştiri

**Toggle Pattern / Idempotent Command:** Aynı endpoint hem oy verme hem geri alma işlevi görür. Sunucu duruma bakar ve tersini yapar. RESTful açıdan tartışmalı (PUT daha uygun olabilir: `PUT /questions/:id/vote` → `{ voted: true/false }`) ama pratik.

**Eleştiri:**
- İki ayrı DB yazması atomik değil: `delete(vote)` + `update(upvotes)`. Biri başarılı biri başarısız olursa `upvotes` sayacı bozulur. `prisma.$transaction([...])` kullanılmalıydı
- `upvotes` sayacı denormalize veri — QuestionVote tablosundaki gerçek sayıdan farklılaşabilir. Daha güvenli: her sorguda `COUNT(votes)` hesapla (performans trade-off)

---

## ÖZELLİK 9 — Cevap Verme (Answer)

**Endpoint:** `POST /questions/:id/answers` — `multipart/form-data`

Soru sorma ile neredeyse aynı çalışır (aynı `FilesInterceptor` + `diskStorage` yapısı). Fark: `Answer` nesnesine `questionId` + `authorId` bağlanır, `AnswerMedia` ile ilişkilendirilir, `question.roomId` üzerinden `emitNewAnswer` yapılır ve `+10 XP` verilir.

### (a) Basit Anlatım
Bir soruyu cevaplıyorsun — metin, resim veya ikisi birden. Cevap kaydedilir ve soruyu açan herkesin ekranında anlık görünür. 10 XP kazanırsın.

### (b) Teknik Analiz
Soru sormadan tek farkı: sorunun oda bilgisine ulaşmak için önce `question.findUnique()` yapılması → `roomId` bulunması → `emitNewAnswer(roomId, answer)`. Bu bir JOIN yapmak yerine iki ayrı SELECT — denormalize tasarımın sonucu.

### (c) Eleştiri
`question.roomId` soru sırasında bilinir; cevap modelinde `roomId` de saklanabilirdi (fazladan SELECT elimine edilirdi). Trade-off: şimalist şema (mevcut) vs. denormalize ama daha hızlı şema.

---

## ÖZELLİK 10 — WebSocket Bağlantısı + Oda Join/Leave

**İlgili Dosya:** `rooms.gateway.ts`

**Bağlantı Akışı:**
```
Client: io(url, { auth: { token: 'Bearer JWT' } })
  │
  └─ RoomsGateway.handleConnection(client: Socket)
       ├─ handshake.auth.token → JWT verify → userId
       ├─ sockets.set(client.id, { userId })
       └─ userSockets.get(userId).add(client.id)

Client: socket.emit('room:join', roomId)
  └─ handleJoin()
       ├─ client.join(roomId)           ← Socket.io oda grubuna ekle
       ├─ sockets[client.id].roomId = roomId
       ├─ sockets[client.id].joinedAt = new Date()
       └─ client.emit('room:joined', { roomId })

Client: socket.emit('room:leave', roomId) veya disconnect
  └─ handleLeave() veya handleDisconnect()
       ├─ Geçen süre hesapla: (now - joinedAt) / 60000 dakika
       ├─ Math.floor(dakika / 60) tam saat
       └─ xpService.award(userId, tamSaat * 20)
```

### (a) Basit Anlatım
Siteye girdiğinde bir WebSocket bağlantısı açılır — sanki telefonda bir hat açık kalır gibi. Bu hat üzerinden anlık mesajlar alıp verebilirsin. Bir odaya katılırsın, orada oturduğun süre ölçülür. Her tam saatin için 20 XP alırsın.

### (b) Teknik Analiz

**İki yönlü harita (bi-directional Map):**
- `sockets: Map<socketId, SocketMeta>` — O(1) lookup by socketId
- `userSockets: Map<userId, Set<socketId>>` — O(1) lookup by userId

**Neden iki harita?** Disconnect'te `socketId` bilinen, `userId`'ye ulaşmak için `sockets` haritası. `emitXpToUser`'da `userId` bilinen, tüm socket'lerine ulaşmak için `userSockets` haritası. Tek harita ile birinden diğerine ulaşmak O(n) olurdu.

**Bellek:** Her bağlı socket için `SocketMeta` heap'te ~3 alan (userId string ref, roomId string ref, joinedAt Date ref). 1000 eşzamanlı kullanıcı ≈ 1000 obje. Düşük bellek tüketimi.

**Karmaşıklık:**
- `handleConnection`: O(1)
- `handleDisconnect`: O(1) temizleme; DB award O(1)
- `emitXpToUser`: O(k) k=aynı userId'nin açık socket sayısı (genellikle 1-3)
- `server.to(roomId).emit()`: Socket.io iç implementasyonu O(n) n=odadaki socket sayısı

**XP hesabı:** `Math.floor((Date.now() - joinedAt.getTime()) / 60_000 / 60)` — integer division. 59 dakika = 0 XP, 60 dakika = 20 XP, 119 dakika = 20 XP, 120 dakika = 40 XP.

### (c) Tasarım Desenleri ve Eleştiri

**Lifecycle Hooks:** `OnGatewayConnection`, `OnGatewayDisconnect` → NestJS interface'leri; `handleConnection` ve `handleDisconnect` otomatik çağrılır — açık bir event listener kaydına gerek yok.

**Eleştiri:**
- `sockets` ve `userSockets` in-memory — sunucu yeniden başlatılınca sıfırlanır, XP zamanları kaybolur. Multi-instance deployment'ta (2 sunucu) çalışmaz. Çözüm: join zamanını Redis'te tut: `SET room:session:{userId}:{socketId} joinTimestamp`
- Disconnect'te XP award async ama await yok (`this.awardRoomTime(...)` fire-and-forget). Hata loglanmaz. `void this.awardRoomTime(...).catch(err => logger.error(err))` olmalı

---

## ÖZELLİK 11 — XP Sistemi + Rol Yükseltme

**İlgili Dosya:** `xp.service.ts`

**Çağrı Zinciri (her XP kazanımında):**
```
xpService.award(userId, amount)
  ├─ prisma.user.update({ xp: { increment: amount } })  [atomik]
  ├─ ROLE_THRESHOLDS.filter(t => xp >= t.minXp).pop()  [eşik kontrolü]
  └─ (eşik aşıldıysa) prisma.user.update({ role: newRole })
```

### (a) Basit Anlatım
Her aktivite (soru sor, cevap ver, odada kal) puan kazandırır. 500 puana ulaşınca otomatik olarak "Deneyimli" rozeti alırsın, 2000'de "Eğitmen" olursun. Kimse bu rozeti senden alamaz — bir kez kazanınca düşmez.

### (b) Teknik Analiz

**Threshold mantığı:**
```typescript
ROLE_THRESHOLDS = [
  { role: 'EXPERIENCED', minXp: 500 },
  { role: 'INSTRUCTOR',  minXp: 2000 }
]

const targetRole = ROLE_THRESHOLDS.filter(t => xp >= t.minXp).pop()?.role;
```
`.filter()` O(n) n=threshold sayısı (2); `.pop()` en yüksek eşiği alır. 2500 XP → 2000 eşiğini de geçtiği için doğrudan INSTRUCTOR olur.

**Monoton artış:** `ROLE_RANK[targetRole] > ROLE_RANK[currentRole]` kontrolü — rol hiçbir zaman düşmez. Birisi 2000 XP iken 5 XP çıkarılsa bile (örn. bir ileride "yanlış cevap" mekaniği eklenirse) INSTRUCTOR kalır.

**Atomiklik:** `increment` atomic ama threshold kontrolü + ikinci `update` arasında race condition var. İki eşzamanlı istek aynı anda XP verirse biri 499→504, diğeri 503→508 yapabilir; ikisi de threshold geçtiği için iki kez `UPDATE role` yapılır. Sonuç aynı (idempotent) ama gereksiz işlem. Çözüm: `$transaction()` veya `UPDATE ... WHERE role = 'BEGINNER'` ile conditional update.

### (c) Tasarım Desenleri ve Eleştiri

**State Machine (basit):** `BEGINNER → EXPERIENCED → INSTRUCTOR` tek yönlü state geçişleri. `ROLE_RANK` haritası geçiş validasyonu için kullanılır.

**Eleştiri:**
- Threshold ve ödüller sabit kodlanmış (`const`). Admin paneli ile dinamik yapılabilirdi (`XpConfig` DB tablosu)
- XP kazanımları loglanmıyor — hangi kullanıcının ne zaman ne kadar kazandığını göremiyoruz. Audit için `XpTransaction` modeli eklenebilir

---

## ÖZELLİK 12 — Not Defteri (Notepad CRUD)

**İlgili Dosyalar:** `notes.service.ts`, `notes.controller.ts`

**Endpoint'ler:**
```
GET    /notes                           ← Tüm ağaç (NoteUnit > NoteTopic > Note)
POST   /notes/units                    ← Ünite oluştur
PATCH  /notes/units/:id                ← Ünite güncelle
DELETE /notes/units/:id                ← Ünite sil (cascade)
POST   /notes/units/:unitId/topics     ← Konu oluştur
PATCH  /notes/topics/:id               ← Konu güncelle
DELETE /notes/topics/:id               ← Konu sil (cascade)
POST   /notes/topics/:topicId/notes    ← Not oluştur
GET    /notes/:id                      ← Tek not (tam içerik)
PATCH  /notes/:id                      ← Otosave (title ve/veya content)
DELETE /notes/:id                      ← Not sil
```

**getTree() çağrı zinciri:**
```
NotesService.getTree(userId)
  └─ prisma.noteUnit.findMany({
       where: { userId },
       include: {
         topics: {
           include: {
             notes: { select: { id, title, order, updatedAt } }
           }
         }
       }
     })
```

### (a) Basit Anlatım
Üç katmanlı bir dosya dolabı: Çekmece (NoteUnit) > Klasör (NoteTopic) > Kağıt (Note). Maksimum 10 kağıt olabilir. Kağıtları açıp yazdığında 2 saniye duraksama sonrası otomatik kaydedilir (otosave). İçerik Tiptap editörü JSON formatında saklanır.

### (b) Teknik Analiz

**Tek sorgu ile ağaç:** Prisma `include` ile eager loading — tek SQL LEFT JOIN ile tüm hiyerarşi çekilir. N+1 sorunu yoktur.

**Sahiplik doğrulaması:**
- NoteUnit için: `unit.userId === requestUserId` — O(1) doğrudan
- NoteTopic için: `topic.unit.userId === requestUserId` — bir JOIN daha; `assertTopicOwner()` bunu yapar
- Note için: `note.topic.unit.userId === requestUserId` — iki JOIN; `getNote()` ve `autosave()` bunu yapar

Her derinlik katmanı için bir JOIN gerekir. 3 katmanlı hiyerarşi = maks 2 JOIN.

**NOT_LIMIT = 10:**
```typescript
const total = await prisma.note.count({
  where: { topic: { unit: { userId } } }
})
```
Bu sorgu: `SELECT COUNT(*) FROM notes JOIN topics ON ... JOIN units ON ... WHERE units.userId = ?`
O(n) n=kullanıcının toplam not sayısı; ama 10 limiti ile pratikte O(1) sabit.

**Tiptap JSON:** `content: Json @default("{}")` — PostgreSQL `jsonb` tipi. Herhangi bir JSON saklanabilir; tip güvenliği frontend sorumluluğu. `Prisma.InputJsonValue` cast gerekli: `null` kabul edilmez (Prisma kısıtı).

**Otosave `autosave()`:**
```typescript
data: {
  ...(dto.title !== undefined && { title: dto.title }),
  ...(dto.content !== undefined && { content: dto.content as Prisma.InputJsonValue }),
}
```
Spread ile koşullu güncelleme — sadece gönderilen alanlar güncellenir. `title` göndermeden `content` güncellenebilir ve tersi.

### (c) Tasarım Desenleri ve Eleştiri

**Composite Pattern:** NoteUnit > NoteTopic > Note hiyerarşisi "Kompozit" deseni; her seviye altındakini içerir; `getTree()` bu hiyerarşiyi bir seferde sunar.

**Guard Helper:** `assertUnitOwner()` ve `assertTopicOwner()` private metodlar — tekrarlayan sahiplik kontrolü merkezileştirilmiş. DRY (Don't Repeat Yourself).

**Eleştiri:**
- `order` alanı var ama sıralama yeniden düzenleme (drag-and-drop reorder) endpoint'i yok. Şu an sıralama yaratılma sırasına göre; order alanı gereksiz mevcut durumda
- `NOTE_LIMIT = 10` sabit kodlanmış. Premium kullanıcılara daha fazla sayfa vermek için DB'de `User.notesLimit` olabilirdi
- Otosave debounce frontend'e bırakılmış (tasarım kararı olarak yazılmış ama backend'de de rate limiting eklenebilir)

---

## ÖZELLİK 13 — Mail Kuyruğu (Bull Queue)

**İlgili Dosyalar:** `mail.module.ts`, `mail.processor.ts`, `mail.service.ts`

**Akış:**
```
AuthService.register()
  └─ mailQueue.add('send-verification', { to, name, code })
       │  [Redis: LPUSH mail:wait <jobJSON>]
       │
       └─ [arka planda, ayrı event loop tick'inde]
          MailProcessor.handleVerification(job)
            └─ MailService.sendVerificationCode(to, name, code)
                 └─ nodemailer.sendMail(...)    [SMTP TCP bağlantısı]
```

### (a) Basit Anlatım
Mektup gönderme işini postaneye bırakmak gibi. Sisteme "şu adrese şu kodu gönder" diye not yapıştırırsın ve devam edersin. Postane (Bull + Redis) o notu alır, kendi sırasına göre gönderir. 3 kez dener, başarısız olursa exponential backoff ile bekler (ilk hata: 5sn, ikinci: 25sn, üçüncü: 125sn).

### (b) Teknik Analiz

**Bull Queue mekanizması:**
- `LPUSH mail:wait jobJSON` → Redis liste başına ekler O(1)
- Worker `BRPOPLPUSH mail:wait mail:active` → bloklu sağdan alır, active listesine taşır
- İşlem başarılıysa `LREM mail:active jobId` + `ZADD mail:completed score jobId`
- Başarısızsa `ZADD mail:failed score jobId` → retry zamanlaması

**Exponential backoff:** `{ type: 'exponential', delay: 5000 }` → denemeler: 5s, 5s×5=25s, 25s×5=125s. Geçici ağ sorunlarında akıllı bekleme.

**Karmaşıklık:** Producer O(1). Consumer tek job işleme O(1) ama SMTP bağlantı gecikmeye bağlı (ağ I/O, bloklamaz).

### (c) Tasarım Desenleri ve Eleştiri

**Producer-Consumer + Command Pattern:** Job nesnesi (`{ to, name, code }`) bir komuttur. Producer (AuthService) oluşturur, consumer (MailProcessor) çalıştırır. Birbirinden tamamen bağımsız.

**Eleştiri:**
- `@Process('send-verification')` — süreç adı stringe bağlı, typo'ya açık. `MAIL_QUEUE` gibi sabit bir `MAIL_JOBS = { VERIFY: 'send-verification' }` export edilmeliydi
- SMTP kimlik bilgileri loglanmamalı — `MailService` constructor'da `Logger.debug()` ile SMTP config logu eklenirse şifre sızabilir. Şu an temiz.

---

## ÖZELLİK 14 — Presence Servisi (Redis)

**İlgili Dosya:** `redis/presence.service.ts`

**Not:** Presence servisi implement edilmiş fakat henüz `RoomsGateway`'e bağlanmamış; ilerleyen fazda kullanılmak üzere hazır.

**Veri Yapısı (Redis):**
```
presence:room:{roomId}  → Hash
  { userId_1: '{"userId":"...","name":"...","joinedAt":"..."}',
    userId_2: '...' }
```

### (a) Basit Anlatım
Her oda için Redis'te bir katılımcı listesi tutulur. Biri odaya girince eklenir, çıkınca silinir. "Bu odada şu an kimler var?" sorusu anlık cevaplanabilir.

### (b) Teknik Analiz

**Redis Hash (HSET/HGET/HGETALL):**
- `HSET presence:room:{id} {userId} {json}` → O(1)
- `HDEL presence:room:{id} {userId}` → O(1)
- `HGETALL presence:room:{id}` → O(n) n=odadaki kullanıcı sayısı

**Neden Hash değil Set?** Hash ile userId→JSON saklarız (isim, joinedAt dahil). Set sadece userId'yi saklardı, isim bilgisi için ayrı Redis sorgusu gerekirdi.

**lazyConnect + enableOfflineQueue: false:** Redis bağlantısı yoksa komutlar kuyruğa alınmaz, hata fırlatır; `try/catch` ile sessizce geçilir. Uygulama Redis olmadan çalışmaya devam eder.

### (c) Tasarım Desenleri ve Eleştiri

**Graceful Degradation:** Her Redis metodu `try/catch` ile sarılmış — Redis düşerse presence çalışmaz ama uygulama çökmez.

**Eleştiri:**
- TTL yok — sunucu crash'larda kullanıcılar "presence" listesinde takılı kalır. `EXPIRE presence:room:{id} 3600` (1 saat) veya her join'de TTL yenilemek gerekir
- `leaveAll()` (roomId bilinmiyorsa) `KEYS presence:room:*` kullanıyor — production'da tehlikeli; Redis tüm keyspace'i tarar, bloklar. `SCAN` cursor tabanlı iterasyon kullanılmalı
