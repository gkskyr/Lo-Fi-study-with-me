# Kozan — Kapsamlı Teknik Mimari (6 Oturum)

---

## 🟦 OTURUM 1: Kullanıcı Tipleri, Kimlik Doğrulama ve Yetki Yönetimi

### 1.1 Kullanıcı Tipleri

| Kullanıcı Tipi | Kısaca | Kazanım Koşulu |
| :--- | :--- | :--- |
| **Beginner** | Yeni katılan kullanıcı | Kayıt anında verilir |
| **Experienced** | Tecrübeli kullanıcı | Belirli soru/cevap/oy/süre eşiğini geçince otomatik yükselir |
| **Instructor** | Eğitmen | Sertifika/belge yükleyip admin onayı alınca verilir |

> **Teknik Not:** Bu bir RBAC + Dinamik Unvan (Gamification) hibritidir. Roller veritabanında sabit tutulurken, yükselme mantığı (eşik kontrolü) backend'de servis katmanında işlenir.

### 1.2 Authentication (Kimlik Doğrulama)

#### Teknoloji: NestJS + Passport.js + JWT + Refresh Token

**Nasıl Çalışır?**

1. Kullanıcı e-posta/şifreyle POST `/auth/register` çağırır.
2. NestJS, şifreyi **bcrypt** ile hash'ler (düz metin asla saklanmaz).
3. Başarılı girişte iki adet token üretilir:
   - **Access Token (JWT):** 15 dakika ömürlü, her API isteğinde `Authorization: Bearer <token>` header'ında gönderilir.
   - **Refresh Token:** 7 gün ömürlü, sadece `/auth/refresh` endpoint'ine gönderilir ve yeni Access Token alınır.
4. Refresh Token **veritabanında (Postgres)** saklanır, böylece çalındığında sunucu tarafından geçersiz kılınabilir (revoke).

**Neden Bu Yapı?**
- Access Token kısa ömürlü → Çalınsa bile 15 dakika sonra işe yaramaz.
- Refresh Token sunucuda saklandığı için → Token'ı çalan birine "Çıkış Yap (tüm cihazlar)" diyebiliriz.

**OAuth Seçeneği (Opsiyonel):**
Mevcut yapıya Google OAuth eklemek için `passport-google-oauth20` stratejisi eklenir. Supabase Auth kullanılırsa bu otomatik gelir.

### 1.3 Authorization (Yetki Yönetimi) — RBAC

#### Teknoloji: NestJS Guards + Custom Decorators

NestJS'in `@UseGuards()` ve `@Roles()` mekanizması her route üzerinde kimin ne yapabileceğini belirler.

```typescript
@Get('rooms/:id/broadcast')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERIENCED', 'INSTRUCTOR')
startBroadcast() { ... }
```

**Roles tablosu (Postgres):**
```
User: id, email, passwordHash, role (BEGINNER | EXPERIENCED | INSTRUCTOR), xpPoints, createdAt
```

### 1.4 Dinamik Yükselme Sistemi (Gamification)

#### Teknoloji: NestJS Events + Background Jobs (Bull Queue)

**Nasıl Çalışır?**
1. Kullanıcı bir soru yanıtladıkça, oy kullandıkça, süre geçirdikçe backend **XP puanı** ekler.
2. Her işlem sonrası `UserService.checkPromotion()` metodu çalışır (Bull Queue ile arka planda).
3. Eşikler aşılırsa kullanıcı rolü **BEGINNER → EXPERIENCED** olarak güncellenir ve Socket.io ile kullanıcıya `role_upgraded` eventi gönderilir.

**Neden Bull Queue?**
Eşik kontrolünü her API isteğinin ortasında yapmak yavaşlatır. Bunu arka plana atarak API hız kaybı olmadan çözülür.

---

## 🟩 OTURUM 2: Oda Tipleri — Teknik Detay

### 2.1 Topluluk Odaları (Community Rooms) — YKS, KPSS, Engineering...

**Kimler Girebilir:** Tüm kullanıcılar  
**Q&A:** Var (StackOverflow tarzı)  
**Chat:** Yok (sadece Q&A)

| Katman | Teknoloji | Amaç |
| :--- | :--- | :--- |
| **Backend** | NestJS `RoomsModule` | Oda CRUD işlemleri, kategori yönetimi |
| **Q&A** | NestJS `QAModule` | Soru/cevap/oy endpoint'leri |
| **Database** | PostgreSQL | `Question`, `Answer`, `Vote` tabloları |
| **Search** | **Postgres Full Text Search** | Soru arama (bedava, sıfır bağımlılık) |
| **Realtime Oy** | Socket.io | Oy sayısı anlık güncellenir (sayfa yenileme yok) |
| **Moderation** | NestJS Guard + Moderator Role | Spam/uygunsuz içerik yönetimi |

**Postgres Full Text Search Neden Önemli?**
`to_tsvector('turkish', question.content)` ile Türkçe morfoloji desteği (kök arama) sağlanır. Algolia/Meilisearch ödemeden aynı işi yapar.

---

### 2.2 Arkadaş Odaları (Friend Rooms)

**Kimler Açabilir:** Experienced + Instructor  
**Kimler Girebilir:** Davet edilen herkes (Beginner dahil)  
**Kamera:** Tüm katılımcılar açabilir  
**Chat:** Var  
**Q&A:** Yok

| Katman | Teknoloji | Amaç |
| :--- | :--- | :--- |
| **Media** | **Agora RTC SDK** | Çoklu kamera, SFU mimarisi, ücretsiz 10k dk/ay |
| **Chat** | Socket.io | Anlık metin mesajlaşması |
| **Presence** | **Redis SET** | `room:{id}:members` key'inde kimler var anlık tutulur |
| **Invite** | NestJS + Postgres | Davet linki üretilir, geçerlilik süresi Redis'te tutulur |
| **Backend** | NestJS `FriendRoomsModule` | Oda başlatma, kapatma, kullanıcı kickleme |

**Agora SFU Nasıl Çalışır?**
Her katılımcı kamerasını Agora sunucusuna gönderir. Agora, bu akışları birleştirip diğer katılımcılara dağıtır. Peer-to-Peer (P2P) yerine sunucu üzerinden gittiği için 10+ kişide ağ yükü katılımcıların bilgisayarına binmez.

---

### 2.3 Kişisel Odalar (Personal Rooms)

**Kimler Açabilir:** Tüm kullanıcılar (her kullanıcıya otomatik oluşturulur)  
**Kamera:** İsteğe bağlı (sadece kendi çalışma kamerası)  
**Özelleştirme:** Arka plan, tema, Spotify bağlantısı

| Katman | Teknoloji | Amaç |
| :--- | :--- | :--- |
| **Theme Engine** | CSS Variables + Tailwind | Kullanıcı teması anında uygulanır |
| **Resim Yükleme** | Supabase Storage | Arka plan görseli, sunucuda saklanır |
| **Pomodoro** | Zustand (Frontend State) | Sayaç durumu, tab değişiminde kaybolmaz |
| **Notlar** | Tiptap (Block Editor) | Zengin metin notları, Markdown desteği |

#### 🎵 Spotify Entegrasyonu — Yapılabilir Mi?

**Kısa Cevap:** Evet, ama sınıflı.

**Spotify Web API** ile kullanılabilir. OAuth 2.0 ile kullanıcı "Kozan'ın Spotify'ına erişimine izin ver" der. Sonrasında:
- Şu an çalan şarkıyı gösterebiliriz (`/me/player/currently-playing`)
- Kullanıcının odası ziyaret edildiğinde "Göksu şu an şunu dinliyor" kutusu çıkar

**Sınırlaması:** Kozan doğrudan şarkı çalamaz (telif). Sadece "ne çalıyor" bilgisini gösterebiliriz ve "Spotify'da aç" linki sunabiliriz. Kullanıcıların Spotify Premium'u olması gerekir.

**Teknik Akış:**
```
1. Kullanıcı "Spotify'ı Bağla" butonuna tıklar
2. Backend Spotify OAuth URL'i üretir
3. Kullanıcı Spotify'da giriş yapar, yetki verir
4. Spotify token → NestJS'e gelir → Postgres'te saklanır
5. Frontend her 30 saniyede GET /spotify/now-playing çağırır
6. NestJS Spotify API'ye sorar, sonucu döner
```

---

### 2.4 Eğitmen Ders Odaları (Instructor Live Rooms)

**Kimler Açabilir:** Sadece Instructor  
**Kimler Girebilir:** Bu dersi satın almış kullanıcılar  
**Kamera:** Eğitmen + (izinle) öğrenci  
**Chat:** Var  
**Q&A:** Var (moderasyonlu)

| Katman | Teknoloji | Amaç |
| :--- | :--- | :--- |
| **Access Gate** | NestJS Guard + `UserCourse` tablosu | Derse girmek için satın alma kaydı kontrol edilir |
| **Media** | Agora RTC | Çoklu kamera akışı |
| **Recording** | **Agora Cloud Recording** | Ders otomatik kaydedilir, S3'e atılır |
| **Chat** | Socket.io - moderasyonlu | Eğitmen mesaj silebilir, kullanıcı susturabilir |
| **Q&A** | Onay sistemi | Soru söz kuyruğuna girer, eğitmen onaylarsa yayına taşınır |

---

## 🟨 OTURUM 3: Eğitmen İşlemleri — Ders Oluşturma ve Ödeme

### 3.1 Eğitmen Başvuru Süreci

```
Instructor Başvuru Akışı:
1. Kullanıcı form doldurur + sertifika uploadlar (Supabase Storage)
2. Admin panelden onaylanır (Admin rolü)
3. NestJS role'ü EXPERIENCED → INSTRUCTOR olarak günceller
4. Socket.io ile kullanıcıya bildirim gönderilir
```

### 3.2 Ders Oluşturma

**Teknoloji:** NestJS `CoursesModule` + PostgreSQL

```
Course tablosu:
- id, title, description, price, instructorId
- scheduledAt (ders saati), durationMinutes
- maxParticipants, status (DRAFT | PUBLISHED | LIVE | ENDED)
- recordingUrl (nullable, ders sonrası dolu)
```

Eğitmen ders oluşturur → `DRAFT` → Fiyat ve saat girer → `PUBLISHED` → Kullanıcılar satın alabilir → Saat gelince `LIVE` → Biter `ENDED` + kayıt URL'si eklenir.

### 3.3 Ödeme Sistemi

#### Teknoloji: Stripe (veya Iyzico) + Webhook

**Neden Stripe/Iyzico?**
PayPal global ama Türkiye için sorunlu. **Iyzico** Türk pazarı için idealtir (Trendyol, Hepsiburada kullanıyor). **Stripe** ise tam kapsamlı ve Sandbox modu çok gelişmiş.

**Ödeme Akışı (Stripe örneği):**
```
1. Kullanıcı "Satın Al" butonuna tıklar
2. Frontend → POST /payments/checkout { courseId }
3. NestJS → Stripe API'ye "Payment Intent" oluşturur (fiyat, kur)
4. Stripe → client_secret döner
5. Frontend → Stripe.js ile ödeme formu gösterir (PCI uyumlu)
6. Kullanıcı kart bilgisini Stripe'a girer (Kozan hiçbir zaman kart bilgisi görmez!)
7. Stripe → Ödeme başarılı → Webhook ile POST /payments/webhook çağırır
8. NestJS → UserCourse tablosuna kayıt atar
9. Kullanıcıya "Ders satın alındı" e-postası gönderilir
```

**Webhook Neden Önemli?**
Kullanıcı ödeme sayfasını kapansa bile Stripe bizim backend'imizi doğrudan arar. Frontend olmadan da kayıt oluşur.

### 3.4 Yayın Tekrarı (VOD — Video on Demand)

**Teknoloji:** Supabase Storage + Signed URL (NestJS)

```
Güvenli Video Erişim Akışı:
1. Kullanıcı "Tekrarı İzle" butonuna tıklar
2. Frontend → GET /courses/:id/recording
3. NestJS → UserCourse tablosunda satın alma kontrolü
4. Kontrol geçilirse → Supabase Storage Signed URL üretilir (1 saatlik geçerli)
5. Frontend → Bu URL ile videoyu oynatır
6. 1 saat sonra URL çalışmaz, yeniden istemek gerekir
```

**Signed URL Neden Kritik?**
Statik URL verseydin, birisi linki paylaşır ve ödeme yapmayan herkes izlerdi. Signed URL her kullanıcı için farklı ve süreli olur.

---

## 🟥 OTURUM 4: Gerçek Zamanlı Özellikler — Kamera, Q&A, Oy, Chat

### 4.1 Kamera Açma/Kapama (Agora RTC)

```
Akış:
1. Kullanıcı "Kamera Aç" butonuna basar
2. Frontend → GET /rooms/:id/agora-token (NestJS'ten geçici token alır)
3. NestJS → Agora API'ye UID + RoomId ile token ürettirir → döner
4. Frontend → Agora SDK ile odaya katılır (kamera akışı başlar)
5. Socket.io event: { type: 'USER_CAMERA_ON', userId, agoraUID }
6. Diğer kullanıcılarda bu event alınır → Grid'e yeni video penceresi eklenir
```

**Neden Agora Token?**
Token olmadan oda ID'sini bilen herkes katılabilirdi. Token sadece yetkili kullanıcıların medya sunucusuna bağlanmasını garanti eder.

### 4.2 Q&A Sistemi (Oylama + Gerçek Zamanlı)

```
Soru Sorma Akışı:
1. Kullanıcı soruyu yazar → POST /qa/questions { roomId, content, tags }
2. JWT doğrulanır, soru Postgres'e yazılır
3. Socket.io event: { type: 'NEW_QUESTION', question }
4. Odadaki herkese anlık olarak soru listelenir

Oylama Akışı:
1. Kullanıcı upvote'a tıklar → POST /qa/questions/:id/vote { direction: UP }
2. NestJS duplicate oy kontrolü yapar (unique(userId, questionId) constraint)
3. Vote Postgres'e yazılır, soru vote_count güncellenir
4. Socket.io event: { type: 'VOTE_UPDATED', questionId, newCount }
5. Tüm kullanıcıların ekranında sayı gerçek zamanlı artar
```

### 4.3 Chat (Socket.io)

**Mesaj yapısı:**
```json
{ "senderId": "...", "senderName": "...", "content": "...", "roomId": "...", "sentAt": "...", "type": "TEXT | SYSTEM" }
```

**Özellikler:**
- Mesajlar Postgres'te saklanır (geçmiş yükleme için)
- Son 50 mesaj Redis'te cache'lenir (hızlı yükleme)
- `SYSTEM` tipi: "Göksu odaya katıldı" gibi sistem mesajları

### 4.4 Presence (Kim Nerede)

```
Redis Key Yapısı:
  room:{roomId}:members → SET { userId1, userId2, ... }
  user:{userId}:status  → STRING { roomId, lastSeen }

Akış:
1. Kullanıcı sokete bağlanır → Redis SET'e userId eklenir
2. Bağlantı koparsa → disconnect event → Redis'ten silinir
3. GET /rooms/:id/presence → Redis'ten anında döner (DB sorgusu yok)
```

**Neden Redis burada kritik?**
Presence'ı Postgres'te tutsan her saniye SQL sorgusu atmak gerekir. Redis'te bir SET işlemi mikrosaniyeler içinde tamamlanır.

---

## 🟪 OTURUM 5: Global Yüzen Not Defteri

### 5.1 Konsept

- Her sayfada sağ köşede yüzen küçük bir ikon
- Tıklanınca "Not Paneli" açılır (sidebar veya modal)
- **Ücretsiz:** 3'e kadar bölme (section/notebook)
- **Premium:** Sınırsız bölme

### 5.2 Teknoloji Yığını

| Katman | Teknoloji | Amaç |
| :--- | :--- | :--- |
| **UI Bileşeni** | React (Floating Action Button) | Tüm sayfalarda üst katmanda render edilir |
| **Editor** | **Tiptap** | Block tabanlı zengin metin editörü, açık kaynak |
| **State** | **Zustand** | Çevrimiçiyken notların geçici olarak tutulması |
| **Kalıcı Depolama** | PostgreSQL + Otosave | Her 2 saniyede bir değişiklik backend'e yazılır |
| **Limit Kontrolü** | NestJS Guard | Ücretsiz kullanıcı 4. bölmeyi açmaya çalışırsa 403 döner |

### 5.3 Otosave ve Bölme Limiti

```
Otosave Akışı:
1. Kullanıcı yazmaya başlar
2. Frontend → 2 saniye debounce → PATCH /notes/:id { content }
3. NestJS → Postgres'te günceller (sayfa kapansa bile kaybolmaz)

Section limit kontrolü:
1. Kullanıcı yeni bölme oluşturmak ister
2. NestJS → SELECT COUNT(*) FROM notes WHERE userId = ?
3. Count >= 3 AND user.isPremium = false → 403 Forbidden + "Premium'a geç" mesajı
```

---

## ⬛ OTURUM 6: Altyapı Kararları ve Atlanan Teknolojiler

### 6.1 Docker — Kullanıyor Muyuz?

**Cevap: Geliştirme sürecinde EVET, Production'da (MVP) HAYIR.**

```yaml
# docker-compose.yml (Local Dev)
services:
  postgres:
    image: postgres:16
  redis:
    image: redis:7
```

Takım çalışmasında herkesin bilgisayarında aynı PostgreSQL/Redis versiyonu çalışır.  
Production'da Railway/Vercel bu yönetimi zaten yapıyor, ek maliyet yok.

### 6.2 CI/CD — GitHub Actions

Her `git push`'ta otomatik:
1. TypeScript derleme hatası var mı? (`tsc --noEmit`)
2. Testler geçiyor mu? (`jest`)
3. Geçtiyse Railway/Vercel'e otomatik deploy

**Maliyet:** GitHub Actions ayda 2000 dakika ücretsiz. Fazlasıyla yeter.

### 6.3 API Dokümantasyonu — Swagger

`@nestjs/swagger` ile 3 satır kod ekleyince `/api/docs` adresinde otomatik interaktif API belgesi çıkar.

### 6.4 Monitoring & E-posta

- **Sentry** (ücretsiz tier): Frontend + backend hata izleme, mail bildirim
- **Resend** (ücretsiz tier): Ders satın alındı, ders hatırlatıcı, rol yükseltme e-postaları

### 6.5 Teknoloji Özet Tablosu

| Teknoloji | Kategori | Ücretsiz Mi? | Neden Seçildi |
| :--- | :--- | :--- | :--- |
| NestJS | Backend Framework | ✅ | Modüler, TypeScript, çok olgun |
| Next.js | Frontend Framework | ✅ | SSR, SEO, Vercel deploy |
| PostgreSQL | Ana Veritabanı | ✅ | Güçlü ilişkisel veri |
| Redis (Upstash) | Cache/Pub-Sub | ✅ | Presence, rate limit, session |
| Socket.io | Realtime Events | ✅ | Chat, oy, presence sync |
| Agora | Media (Video/Ses) | ✅ 10k dk/ay | Çoklu kamera, SFU |
| Supabase Storage | Dosya Depolama | ✅ | Resim, ses, video kayıtları |
| Stripe / Iyzico | Ödeme | ✅ Sandbox | PCI uyumlu güvenli ödeme |
| Tiptap | Metin Editörü | ✅ | Not defteri, block editör |
| Zustand | Frontend State | ✅ | Hafif, hızlı state yönetimi |
| Shadcn/UI | UI Bileşenleri | ✅ | Premium görünüm |
| Bull Queue | Background Jobs | ✅ | XP/rol yükseltme işlemleri |
| Sentry | Hata İzleme | ✅ | Canlı hata takibi |
| GitHub Actions | CI/CD | ✅ | Otomatik test ve deploy |
| Docker | Geliştirme Ortamı | ✅ | Yerel tutarlı ortam |
| Swagger | API Dokümantasyon | ✅ | Otomatik interaktif belgeler |
| Spotify Web API | Müzik Entegrasyon | ✅ | "Şu an çalıyor" widget |
| Resend | E-posta | ✅ | Ders bildirimleri |
