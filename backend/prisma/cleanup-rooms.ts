import 'dotenv/config';
import { PrismaClient, RoomType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const KEEP_TITLES = ['YKS', 'KPSS', 'DGS', 'Calculus 1&2'];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter } as any);

  const allRooms = await prisma.room.findMany({ where: { type: RoomType.COMMUNITY } });
  console.log(`Toplam ${allRooms.length} topluluk odası bulundu.`);

  for (const room of allRooms) {
    if (!KEEP_TITLES.includes(room.title)) {
      await prisma.room.delete({ where: { id: room.id } });
      console.log(`[SİLİNDİ] ${room.title} (id: ${room.id})`);
    } else {
      console.log(`[KORUNDU] ${room.title}`);
    }
  }

  // Calculus 1&2'yi yoksa oluştur
  const calcExists = await prisma.room.findFirst({
    where: { title: 'Calculus 1&2', type: RoomType.COMMUNITY },
  });
  if (!calcExists) {
    await prisma.room.create({ data: { title: 'Calculus 1&2', type: RoomType.COMMUNITY } });
    console.log('[OLUŞTURULDU] Calculus 1&2');
  }

  await prisma.$disconnect();
  console.log('Temizlik tamamlandı.');
}

main().catch((e) => { console.error(e); process.exit(1); });
