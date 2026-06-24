# koZan Backend — Üçüncül Dosyalar (Destekleyici Kod)

Bu dosyadaki kodlar uygulamanın çalışması için gereklidir, ama anlaması daha önemli olan iş mantığından (features) ayrıdır. Her biri için aynı üç bakış açısı uygulanmıştır.

---

## DOSYA 1 — `src/main.ts` (Uygulama Başlatıcı)

```typescript
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
  // Swagger setup...
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### (a) Basit Anlatım
Bir fabrikayı açmak gibi. Ana makineyi (AppModule) başlatırsın, güvenlik görevlilerini (ValidationPipe, CORS), tabelaları (Swagger) ve kapıları (port 3000) hazırlarsın. Sonra "fabrika açık" diye ilan edersin.

### (b) Teknik Analiz

- **`NestExpressApplication`:** Express adaptörünü kullanmak için gerekli tip. `useStaticAssets()` Express'e özgü bir metod — NestJS'in soyut `INestApplication`'ında yoktur. Bu yüzden `NestFactory.create<NestExpressApplication>(...)` generic tip gerektirir
- **`useStaticAssets(dir, { prefix: '/uploads' })`:** Express'in `static` middleware'i — `fs.readFile` + HTTP response. Her resim isteğinde Node.js dosyayı okur ve gönderir. CDN olmadan ölçeklenemez
- **`ValidationPipe({ whitelist: true, forbidNonWhitelisted: false })`:**
  - `whitelist: true` → DTO'da tanımlanmamış alanlar JSON'dan otomatik silinir (güvenlik)
  - `forbidNonWhitelisted: false` → multipart/form-data'da bilinmeyen alanlar hata vermez (zorunlu — `FilesInterceptor` ile dosya alanları DTO'ya eklenmez)
- **`bootstrap()` IIFE değil:** Async fonksiyon tanımlanıp hemen çağrılır. Node.js'te top-level await desteği var (ES2022) ama NestJS convention'ı bu yapıyı tercih eder
- **Karmaşıklık:** O(1) başlatma; I/O bound (port bağlama)
- **Heap:** Express middleware stack'i heap'te tutulur; her middleware pointer listesidir

### (c) Tasarım Desenleri ve Eleştiri

**Facade Pattern:** `bootstrap()` tüm uygulama konfigürasyonunu tek bir fonksiyona sarmalar. Client (runtime) bu detayları bilmez.

**Eleştiri:**
- `enableCors()` her origin'e izin verir — geliştirme için kabul edilebilir, production'da `{ origin: ['https://kozan.app'] }` gibi whitelist gerekir
- `uploadsDir` oluşturma mantığı main.ts'te (`fs.mkdirSync`) — bu bir side effect, bir servis/modüle taşınabilirdi
- Swagger production'da açık kalmamalı: `if (process.env.NODE_ENV !== 'production') SwaggerModule.setup(...)` koruması eklenmeli

---

## DOSYA 2 — `src/app.module.ts` (Kök Modül)

```typescript
@Module({
  imports: [...tüm modüller...],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

### (a) Basit Anlatım
Bir şirketin genel müdürlüğü — departmanları (modülleri) bir araya getirir. Kendi başına iş yapmaz; kim ne yapacak organize eder. `ThrottlerGuard` her kapıya konulan güvenlik görevlisidir — dakikada 30'dan fazla istek gelen birine dur der.

### (b) Teknik Analiz

- **`APP_GUARD` token:** NestJS DI container özel token — bu guard tüm controller'lara otomatik uygulanır. Alternatif: her controller'a `@UseGuards(ThrottlerGuard)` eklemek — ama unutma riski var
- **`ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])`:** Sliding window algoritması; `ttl` milisaniye penceresi, `limit` maksimum istek. Aşılırsa 429 Too Many Requests. Veriler Redis'te değil in-memory'de tutulur (varsayılan) — multi-instance deployment'ta paylaşılamaz
- **`ConfigModule.forRoot({ isGlobal: true })`:** `.env` dosyasını yükler, `process.env`'i doldurur. `isGlobal: true` → `ConfigService` her modüle import etmeden enjekte edilebilir
- **Module registry:** NestJS DI container singleton scope — her modül bir kez instantiate edilir, paylaşılır

### (c) Tasarım Desenleri ve Eleştiri

**Composition Root Pattern:** Bütün bağımlılıklar bu tek noktada compose edilir. DI container buradan yönetilir.

**Eleştiri:**
- `ThrottlerGuard` in-memory çalışıyor — 2 Node.js instance'ta her biri 30 istek sayar, gerçekte 60 istek geçebilir. `@nestjs/throttler` Redis store ile yapılandırılabilir: `ThrottlerStorageRedisService`
- `MailModule` doğrudan `AppModule`'a import edilmemiş — `AuthModule` üzerinden dolaylı geliyor. Açık bağımlılıklar okunabilirlik açısından daha iyi olurdu

---

## DOSYA 3 — `src/prisma/prisma.service.ts` (DB Bağlantısı)

```typescript
@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### (a) Basit Anlatım
Veritabanına tek bir bağlantı köprüsü. NestJS modülü başladığında köprüyü açar, kapandığında kapatır. `PrismaClient`'ı miras alır — yani `this.prisma.user.findMany()` gibi tüm Prisma metodları bu sınıftan kullanılabilir.

### (b) Teknik Analiz

- **`extends PrismaClient`:** Kalıtım yoluyla PrismaClient'ın tüm metodları `PrismaService`'e taşınır. Her inject edilen yerde `this.prisma.X` çağrısı aslında `PrismaClient.X`'i çağırır
- **`PrismaPg` adapter:** pgbouncer ile uyumluluk için gerekli. `DATABASE_URL`'de `?pgbouncer=true` varken raw `pg` pool yerine bu adapter kullanılır. Prepared statements devre dışı bırakılır (pgbouncer transaction mode)
- **`OnModuleInit/OnModuleDestroy`:** NestJS lifecycle hooks — modül başlatıldığında `onModuleInit` çağrılır, `$connect()` TCP bağlantısını açar. `onModuleDestroy` graceful shutdown'da `$disconnect()` çağırır, tüm aktif sorgular bitmeden bağlantı kesilmez
- **`@Global()`:** PrismaModule global olarak işaretlenmiş → PrismaService tüm modüllere otomatik available. Her modüle `PrismaModule` import etmek gerekmez
- **Singleton scope:** NestJS DI varsayılanı — tüm uygulama boyunca tek `PrismaService` instance. Bağlantı havuzu da tek — `pg.Pool` iç implementasyonu connection pooling yapar

### (c) Tasarım Desenleri ve Eleştiri

**Singleton + Service Locator:** Tek instance, DI container üzerinden erişim.

**Decorator + Inheritance birlikte:** `@Injectable()` (NestJS metadata dekoratörü) + `extends PrismaClient` (OOP kalıtım). Nadiren görülen bir kombinasyon.

**Eleştiri:**
- `process.env.DATABASE_URL` constructor'da doğrudan — `ConfigService` yerine. NestJS'in `forwardRef` bağımlılık döngüsü sorunlarından kaçınmak için yapılmış; kabul edilebilir
- Prisma `$on('query', ...)` ile sorgu loglama eklenebilirdi: `super({ adapter, log: ['query', 'error'] })`

---

## DOSYA 4 — `src/auth/strategies/jwt.strategy.ts` (JWT Doğrulama Stratejisi)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService, config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }
  async validate(payload: { sub: string; email: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

### (a) Basit Anlatım
Her isteğin Authorization başlığındaki JWT anahtarını alır, gerçek mi diye kontrol eder. Gerçekse "tamam bu kişi Kim Bey" diyerek request'e kullanıcı bilgisini ekler. Sahte veya süresi dolmuşsa "girme" der.

### (b) Teknik Analiz

- **`ExtractJwt.fromAuthHeaderAsBearerToken()`:** `Authorization: Bearer TOKEN` header'ından token çıkarır. Regex tabanlı basit string split
- **`super({ secretOrKey })`:** Passport-JWT library JWT imzasını HMAC-SHA256 ile doğrular. Header+Payload'ı secret ile hash'ler, signature ile karşılaştırır. O(1) — sabit büyüklük
- **`validate(payload)`:** Her korumalı endpoint için DB çağrısı — `UsersService.findById(payload.sub)`. Bu DB çağrısı request başına maliyetlidir. Avantaj: kullanıcı silinirse veya banlanırsa hemen etkili. Dezavantaj: her istek bir DB roundtrip
- **`request.user = validate()` dönüşü:** Passport middleware `validate()`'in döndürdüğü değeri `request.user`'a atar. `@CurrentUser()` dekoratörü bunu okur

**Karmaşıklık:**
- JWT verify: O(1) — sabit boyut imza kontrolü
- DB lookup: O(1) — primary key ile index lookup

### (c) Tasarım Desenleri ve Eleştiri

**Strategy Pattern (gerçek anlamda):** Passport.js strateji sistemi — `JwtStrategy`, `LocalStrategy`, `GoogleStrategy` vb. hepsi aynı `validate()` interface'ini uygular; `AuthGuard` hangisi kullanılacağını bilir.

**Template Method:** `PassportStrategy(Strategy)` abstract sınıf; `super()` konfigürasyonu; `validate()` override — kullanıcı sadece `validate()`'i implement eder, geri kalanı framework halleder.

**Eleştiri:**
- Her istek bir DB sorgusu — Redis cache ile: `const user = await redis.get(userId) || await db.findById(userId)` → cache hit O(1), miss O(1) DB; 5 dakika TTL yeterli
- `validate()` şu an aktif session/ban kontrolü yapmıyor — kullanıcı banlanınca o anki JWT hâlâ 15 dakika geçerli

---

## DOSYA 5 — `src/auth/guards/jwt-auth.guard.ts` ve `jwt-optional-auth.guard.ts`

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// jwt-optional-auth.guard.ts
@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any): any {
    return user ?? null;
  }
}
```

### (a) Basit Anlatım
`JwtAuthGuard`: Kapıdaki güvenlik görevlisi — kartın yoksa içeri almaz.
`JwtOptionalAuthGuard`: Kibar görevli — kartın yoksa içeri alır ama "anonim" olarak işaretler. Token varsa kim olduğunu bilir.

### (b) Teknik Analiz

- **`AuthGuard('jwt')`:** Passport'u `jwt` stratejisiyle çalıştırır. Hata durumunda varsayılan `handleRequest` `UnauthorizedException` fırlatır
- **`handleRequest` override:** `_err` (Passport hatası) veya falsy `user` → varsayılan davranış hata fırlatır. Override ile `null` döndürülür — guard geçilir ama `request.user = null`
- **`_err` prefix underscore:** TypeScript'te "kullanılmayan parametre" uyarısını bastırır. Parametre varlığı imza uyumluluğu için gerekli

**Guard lifecycle:**
1. `canActivate()` çağrılır (parent sınıftan)
2. Passport JWT stratejisi çalıştırılır
3. `validate()` sonucu `handleRequest(err, user, info)` parametrelerine geçilir
4. `handleRequest` dönüş değeri `request.user`'a atanır

### (c) Tasarım Desenleri ve Eleştiri

**Template Method + Inheritance:** `AuthGuard` şablonu sağlar, alt sınıf sadece `handleRequest`'i override eder.

**Eleştiri:** `JwtOptionalAuthGuard`'da `user: any` tip tanımı zayıf — `User | null` veya `User | false` daha güvenli. NestJS'in `AuthGuard` generic parametresi bunu zorlaştırıyor.

---

## DOSYA 6 — `src/auth/decorators/current-user.decorator.ts`

```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### (a) Basit Anlatım
`@CurrentUser()` bir kısayol etiket — controller metoduna "şu an giriş yapmış kullanıcıyı ver" diyorsun. Arka planda gelen isteğin içinden kullanıcı bilgisini çıkarır. Olmadan `@Req() req: Request` yazıp `req.user` demen gerekirdi — her seferinde.

### (b) Teknik Analiz

- **`createParamDecorator`:** NestJS factory fonksiyonu — parametre dekoratörü üretir. Reflect Metadata API kullanarak parametre index'i ve dekoratör datasını kaydeder
- **`ExecutionContext`:** HTTP, WebSocket, RPC gibi farklı protokolleri soyutlar. `switchToHttp()` HTTP adaptörüne özgü request/response'a erişim sağlar
- **`_data: unknown`:** `@CurrentUser('id')` gibi parametre geçilirse `_data = 'id'` olur. Şu an kullanılmıyor — gelecekte `@CurrentUser('name')` gibi field seçimi eklenebilir
- **Bellek:** Closure değil; her çağrıda `ctx.switchToHttp().getRequest().user` referansı — GC açısından temiz
- **Karmaşıklık:** O(1) — sadece object property access

### (c) Tasarım Desenleri ve Eleştiri

**DRY + Aspect-Oriented Programming:** Cross-cutting concern (kullanıcı çıkartma) tek yerde tanımlanmış. `@CurrentUser()` 10 farklı controller'da kullanılıyor, değişiklik sadece bir yerde.

**Eleştiri:** Field selection eklenmemiş — `@CurrentUser('id')` diye kullanılsa sadece `id` döndürebilirdi. Şu an `User` nesnesinin tamamı her controller metoduna geçirilir (password hash dahil, ama controller'lar dikkatli davranıyor).

---

## DOSYA 7 — `src/auth/services/email-validator.service.ts` (E-posta Doğrulayıcı)

```typescript
async validate(email: string): Promise<void> {
  const apiKey = this.config.get<string>('ABSTRACT_API_KEY');
  if (apiKey) { await this.validateWithReputationApi(email, apiKey); }
  else { await this.validateWithFallback(email); }
}
```

### (a) Basit Anlatım
"Bu email gerçek mi?" sorusunu cevaplar. Önce bir dış servise sorar (Abstract API). Servis çalışmıyorsa kendi kontrol eder: bu domain geçici email servisi mi? Bu domain'e mail gönderebilir miyiz? (DNS MX kaydı kontrolü)

### (b) Teknik Analiz

**Üç katman doğrulama:**
1. **Abstract API:** HTTP call → `emailreputation.abstractapi.com` → Skoru değerlendir (deliverable, disposable, mx_valid, risk)
2. **Disposable domain listesi:** `disposable-email-domains` npm paketi — bellekte ~50KB string array. `Array.includes()` O(n) n≈8000 domain. Daha hızlı için `Set` kullanılabilirdi: O(1) lookup
3. **DNS MX sorgusu:** `dns.resolveMx(domain)` — OS DNS resolver'ına UDP query; cevap cache'lenir (TTL'e bağlı)

**Karmaşıklık:**
- Abstract API: O(1) local + network round-trip (50-200ms)
- Disposable check: O(n) n=liste boyutu (sabit ~8000) → pratikte O(1)
- DNS MX: O(1) + network (5-100ms, cache'li)

**Error handling:** API hatası → warning log → fallback. Uygulama kullanıcıya API hatasını yansıtmaz — graceful degradation.

### (c) Tasarım Desenleri ve Eleştiri

**Chain of Responsibility:** API → fallback. Birincisi başarısız → ikincisi devreye girer. **Strategy Pattern (runtime seçim):** API key varsa bir strateji, yoksa başka strateji.

**Eleştiri:**
- `Array.includes()` yerine `Set` kullanılmalı: `new Set(require('disposable-email-domains'))` → O(1) lookup, startup'ta bir kez kurulur
- Abstract API her kayıt denemesinde çağrılıyor — API key harcıyor. Başarılı geçen domain'leri Redis/in-memory LRU cache'e almak harcamayı düşürür (aynı domain tekrar kaydolursa)
- Doğrulama kayıt sırasında senkronize olarak yapılıyor — Abstract API yavaşsa kayıt yavaşlar. Queue'ya alınabilirdi (user oluşturulur, async doğrulama yapılır)

---

## DOSYA 8 — DTO'lar (Data Transfer Objects)

**Dahil dosyalar:** `register.dto.ts`, `login.dto.ts`, `verify-email.dto.ts`, `refresh.dto.ts`, `create-question.dto.ts`, `notes.dto.ts`, `create-room.dto.ts`

**Örnek — RegisterDto:**
```typescript
export class RegisterDto {
  @IsEmail()                email: string;
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#...])/)
  password: string;
}
```

### (a) Basit Anlatım
Formların kurallar listesi. "Email geçerli olmalı", "şifre 8+ karakter, büyük harf, rakam, özel karakter içermeli" gibi kuralları burada tanımlarız. `ValidationPipe` bu kuralları otomatik kontrol eder.

### (b) Teknik Analiz

- **`class-validator`:** Dekoratörler `Reflect.defineMetadata` ile sınıfa metadata olarak kaydedilir. `ValidationPipe` çalıştığında `validate(dto)` fonksiyonu bu metadata'yı okur ve her alan için ilgili validator'ı çalıştırır
- **`class-transformer`:** `@Transform()` dekoratörü — `plainToClass()` ile JSON → class instance dönüşümü sırasında çalışır. `value?.trim()` → leading/trailing whitespace temizler
- **Regex password:** `(?=.*[A-Z])` lookahead → en az bir büyük harf. `(?=.*\d)` → rakam. `(?=.*[!@#...])` → özel karakter. Tüm lookaheadler O(n) n=şifre uzunluğu
- **`@IsUUID('4')`:** `questionId`, `roomId` vb. alanlarda UUID v4 formatı zorunlu — geçersiz ID ile DB sorgusu yapılmaz (erken hata)
- **`AutosaveNoteDto.content?: unknown`:** Tiptap JSON herhangi bir yapıda olabilir — `unknown` tip güvenli "serbest JSON" yolu. Servis katmanında `as Prisma.InputJsonValue` cast gerektirir

**Karmaşıklık:** Validasyon O(n×m) n=alan sayısı, m=alan değeri uzunluğu; pratikte O(1) sabit boyutlu inputlar için.

### (c) Tasarım Desenleri ve Eleştiri

**Value Object Pattern:** DTO nesneleri sadece veri taşır, davranış yoktur. İmmutable değil ama tasarım amacı bu.

**Eleştiri:**
- `create-room.dto.ts` (CreateRoomDto) artık kullanılmıyor — `POST /rooms` endpoint'i kaldırıldı. Temizlenmeli
- Password regex özel karakter listesi `@$!%*?&` ile sınırlı — bazı geçerli karakterler (`<`, `>`, `{}`) dışarıda kaldı
- `@ApiProperty()` dekoratörü çoğu DTO'ya eklenmemiş — Swagger dokümantasyonu eksik. Sadece `RefreshDto`'da var

---

## DOSYA 9 — `src/app.controller.ts` + `src/app.service.ts` (NestJS Scaffold Kalıntısı)

```typescript
// app.controller.ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string { return this.appService.getHello(); }
}

// app.service.ts
@Injectable()
export class AppService {
  getHello(): string { return 'Hello World!'; }
}
```

### (a) Basit Anlatım
`nest new` komutu ile proje oluşturulduğunda NestJS otomatik olarak bu iki dosyayı oluşturur. `GET /` adresine gidince "Hello World!" döner. Gerçek bir işlevi yok — sil veya health check endpoint'ine dönüştür.

### (b) Teknik Analiz

Bu iki dosya `AppModule`'da import edilmiş ancak özellik eklemesi yapılmamış. `getHello()` stack üzerinde: controller → service → string literal döndür → JSON serialize → HTTP response. En basit olası çağrı zinciri. Karmaşıklık O(1), heap allocation sıfır (string literal).

**Not:** `app.controller.spec.ts` — bu dosya ile birlikte oluşturulan tek test dosyası. Gerçek test değil; scaffold örneği.

### (c) Tasarım Desenleri ve Eleştiri

**Eleştiri:** Silinmeli ya da dönüştürülmeli:
```typescript
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```
Load balancer ve monitoring sistemleri `/health` endpoint'ini kullanır.

---

## DOSYA 10 — `src/agora/agora.service.ts` (RTC Token Üretici)

```typescript
generateRtcToken(roomId: string, userId: string) {
  const channelName = roomId;
  const uid = this.uuidToUid(userId);
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
  const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, RtcRole.PUBLISHER, expireTime);
  return { token, uid, channelName };
}

private uuidToUid(uuid: string): number {
  return parseInt(uuid.replace(/-/g, '').slice(0, 8), 16) >>> 0;
}
```

### (a) Basit Anlatım
Video görüşmesi için özel bir giriş bileti oluşturan bilet ofisi. Her kullanıcı + oda kombinasyonu için 1 saatlik bilet keser. Agora sunucusuna bu biletle bağlanırsın.

### (b) Teknik Analiz

- **Token oluşturma:** `RtcTokenBuilder.buildTokenWithUid()` HMAC-SHA256 ile imzalanmış token. Agora kendi sunucularında bu imzayı doğrular — backend imzalama anahtarı (`appCertificate`) asla istemciye gönderilmez
- **`uuidToUid()`:** UUID (`550e8400-e29b-41d4-a716-446655440000`) → dashes kaldır → `550e8400e29b41d4a716446655440000` → ilk 8 karakter → `550e8400` → `parseInt('550e8400', 16)` = `1427062784` → `>>> 0` unsigned
  - `>>> 0` amacı: JavaScript'te `parseInt(hex, 16)` 32-bit'i aşarsa negatif sayı döner. `>>> 0` unsigned right shift ile 32-bit unsigned'a zorlar
- **Çarpışma:** İlk 8 hex karakter = 32-bit → 4.294.967.296 olasılık. UUID v4 rastgele — doğum günü paradoksu hesabı: `1 - e^(-n^2/2p)` ile ~65.000 kullanıcıda %50 çarpışma olasılığı. Büyük ölçekte problem
- **expireTime:** Unix timestamp saniye cinsinden `+ 3600` = 1 saat geçerlilik

### (c) Tasarım Desenleri ve Eleştiri

**Builder Pattern (dış kütüphane):** `RtcTokenBuilder` harici `agora-access-token` paketinden — zincir çağrılı token oluşturma.

**Eleştiri:**
- UUID→uint32 hash kayıplı — `User.agoraUid Int @default(autoincrement())` eklenmesi gerekir. Küçük ölçekte OK
- Token 1 saat geçerli ama backend `expireTime`'ı kontrol etmiyor — 1 saatten sonra token hâlâ döndürülüyor (Agora redder). Endpoint'e `validUntil` eklenebilir
- `AgoraService` `RoomsModule`'e bağlı ama bağımsız bir domain (video) — `AgoraModule` ayrı tutulabilirdi

---

## DOSYA 11 — `prisma/seed.ts` (Topluluk Odaları Seed'i)

```typescript
const communities = ['YKS', 'KPSS', 'ALES', 'DGS'];
for (const title of communities) {
  const existing = await prisma.room.findFirst({ where: { title, type: 'COMMUNITY' } });
  if (!existing) {
    await prisma.room.create({ data: { title, type: 'COMMUNITY' } });
  }
}
```

### (a) Basit Anlatım
Uygulama ilk kurulduğunda veya migration sonrasında çalıştırılan hazırlık scripti. "YKS odası var mı? Yoksa oluştur" — idempotent. İstediğin kadar çalıştır, sonuç aynı.

### (b) Teknik Analiz

- **Idempotency:** `findFirst` → yoksa `create`. Bu "upsert" ile de yapılabilirdi: `prisma.room.upsert({ where: { title_type: ... }, create: ..., update: {} })` — fakat `title+type` unique constraint olmadığı için composite upsert key tanımlanamıyor
- **`PrismaPg` adapter direkt:** Seed script NestJS dışında çalışır — DI container yok. `PrismaService` kullanılamaz. Doğrudan adapter ile `PrismaClient` örneği kurulur
- **`ts-node --transpile-only`:** TypeScript'i JS'e dönüştürür ama tip kontrolü yapmaz — hız için

### (c) Tasarım Desenleri ve Eleştiri

**Idempotent Operation Pattern:** Birden fazla çalıştırılabilir; duplicate oluşturmaz; side effect free (var olan datayı değiştirmez).

**Eleştiri:**
- Döngü sıralı: bir oda oluşturulurken diğeri bekler. `Promise.all()` ile paralel yapılabilirdi. Küçük seed için fark minimal
- COMMUNITY oda title'ları sabit kodlanmış — admin panelinden yönetilebilir olmalı

---

## ÖZET — Üçüncül Dosyaların Önemi

| Dosya | Önemi | Neden "Üçüncül"? |
|---|---|---|
| `main.ts` | Kritik (uygulama başlar) | Kod miktarı az, değişmez |
| `app.module.ts` | Yüksek (tüm bağlantılar) | Konfigürasyon, logic yok |
| `prisma.service.ts` | Kritik (tüm DB) | 15 satır, değişmez |
| `jwt.strategy.ts` | Yüksek (auth backbone) | NestJS convention, boilerplate |
| Guards | Yüksek | Wrapper sınıflar, minimal kod |
| `current-user.decorator.ts` | Orta | 5 satır, bir kez yazılır |
| `email-validator.service.ts` | Orta | Yardımcı; auth flow'da |
| DTO dosyaları | Orta | Şema tanımı, logic yok |
| `app.controller/service` | Düşük | Scaffold kalıntısı |
| `agora.service.ts` | Orta | Küçük, bağımsız domain |
| `seed.ts` | Düşük (geliştirme) | Bir kez çalışır |

**"Üçüncül" derken** — bu dosyalar hatasız çalışmaları için gerekli, ama iş mantığını onlar değil özellik dosyaları (`2-ozellikler.md`) taşır. Bir mühendis sorarsa "bunu neden yaptın?" diye, cevap bu dosyalar için "NestJS convention" veya "framework gerekliliği"dir. Asıl sorular `auth.service.ts`, `xp.service.ts`, `rooms.gateway.ts` gibi dosyalar için sorulur.
