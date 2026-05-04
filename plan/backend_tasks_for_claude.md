# koZan - Backend Geliştirme Planı (Claude İçin Optimize Edilmiş)

Bu doküman, koZan projesinin backend (NestJS) kısmını yapay zekaya (Claude vb.) en az token harcayarak ve en verimli şekilde yazdırmak için modüllere (pull request bazlı) bölünmüştür.

## 🤖 Claude'u En Verimli Kullanma ve Token Tasarrufu Stratejisi

Claude (veya başka bir LLM) ile tüm projeyi tek seferde yazdırmaya çalışmak **yapabileceğin en büyük hatadır**. Hem context window dolar, hem kod kalitesi düşer (halüsinasyon başlar), hem de çok fazla token harcarsın.

**Optimal Yol Haritası:**
1. **Bağlamı (Context) Sabitleyin:** Yeni bir sohbet başlatın ve projeyi tanıtın. "Sadece backend (NestJS) yapacağız, frontend yok" kuralını kesin olarak koyun.
2. **Görev Görev İlerleyin:** Aşağıdaki modülleri sırasıyla, teker teker verin. Bir modül bitip hatasız çalıştığından emin olmadan diğerine geçmeyin.
3. **"Sadece Değişenleri Ver" Kuralı:** Claude'a sürekli *"Eğer bir dosyada küçük bir değişiklik yapıyorsan bana dosyanın tamamını değil, sadece değişen kısmı (diff) ver"* uyarısını yapın. Bu çok ciddi token tasarrufu sağlar.
4. **Hataları (Error) Çözerken:** Terminaldeki hatanın tamamını atmayın. Sadece `Error:` ile başlayan anlamlı kısmı atın.

---

## 📋 Claude İçin Modül Modül (Görev) Promptları

Yeni bir sohbete başladığında Claude'a önce şu **Sistem Mesajını** at:

> **PROMPT 0 (Sistem ve Proje Özeti - Sadece 1 Kere Verilecek):**
> "Merhaba Claude. Seninle 'koZan' adında bir mobil uygulamanın sadece Backend'ini (NestJS) yazacağız. Frontend kısımları beni ilgilendiriyor, sen sadece API'leri, veritabanını ve WebSocket'leri kuracaksın.
> Teknoloji yığınımız: NestJS, PostgreSQL (Supabase/Prisma veya TypeORM), JWT Auth, Socket.io, Agora RTC (Token servisi).
> Lütfen bana sadece istediğim modüllerin kodunu yaz. Kodu verirken tüm dosyayı yazmak yerine sadece eklemem gereken kısımları ver. Şimdilik hiçbir kod yazma, sadece anladığını onayla ve ilk görevimi bekle."

---

### GÖREV 1: Proje Kurulumu, Veritabanı ve Auth Modülü (Temel)
**Amacımız:** Uygulamanın iskeletini kurmak ve kullanıcıların kayıt olup giriş yapmasını (JWT) sağlamak.

> **PROMPT 1:**
> "Görev 1: Projenin iskeletini ve Auth (Kimlik Doğrulama) modülünü kuruyoruz.
> 1. Veritabanı olarak Prisma (PostgreSQL) kullanacağız. Bana Prisma şemasını yaz (`User` tablosu olsun: id, email, password, name, createdAt).
> 2. NestJS 'Auth' ve 'Users' modüllerini oluştur.
> 3. Register (Kayıt) ve Login (Giriş) endpoint'lerini yaz. Şifreler bcrypt ile hash'lenmeli.
> 4. Başarılı girişte JWT dönmeli ve endpointleri korumak için `JwtAuthGuard` oluşturmalısın.
> Lütfen gereksiz açıklamalar yapmadan sadece CLI komutlarını (paket kurulumları) ve ilgili dosya kodlarını ver."

---

### GÖREV 2: Odalar (Rooms) Modülü
**Amacımız:** Kişisel odalar ve Topluluk odalarının (YKS, KPSS vb.) CRUD (Oluşturma, Okuma, Güncelleme, Silme) işlemlerini yapmak.

> **PROMPT 2:**
> "Görev 2: Odalar (Rooms) modülünü ekliyoruz.
> 1. Prisma şemasına `Room` modelini ekle. Alanlar: id, title, type (enum: PERSONAL, COMMUNITY), ownerId (User ile ilişkili), createdAt.
> 2. `Rooms` modülünü oluştur.
> 3. Şu endpoint'leri yaz: 
>    - `POST /rooms` (Yeni oda oluşturma, JWT zorunlu)
>    - `GET /rooms` (Tüm odaları listeleme)
>    - `GET /rooms/:id` (Oda detayı)
> 4. Tüm bu işlemleri Users modülüyle ilişkili şekilde yap."

---

### GÖREV 3: Agora RTC Token Servisi
**Amacımız:** Kullanıcıların kameralarını açabilmesi için güvenli bir şekilde Agora token'ı üretip mobil tarafa vermek.

> **PROMPT 3:**
> "Görev 3: Agora RTC için Token üretim endpoint'i yazacağız. (Görüntülü konuşma güvenliği için)
> 1. `agora-access-token` paketini kullanarak bir servis (AgoraService) oluştur.
> 2. `GET /rooms/:id/agora-token` endpoint'ini yaz. Bu endpoint JwtAuthGuard ile korunmalı.
> 3. Endpoint, kullanıcının ID'sini (UUID ise integer'a çevirerek) kullanarak 1 saat geçerli bir Agora token'ı üretip dönmeli. (Role: PUBLISHER olmalı)
> Sadece bu yeni eklenen `agora.service.ts` ve controller güncellemelerini ver."

---

### GÖREV 4: Q&A (Soru-Cevap) ve Veritabanı İlişkileri
**Amacımız:** Odalar içinde soru sorulabilmesi ve bu soruların veritabanında tutulması.

> **PROMPT 4:**
> "Görev 4: Q&A (Soru-Cevap) modülünü ekliyoruz.
> 1. Prisma şemasına `Question` modelini ekle. Alanlar: id, content, upvotes (int, default 0), authorId (User), roomId (Room), createdAt.
> 2. `Questions` modülünü oluştur.
> 3. Şu endpointleri yaz:
>    - `POST /questions` (Odaya soru sorma, DTO'da roomId ve content olmalı)
>    - `GET /rooms/:id/questions` (Odadaki soruları getirme, oy sayısına göre azalan sıralı)
>    - `POST /questions/:id/vote` (Soruya upvote verme)"

---

### GÖREV 5: Socket.io ile Gerçek Zamanlı İletişim
**Amacımız:** Soru sorulduğunda veya biri odaya girdiğinde sayfayı yenilemeye gerek kalmadan herkesin anında görmesi.

> **PROMPT 5:**
> "Görev 5: Gerçek zamanlı işlemler için WebSockets (Socket.io) kuruyoruz.
> 1. NestJS `RoomsGateway` adında bir websocket gateway'i oluştur. `@WebSocketGateway()` kullan.
> 2. İstemci bir odaya bağlandığında onu o Socket odasına al (`client.join(roomId)`).
> 3. 'question:new' event'ini ekle. Birisi yeni soru sorduğunda, o roomId'deki herkese soruyu anında yayınla (emit).
> 4. 'vote:updated' event'i ekle. Oylar değiştiğinde odaya güncel sayıyı ilet.
> Sadece Gateway dosyasını ve Q&A servisinde Socket'i çağırdığın (emit) yerleri göster."

---

## 💡 Cila Aşaması (Frontend ve Test)
Bu 5 görevi sırayla Claude'a yaptırıp her bir adımı Postman (veya Insomnia/Swagger) ile test ettiğinde elinde taş gibi çalışan, sıfır hataya yakın bir Backend olacak. Token israfı yaşamayacaksın ve proje context'i Claude'un hafızasında çok daha net kalacak.

Backend %100 bittikten sonra yeni bir Claude sohbeti açıp Frontend (Android/iOS) kısmına geçebilirsin. O zaman da sadece *"Al bu bizim çalışan API Swagger / Endpoint listemiz, şimdi buna uygun Jetpack Compose UI yaz"* diyeceksin.
