import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const MATCHER_URL = process.env.MATCHER_URL ?? 'http://localhost:8001';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async calibrate(imageBuffer: Buffer, userId: string) {
    const bytes = new Uint8Array(imageBuffer);
    await this.prisma.monitoringRef.upsert({
      where: { userId },
      create: { userId, refImage: bytes },
      update: { refImage: bytes },
    });
    return { success: true };
  }

  async check(screenshotBuffer: Buffer, userId: string) {
    const ref = await this.prisma.monitoringRef.findUnique({ where: { userId } });
    if (!ref) return { passed: true, similarity: 0, calibrated: false };

    // DEBUG LOG — sil sonra
    const debugDir = path.join(process.cwd(), 'debug-captures');
    fs.mkdirSync(debugDir, { recursive: true });
    const ts = Date.now();
    fs.writeFileSync(path.join(debugDir, `screen_${ts}.jpg`), screenshotBuffer);
    fs.writeFileSync(path.join(debugDir, `ref_${ts}.jpg`), Buffer.from(ref.refImage));
    console.log(`[DEBUG] screen: ${screenshotBuffer.length} bytes | ref: ${ref.refImage.length} bytes`);

    const form = new FormData();
    form.append('ref', new Blob([Buffer.from(ref.refImage)]), 'ref.jpg');
    form.append('screenshot', new Blob([Buffer.from(screenshotBuffer)]), 'screen.jpg');

    let res: Response;
    try {
      res = await fetch(`${MATCHER_URL}/match`, { method: 'POST', body: form });
    } catch {
      throw new ServiceUnavailableException('Görsel eşleştirme servisi çalışmıyor.');
    }

    if (!res.ok) {
      const err = await res.text();
      throw new ServiceUnavailableException(`Matcher hatası: ${err}`);
    }

    const data = await res.json() as { passed: boolean; score: number; inliers: number; num_matches: number; num_ref_kps: number; num_screen_kps: number };
    console.log(`[DEBUG] inliers=${data.inliers} matches=${data.num_matches} screen_kps=${data.num_screen_kps} passed=${data.passed}`);
    return { passed: data.passed, similarity: data.score, calibrated: true };
  }

  async getStatus(userId: string) {
    const ref = await this.prisma.monitoringRef.findUnique({ where: { userId } });
    return { calibrated: !!ref, updatedAt: ref?.updatedAt ?? null };
  }

  async deleteCalibration(userId: string) {
    const ref = await this.prisma.monitoringRef.findUnique({ where: { userId } });
    if (!ref) throw new NotFoundException('Kalibrasyon verisi bulunamadı.');
    await this.prisma.monitoringRef.delete({ where: { userId } });
    return { success: true };
  }
}
