import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RoomsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('room:join')
  handleJoin(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    client.emit('room:joined', { roomId });
  }

  @SubscribeMessage('room:leave')
  handleLeave(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.leave(roomId);
    client.emit('room:left', { roomId });
  }

  emitNewQuestion(roomId: string, question: unknown) {
    this.server.to(roomId).emit('question:new', question);
  }

  emitVoteUpdated(roomId: string, payload: { id: string; upvotes: number }) {
    this.server.to(roomId).emit('vote:updated', payload);
  }
}
