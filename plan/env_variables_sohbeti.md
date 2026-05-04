# Claude'un İhtiyaç Duyacağı .env (Ortam Değişkenleri) Listesi

Projeyi ayağa kaldırırken Claude'un kesinlikle senden isteyeceği ve kodun içerisine (veya `.env` dosyasına) eklenecek olan API anahtarları şunlardır. Projeye başlamadan önce bu anahtarları hazır etmen çok önemlidir.

---

### 1. Supabase (Veritabanı, Auth ve Dosya Depolama)
Supabase, projemizin kalbidir. NestJS backend'i Prisma ORM kullanarak buraya bağlanacak.

*   **Claude'un İsteyeceği Değişkenler:**
    *   `DATABASE_URL`: Prisma'nın veritabanına bağlanması için gereken asıl link (Connection Pooling).
    *   `DIRECT_URL`: Prisma'nın veritabanı şemalarını güncellemesi (migration) için gereken direkt link.
    *   `SUPABASE_URL`: Projene ait özel REST API adresi.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Backend'in tüm yetkilere sahip olması için gereken gizli anahtar (Bu asla mobile verilmez, sadece NestJS'te kalır).
    *   `SUPABASE_ANON_KEY`: İstemci (mobil) tarafı için genel erişim anahtarı.

*   **Nereden Alınır?**
    *   Supabase paneline (supabase.com) gir ve projeni oluştur.
    *   Sol menüden **Project Settings (Dişli İkonu) -> API** sekmesine gir. `URL`, `anon` ve `service_role` key'lerini oradan kopyala.
    *   **Project Settings -> Database** sekmesine girip biraz aşağı kaydırdığında Prisma için `DATABASE_URL` ve `DIRECT_URL` bağlantı adreslerini (Connection String) bulacaksın.

---

### 2. Agora SDK (Canlı Yayın, Görüntülü ve Sesli Odalar)
Sınıfların, odaların ve ekran paylaşımlarının yapılacağı altyapımız. 

*   **Claude'un İsteyeceği Değişkenler:**
    *   `AGORA_APP_ID`: Agora projenin genel kimliği. (Mobil uygulamaya da verilecek)
    *   `AGORA_APP_CERTIFICATE`: Odaya girişlerde güvenlik token'ı (RTC Token) üretmek için gereken gizli anahtar. (Sadece NestJS backend'inde kalacak, asla mobile verilmeyecek).

*   **Nereden Alınır?**
    *   Agora paneline (console.agora.io) giriş yap.
    *   **Project Management** sekmesine tıkla ve yeni bir proje oluştur (Güvenlik için "App ID + App Certificate + Token" seçeneğini seçmeyi unutma).
    *   Proje listesindeki uygulamanın yanındaki **Edit/Config** butonuna bas. `App ID` ve `App Certificate` karşına çıkacak.

---

### 3. NestJS Backend Temel Ayarları
Backend'in kendi içinde çalışması için gereken temel tanımlamalar.

*   **Claude'un İsteyeceği Değişkenler:**
    *   `PORT`: Backend'in çalışacağı port (Örn: `3000` veya `8080`).
    *   `NODE_ENV`: Projenin hangi ortamda çalıştığını belirtir (`development` veya `production`).

---

### 4. JWT & Güvenlik (Opsiyonel / İhtiyaç Halinde)
Eğer Supabase'in kendi Auth sistemi dışında backend'de özel bir kimlik doğrulama işlemi (örneğin odalara giriş yetkilendirmesi) yapacaksak Claude senden bir JWT sırrı isteyebilir.

*   **Claude'un İsteyeceği Değişkenler:**
    *   `JWT_SECRET`: Güvenlik token'larını şifrelemek için rastgele oluşturulmuş uzun bir metin. (Örn: `benim_cok_gizli_sifrem_12345`)

---

### Özet: Claude'a Verilecek Örnek `.env` Dosyası Formatı
Yukarıdaki bilgileri topladığında, projeye başlarken Claude'a verebileceğin (veya backend dizinine oluşturacağın) dosya şu formatta olacak:

```env
# APP SERVER
PORT=3000
NODE_ENV=development

# SUPABASE & PRISMA
DATABASE_URL="postgres://postgres.xxx:sifre@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.xxx:sifre@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJh..."
SUPABASE_SERVICE_ROLE_KEY="eyJh..."

# AGORA
AGORA_APP_ID="1234567890abcdef"
AGORA_APP_CERTIFICATE="abcdef1234567890"

# JWT
JWT_SECRET="kozan_super_secret_key_2026"
```

Bu anahtarları aldıktan sonra her şey hazır demektir. Projeyi modül modül yaparken Claude "Bana bağlantı ayarlarını ver" dediğinde direkt bu listeyi veya dosyayı ona verebilirsin.