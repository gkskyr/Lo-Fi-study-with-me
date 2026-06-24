import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from './redis.module';

export interface PresenceEntry {
  userId: string;
  name: string;
  joinedAt: string;
}

// Redis'te her oda için hash: presence:room:{roomId} → { userId: JSON }
// TTL yoktur; gateway join/leave/disconnect'te yönetir.

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async join(roomId: string, entry: PresenceEntry): Promise<void> {
    try {
      await this.redis.hset(
        `presence:room:${roomId}`,
        entry.userId,
        JSON.stringify(entry),
      );
    } catch {
      // Redis kullanılamıyorsa sessizce geç
    }
  }

  async leave(roomId: string, userId: string): Promise<void> {
    try {
      await this.redis.hdel(`presence:room:${roomId}`, userId);
    } catch {}
  }

  async getRoom(roomId: string): Promise<PresenceEntry[]> {
    try {
      const raw = await this.redis.hgetall(`presence:room:${roomId}`);
      if (!raw) return [];
      return Object.values(raw).map(v => JSON.parse(v) as PresenceEntry);
    } catch {
      return [];
    }
  }

  async leaveAll(userId: string, roomId?: string): Promise<void> {
    if (roomId) {
      await this.leave(roomId, userId);
      return;
    }
    // roomId bilinmiyorsa tüm odalardan çıkar (pahalı — sadece fallback)
    try {
      const keys = await this.redis.keys('presence:room:*');
      await Promise.all(keys.map(k => this.redis.hdel(k, userId)));
    } catch {}
  }
}
