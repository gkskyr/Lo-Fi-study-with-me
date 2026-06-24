import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { XpService, XpResult, XP_REWARDS } from '../xp/xp.service';

interface SocketMeta {
  userId?: string;
  username?: string;
  roomId?: string;
  joinedAt?: Date;
}

@WebSocketGateway({ cors: true })
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // socketId → meta
  private readonly sockets = new Map<string, SocketMeta>();
  // userId → Set<socketId>  (bir kullanıcı birden fazla sekmede açık olabilir)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly xpService: XpService,
  ) {}

  handleConnection(client: Socket) {
    const raw: string | undefined =
      client.handshake.auth?.token ?? client.handshake.headers?.authorization;
    const token = raw?.replace(/^Bearer\s+/i, '');
    let userId: string | undefined;

    let username: string | undefined;

    if (token) {
      try {
        const payload = this.jwtService.verify<{ sub: string; username: string }>(token);
        userId = payload.sub;
        username = payload.username;
      } catch {
        // geçersiz token — anonim bağlantı olarak devam et
      }
    }

    this.sockets.set(client.id, { userId, username });

    if (userId) {
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(client.id);
    }
  }

  handleDisconnect(client: Socket) {
    const meta = this.sockets.get(client.id);
    if (meta?.userId && meta.roomId && meta.joinedAt) {
      this.awardRoomTime(meta.userId, meta.joinedAt); // sessiz award, emit yok (client gitti)
      client.to(meta.roomId).emit('room:user:left', {
        userId: meta.userId,
        username: meta.username,
      });
    }

    if (meta?.userId) {
      const set = this.userSockets.get(meta.userId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) this.userSockets.delete(meta.userId);
      }
    }

    this.sockets.delete(client.id);
  }

  @SubscribeMessage('room:join')
  handleJoin(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    const meta = this.sockets.get(client.id);
    if (meta) {
      meta.roomId = roomId;
      meta.joinedAt = new Date();
    }

    // Mevcut katılımcıları yeni girene gönder
    client.emit('room:users', this.getRoomParticipants(roomId));
    client.emit('room:joined', { roomId });

    // Odadakilere yeni kullanıcıyı bildir
    if (meta?.userId && meta?.username) {
      client.to(roomId).emit('room:user:joined', {
        userId: meta.userId,
        username: meta.username,
      });
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeave(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.leave(roomId);
    const meta = this.sockets.get(client.id);
    if (meta?.userId && meta.roomId === roomId && meta.joinedAt) {
      const result = await this.awardRoomTime(meta.userId, meta.joinedAt);
      if (result) this.emitXpToClient(client, result);
      client.to(roomId).emit('room:user:left', {
        userId: meta.userId,
        username: meta.username,
      });
      meta.roomId = undefined;
      meta.joinedAt = undefined;
    }
    client.emit('room:left', { roomId });
  }

  // ── Yardımcılar ────────────────────────────────────────────────────────────

  private getRoomParticipants(roomId: string): { userId: string; username: string }[] {
    const result: { userId: string; username: string }[] = [];
    for (const meta of this.sockets.values()) {
      if (meta.roomId === roomId && meta.userId && meta.username) {
        result.push({ userId: meta.userId, username: meta.username });
      }
    }
    return result;
  }

  private async awardRoomTime(userId: string, joinedAt: Date): Promise<XpResult | null> {
    const minutes = (Date.now() - joinedAt.getTime()) / 60_000;
    const hoursCompleted = Math.floor(minutes / 60);
    if (hoursCompleted <= 0) return null;
    return this.xpService.award(userId, hoursCompleted * XP_REWARDS.ROOM_HOUR);
  }

  private emitXpToClient(client: Socket, result: XpResult) {
    client.emit('xp:updated', result);
  }

  // Soru/cevap gibi HTTP işlemleri sonrası socket üzerinden bildir
  emitXpToUser(userId: string, result: XpResult) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      this.server.to(sid).emit('xp:updated', result);
    }
  }

  // ── Oda yayın metodları ────────────────────────────────────────────────────

  emitNewQuestion(roomId: string, question: unknown) {
    this.server.to(roomId).emit('question:new', question);
  }

  emitVoteUpdated(roomId: string, payload: { id: string; upvotes: number; voted: boolean }) {
    this.server.to(roomId).emit('vote:updated', payload);
  }

  emitNewAnswer(roomId: string, answer: unknown) {
    this.server.to(roomId).emit('answer:new', answer);
  }
}
