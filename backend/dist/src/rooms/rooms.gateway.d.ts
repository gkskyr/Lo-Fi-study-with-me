import { Server, Socket } from 'socket.io';
export declare class RoomsGateway {
    server: Server;
    handleJoin(roomId: string, client: Socket): void;
    handleLeave(roomId: string, client: Socket): void;
    emitNewQuestion(roomId: string, question: unknown): void;
    emitVoteUpdated(roomId: string, payload: {
        id: string;
        upvotes: number;
    }): void;
}
