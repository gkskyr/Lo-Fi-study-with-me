# Kozan — 11 Haftalık Geliştirme Takvimi

> **Başlangıç Tarihi:** 10 Mart 2026
> **Bitiş Tarihi:** 25 Mayıs 2026
> **Çalışma Temposu:** Günde 2–4 saat (okul + proje dengesi)

---

## 📅 Hafta 1 (10–16 Mart) — Teknoloji Araştırması & Ortam Kurulumu

**Tema:** "Hiç elimi kirletmeden tam anlamak"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | NestJS Quickstart (resmi dökümantasyon, ilk modülü çalıştır) |
| Sal | PostgreSQL kurulumu + Docker Compose ile local ayağa kaldır |
| Çar | Prisma ORM: ilk migration'ı yaz, User tablosu oluştur |
| Per | Redis Upstash ücretsiz hesap aç, NestJS'e bağlan |
| Cum | Next.js proje oluştur, Shadcn/UI kur, ilk sayfayı tasarla |
| Haf | Agora ücretsiz hesap aç, "Hello Video" demo çalıştır (resmi örnek) |

**Hafta Sonu Hedefi:** Tüm teknolojileri yerel makinede çalışır halde görmüş olmak.

---

## 📅 Hafta 2 (17–23 Mart) — Proje Altyapısı & Mimari Kurulum

**Tema:** "Temeli sağlam at, ileride ağlamayasın"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | NestJS monorepo yapısını kur (modules: Auth, Rooms, QA, Notes, Courses) |
| Sal | Prisma şeması: User, Room, Question, Answer, Vote tabloları + migration |
| Çar | Swagger entegrasyonu (her endpoint otomatik belgelenir) |
| Per | GitHub repo aç, branch stratejisi belirle (main / dev / feature/*) |
| Cum | GitHub Actions: push'ta `tsc --noEmit` çalışsın (tip hatası yakalanır) |
| Haf | Vercel + Railway ücretsiz proje aç, boş projeyi deploy et (pipeline testi) |

**Hafta Sonu Hedefi:** Boş ama deploy edilebilir, test pipeline'ı çalışan bir proje.

---

## 📅 Hafta 3 (24–30 Mart) — Authentication & Kullanıcı Sistemi

**Tema:** "Kimsin sen?" — Kayıt, giriş, yetki

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | `POST /auth/register` — bcrypt şifre hash, kullanıcı kaydı |
| Sal | `POST /auth/login` — JWT Access Token + Refresh Token üretimi |
| Çar | `POST /auth/refresh` — Token yenileme endpoint'i |
| Per | `JwtAuthGuard` + `RolesGuard` yazılır (BEGINNER / EXPERIENCED / INSTRUCTOR) |
| Cum | XP sistemi: puan ekleme servisi + eşik kontrolü (Bull Queue kurulumu) |
| Haf | Swagger'da Auth endpoint'lerini test et, Postman koleksiyonu oluştur |

**Hafta Sonu Hedefi:** Kayıt → giriş → token → yetkili istek → başarı akışı çalışıyor.

---

## 📅 Hafta 4 (31 Mart – 6 Nisan) — Oda Sistemi & Q&A Backend

**Tema:** "Odaların iskeletini çıkar"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | `RoomsModule` CRUD: oda oluştur, listele, detay, sil |
| Sal | Oda tipleri: COMMUNITY / FRIEND / PERSONAL / INSTRUCTOR — enum + guard mantığı |
| Çar | `QAModule`: soru oluştur, listele, cevapla endpoint'leri |
| Per | Oylama endpoint'i: duplicate oy koruması (unique constraint) |
| Cum | Postgres Full Text Search: Türkçe soru arama (`to_tsvector`) |
| Haf | Tüm endpoint'leri Swagger'da test et |

**Hafta Sonu Hedefi:** API katmanı tamamlandı, veritabanı şeması oturdu.

---

## 📅 Hafta 5 (7–13 Nisan) — Realtime: Socket.io + Redis Presence

**Tema:** "Canlı hissettir"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | NestJS Socket.io Gateway kurulumu, `@WebSocketGateway` |
| Sal | Presence: odaya katılında Redis SET'e yaz, ayrılınca sil |
| Çar | Event'ler: `USER_JOINED`, `USER_LEFT`, `NEW_MESSAGE` emit |
| Per | Chat mesajı gönder/al + Postgres'e kaydet |
| Cum | Son 50 mesajı Redis'te cache'le (hızlı oda yükleme) |
| Haf | Frontend'de basit bir Socket.io bağlantısı test et (console.log seviyesi) |

**Hafta Sonu Hedefi:** Gerçek zamanlı oda olayları akıyor, presence Redis'te çalışıyor.

---

## 📅 Hafta 6 (14–20 Nisan) — Kişisel Oda, Not Defteri, Spotify

**Tema:** "Kullanıcıya kendi köşesini ver"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | Her kullanıcıya kayıtta otomatik Personal Room oluştur |
| Sal | Supabase Storage: arka plan resmi yükleme endpoint'i |
| Çar | `NotesModule`: CRUD + 3 bölme limiti (Guard ile) + Tiptap JSON formatı |
| Per | Otosave: PATCH endpoint'i hazır + frontend debounce |
| Cum | Spotify OAuth akışı: `/spotify/connect` + `/spotify/now-playing` |
| Haf | Pomodoro mantığını frontend state (Zustand) ile kur |

**Hafta Sonu Hedefi:** Kişisel oda tamamen çalışıyor, Spotify widget aktif.

---

## 📅 Hafta 7 (21–27 Nisan) — Agora Video Entegrasyonu

**Tema:** "Kameralar açılsın"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | Agora Token üretme servisi: `GET /rooms/:id/agora-token` |
| Sal | Next.js: Agora Web SDK ile çoklu kamera grid'i |
| Çar | Kamera aç/kapat Socket.io event'leri (`USER_CAMERA_ON/OFF`) |
| Per | Arkadaş odası: davet linki üret, geçerlilik Redis'te tut |
| Cum | Eğitmen odası: Agora Cloud Recording başlat/durdur endpoint'leri |
| Haf | 3–5 kişiyle gerçek çoklu kamera testi (gecikme ölçümü) |

**Hafta Sonu Hedefi:** Çoklu kamera çalışıyor, kayıt başlıyor ve durduruluyor.

---

## 📅 Hafta 8 (28 Nisan – 4 Mayıs) — Ödeme Sistemi & Eğitmen Araçları

**Tema:** "Para dönmeye başlasın"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | Stripe Sandbox hesap aç, NestJS'e Stripe SDK ekle |
| Sal | `POST /payments/checkout` → Stripe Payment Intent |
| Çar | Stripe Webhook: `payment_intent.succeeded` → UserCourse kaydı |
| Per | Signed URL: video tekrarını sadece alıcıya aç |
| Cum | Eğitmen başvuru formu + sertifika yükleme (Supabase Storage) + admin onay endpoint'i |
| Haf | Uçtan uca ödeme testi: sahte kart → ders erişimi → video izleme |

**Hafta Sonu Hedefi:** Ödeme akışı baştan sona çalışıyor, yetkisiz erişim engelleniyor.

---

## 📅 Hafta 9 (5–11 Mayıs) — Frontend Geliştirme

**Tema:** "Güzel göster"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | Ana sayfa, oda listesi sayfası tasarımı (Shadcn/UI + Tailwind) |
| Sal | Kayıt / Giriş ekranları + JWT yönetimi (cookie/localStorage) |
| Çar | Topluluk odası sayfası: Q&A listesi + gerçek zamanlı oy |
| Per | Eğitmen ders odası: video grid + chat + Q&A paneli |
| Cum | Kişisel oda: tema seçici + Spotify widget + Pomodoro |
| Haf | Yüzen Not Defteri bileşeni: tüm sayfalarda çalışsın |

**Hafta Sonu Hedefi:** Kullanıcı arayüzü görsel olarak tamamlanmış, temel akışlar çalışıyor.

---

## 📅 Hafta 10 (12–18 Mayıs) — Test, Hata Düzeltme & Polish

**Tema:** "Kırılmadan sunum yap"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | Sentry entegrasyonu (frontend + backend hata izleme) |
| Sal | Resend ile e-posta bildirimleri (ders hatırlatıcı, rol yükseltme) |
| Çar | Integration test: kayıt → oda → soru → oy → ödeme → video tam akışı |
| Per | Mobil uyumluluk: responsive CSS düzeltmeleri |
| Cum | Yük testi: 10 kişiyle aynı odada canlı test |
| Haf | Tüm bulunan hataları düzelt, edge case'leri kapat |

**Hafta Sonu Hedefi:** Proje kararlı, crash çıkarmıyor, sunum için hazır.

---

## 📅 Hafta 11 (19–25 Mayıs) — Sunum Hazırlığı & Demo

**Tema:** "Sat kendini"

| Gün | Yapılacak |
| :--- | :--- |
| Pzt | Swagger API belgesini temizle ve güzelleştir |
| Sal | README.md yaz: proje açıklaması, mimari, nasıl çalıştırılır |
| Çar | Demo senaryosu hazırla: Beginner kayıt → Experienced ol → Eğitmen ders aç → Ödeme |
| Per | Sunum slaytı: problem, çözüm, mimari, teknoloji kararları |
| Cum | Son kez production deploy, domain ayarı (Vercel'in ücretsiz subdomain'i yeterli) |
| Haf | **Demo Günü** 🚀 |

**Hafta Sonu Hedefi:** Kozan canlı, sunuma hazır, herkese gösterilecek.

---

## 📊 Özet

| Hafta | Tema | Ana Çıktı |
| :--- | :--- | :--- |
| 1 | Teknoloji Araştırması | Tüm araçlar yerel çalışıyor |
| 2 | Altyapı Kurulumu | Deploy pipeline + DB şeması |
| 3 | Auth & Kullanıcılar | JWT, RBAC, XP sistemi |
| 4 | Odalar & Q&A Backend | REST API tamamı |
| 5 | Realtime | Socket.io + Redis presence |
| 6 | Kişisel Oda & Notlar | Spotify + Tiptap + Pomodoro |
| 7 | Video (Agora) | Çoklu kamera + kayıt |
| 8 | Ödeme | Stripe + Signed URL + Eğitmen |
| 9 | Frontend | UI tamamlandı |
| 10 | Test & Polish | Kararlı, hatasız |
| 11 | Sunum | Demo günü 🎓 |
