import 'dotenv/config';
import { PrismaClient, RoomType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const COMMUNITY_ROOMS = [
  { title: 'YKS', description: 'Yükseköğretim Kurumları Sınavı' },
  { title: 'KPSS', description: 'Kamu Personeli Seçme Sınavı' },
  { title: 'ALES', description: 'Akademik Lisansüstü Eğitim Sınavı' },
  { title: 'DGS', description: 'Dikey Geçiş Sınavı' },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter } as any);

  console.log('Seed başlıyor...');

  for (const room of COMMUNITY_ROOMS) {
    const existing = await prisma.room.findFirst({
      where: { title: room.title, type: RoomType.COMMUNITY },
    });

    if (existing) {
      console.log(`[ATLA] ${room.title} zaten mevcut.`);
    } else {
      await prisma.room.create({
        data: { title: room.title, type: RoomType.COMMUNITY },
      });
      console.log(`[OLUŞTURULDU] ${room.title} — ${room.description}`);
    }
  }

  await prisma.$disconnect();
  console.log('Seed tamamlandı.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
