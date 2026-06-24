# Ekran Paylaşımında Referans Görsel Arama (Denetim Modülü) Çözüm Rehberi

Bu rehber, kamerayla çekilmiş veya yüklenmiş bir referans görselinin (örn. kitap, defter, telefon ekranı veya belirli bir nesne) paylaşılan ekran görüntüsü içinde bulunup bulunmadığını doğrularken karşılaştığınız sorunların nedenlerini ve kesin çözüm yollarını açıklamaktadır.

---

## 1. Klasik Yöntemler Neden Çuvalladı? (NCC, ORB, dHash, CLIP)

Saatlerdir bu algoritmalara takılıp kalmanız son derece normal, çünkü bilgisayarlı görü (computer vision) literatüründe bu problem **"Cluttered Scene Sub-image Localization" (Karmaşık Sahnede Alt Görsel Arama)** olarak bilinir ve klasik yöntemlerle çözülmesi en zor problemlerden biridir.

### A. Template Matching ve NCC (Normalized Cross-Correlation)
*   **Nasıl Çalışır:** Referans resmi piksel piksel kaydırarak ekran görüntüsü üzerinde arar.
*   **Neden Başarısız Oldu:** 
    *   **Geometri Duyarlılığı:** NCC en ufak bir ölçek (scale) farkında veya birkaç derecelik dönmede (rotation) doğrudan başarısız olur.
    *   **Çözünürlük ve Açı Farkları:** Kullanıcının referans olarak yüklediği görsel muhtemelen kamerayla çekilmiş, perspektif bükülmesi olan, ışığı farklı bir görseldir. Ekran görüntüsü ise dijital, pikselleri düzgün ve yüksek çözünürlüklüdür. NCC bu iki farklı dünyayı asla eşleştiremez.

### B. ORB (FAST corners + BRIEF descriptors)
*   **Nasıl Çalışır:** Görseldeki keskin köşeleri bulur (FAST) ve bu köşelerin etrafındaki dokuyu 256 bitlik ikili dizilere çevirip (BRIEF) eşleştirir.
*   **Neden Başarısız Oldu:**
    *   **Ekran Karmaşası (Clutter):** Bir bilgisayar ekranında (özellikle kod editörü, tarayıcı veya masaüstü) binlerce yazı karakteri, pencere kenarı ve ikon vardır. Bunların hepsi mükemmel ve keskin "köşeler" üretir.
    *   **Gürültü Baskınlığı:** Algoritma, ekran görüntüsündeki yazıların ürettiği binlerce köşe arasında boğulur. Referans görseldeki kitap veya nesnenin ürettiği yumuşak köşeler, ekran görüntüsündeki keskin yazı köşeleriyle yanlış eşleşir (False Positives).
    *   **Homografi (RANSAC) Eksikliği:** ORB eşleştirmesinde benzerlik oranı hesaplanırken sadece en yakın Hamming mesafesine bakılırsa sonuç tamamen rastgele olur. Matematiksel olarak nesneyi bulmak için OpenCV'deki `findHomography` (RANSAC) ile düzlem tespiti yapılması gerekir. Bu da tarayıcıda/Node.js'te OpenCV.js gibi devasa ve kurulumu zor kütüphaneler gerektirir.

### C. CLIP Global Embeddings (Sahneler Arası Benzerlik)
*   **Nasıl Çalışır:** Görselin tamamını alıp semantik (anlamsal) tek bir 512 boyutlu vektöre indirger.
*   **Neden Başarısız Oldu:**
    *   **Global Bakış Açısı:** CLIP, resmin tamamına bakar. Örneğin ekran görüntünüzün %90'ı VS Code editörüyse ve sağ köşede %10'luk alanda referans kitabınız görünüyorsa, CLIP bu resmi "kod yazan bir ekran" olarak sınıflandırır.
    *   **Lokalizasyon Yoksunluğu:** CLIP nesnelerin yerini bulamaz, sadece "bu resimde genel olarak ne var?" sorusuna yanıt verir. Bu yüzden inek fotoğrafı referansıyken YouTube ekranına yüksek benzerlik verebilir.

---

## 2. Modern ve Kesin Çözüm: Vision LLM (Gemini 2.5 Flash / GPT-4o-mini) API

Bu problemi bilgisayarlı görü algoritmalarıyla çözmeye çalışarak vakit kaybetmek yerine, görüntü anlama kapasitesi insan seviyesinde olan **Vision LLM (VLM)** modellerini kullanmalısınız.

### Neden En İyi Çözüm?
1.  **Semantik ve Görsel Zeka:** Model, referans resmindeki nesnenin ne olduğunu (örneğin "üzerinde Geometri yazan mavi kapaklı bir kitap") anlar ve ekran görüntüsünde bu nesneyi arar.
2.  **Açı ve Kalite Bağımsızlığı:** Referansın yamuk çekilmiş olması, ışığın kötü olması veya ekranın bir köşesinde küçük görünmesi modeli etkilemez.
3.  **Çok Düşük Maliyet ve Hız:** Gemini 2.5 Flash API son derece hızlıdır (1-1.5 saniye yanıt süresi) ve ücretsiz/çok ucuz bir fiyatlandırmaya sahiptir.

---

## 3. Adım Adım Entegrasyon Planı

Sistemi şu şekilde tasarlayacağız:
1.  Kullanıcı kalibrasyon aşamasında referans görseli yükler. Backend bunu veritabanına veya disk alanına kaydeder.
2.  Check-in anında ekran görüntüsü (screenshot) alınır ve backend'deki `/monitoring/check` endpoint'ine gönderilir.
3.  Backend, kayıtlı referans görselini ve yeni gelen ekran görüntüsünü alıp **Gemini API**'sine (veya OpenAI'a) gönderir.
4.  Modelle şu promptu sorarız: *"Görsel 1'deki nesne/materyal, Görsel 2'deki ekran görüntüsünde yer alıyor mu?"*
5.  Modelden JSON formatında (`{ passed: boolean, reasoning: string }`) cevap alırız ve sonucu frontend'e döneriz.

### Backend Kodu (NestJS + Gemini Entegrasyonu)

Öncelikle `@google/genai` veya resmi SDK paketini kurun:
```bash
cd backend
npm install @google/genai
```

Ardından `monitoring.service.ts` dosyanızı şu şekilde güncelleyebilirsiniz:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class MonitoringService {
  private ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    // API anahtarını .env dosyasından alıyoruz
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async calibrate(imageBuffer: Buffer, userId: string) {
    // Referans görseli veritabanına kaydediyoruz (Base64 veya buffer olarak)
    await this.prisma.monitoringRef.upsert({
      where: { userId },
      create: { 
        userId, 
        // Veritabanında bytea veya text alanı olduğunu varsayıyoruz
        refImage: imageBuffer 
      },
      update: { 
        refImage: imageBuffer 
      },
    });
    return { success: true };
  }

  async check(screenshotBuffer: Buffer, userId: string) {
    const ref = await this.prisma.monitoringRef.findUnique({ where: { userId } });
    if (!ref || !ref.refImage) {
      return { passed: true, reason: 'Kalibrasyon görseli bulunamadı.', calibrated: false };
    }

    try {
      // Her iki görseli de Gemini'nin anlayacağı part formatına çeviriyoruz
      const refPart = {
        inlineData: {
          data: Buffer.from(ref.refImage).toString('base64'),
          mimeType: 'image/jpeg',
        },
      };

      const screenshotPart = {
        inlineData: {
          data: screenshotBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      };

      // Gemini 2.5 Flash modelini çağırıyoruz
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          'Aşağıda iki görsel bulunmaktadır. Birinci görsel kullanıcının çalışacağını beyan ettiği referans materyalidir (kitap, defter, telefon veya belirli bir nesne). İkinci görsel ise kullanıcının paylaştığı anlık ekran görüntüsüdür.',
          refPart,
          screenshotPart,
          'Görev: Birinci görseldeki nesnenin (veya içeriğin) ikinci görseldeki ekran görüntüsü içinde bulunup bulunmadığını kontrol et. Ekran görüntüsünde bu nesne açık bir pencerede, tarayıcı sekmesinde veya arka planda kısmen de olsa görünüyor mu? Yanıtını sadece geçerli bir JSON objesi olarak ver. Başka hiçbir açıklama ekleme. JSON formatı: { "passed": boolean, "reason": "Kısa açıklama türkçe" }'
        ],
        config: {
          // JSON formatında çıktı vermesini garanti ediyoruz
          responseMimeType: 'application/json',
        }
      });

      const resultText = response.text || '{}';
      const result = JSON.parse(resultText);

      return {
        passed: result.passed === true,
        reason: result.reason || '',
        calibrated: true,
      };
    } catch (error) {
      console.error('Gemini verification error:', error);
      // Hata durumunda kullanıcıyı mağdur etmemek için fallback olarak geçebiliriz veya hata dönebiliriz
      return { passed: true, reason: 'AI doğrulama servisinde hata oluştu.', calibrated: true };
    }
  }
}
```

---

## 4. Claude için Hazır İstek (Prompt) Taslağı

Aşağıdaki metni kopyalayıp Claude oturumunuza göndererek projenizi bu modern yapıya tek seferde geçirebilirsiniz:

```text
Merhaba Claude,

Biz projemizdeki denetim modülünde (PC ekran denetimi) büyük bir sorun yaşıyoruz. Kullanıcının kalibrasyon aşamasında kamerayla veya dosya yüklemeyle sisteme tanıttığı bir "referans nesne/materyal" görseli var (örneğin bir ders kitabı, defter veya telefon). Çalışma esnasında aldığımız "ekran görüntüsü" (screenshot) içinde bu referans nesnenin yer alıp almadığını kontrol etmek istiyoruz.

Daha önce ORB keypoint matching, template matching (NCC) ve CLIP global embedding yöntemlerini denedik ancak hepsi başarısız oldu. ORB ekran üzerindeki yazıların ürettiği binlerce köşede kayboluyor ve yanlış eşleşme veriyor. CLIP ise ekran görüntüsünün bütününe odaklandığı için köşedeki küçük referans nesnesini göremiyor.

Bu yüzden sistemi Google Gemini 2.5 Flash (veya OpenAI GPT-4o-mini) Vision API kullanan modern bir yapıya geçirmek istiyoruz. Bu sayede backend tarafında iki görseli de AI modeline gönderip nesne tespiti yaptıracağız.

Senden ricam:
1. `backend/src/monitoring/monitoring.service.ts` dosyamızı güncelle. İçindeki ORB algoritmalarını tamamen kaldır. Yerine Google Gemini API (veya OpenAI API) kullanarak iki resmi karşılaştıran ve JSON formatında `{ passed: boolean, reason: string }` çıktısı alan bir NestJS servisi yaz.
2. API entegrasyonu için gerekli `.env` değişkenlerini ve paket kurulum talimatlarını belirt.
3. Veritabanındaki `monitoringRef` modelimizin kalibrasyon görselini tutabilmesi için Prisma schema ve migration adımlarını güncelle/oluştur.
4. Frontend tarafındaki `CheckInModal` veya ilgili API isteklerinde bu yeni backend çıktısına göre arayüzü ("Geçti" / "Kaldı" ve gerekirse sebebini) güncelleyecek kodu yaz.

Lütfen bana temiz, modüler ve hata yönetimli bir kod tabanı sun.
```

## Özet Öneri

Hiç vakit kaybetmeden projenize bir **Multimodal LLM** API'si entegre edin. Klasik computer vision algoritmaları bu kadar heterojen (biri kamera çekimi, biri dijital ekran) iki görseli eşleştirmede maalesef çok yetersiz kalmaktadır. 2026 yılı standartlarında bu işi en kararlı, en esnek ve en hızlı yapan yöntem kesinlikle VLM (Vision Large Language Model) kullanmaktır.
