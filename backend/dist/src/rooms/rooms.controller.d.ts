import { RoomsService } from './rooms.service';
import { AgoraService } from '../agora/agora.service';
import { CreateRoomDto } from './dto/create-room.dto';
import type { User } from '@prisma/client';
export declare class RoomsController {
    private readonly roomsService;
    private readonly agoraService;
    constructor(roomsService: RoomsService, agoraService: AgoraService);
    create(dto: CreateRoomDto, user: User): Promise<{
        owner: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        type: import("@prisma/client").$Enums.RoomType;
        ownerId: string;
    }>;
    findAll(user: User | null): Promise<({
        owner: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        type: import("@prisma/client").$Enums.RoomType;
        ownerId: string;
    })[]>;
    findOne(id: string, user: User | null): Promise<{
        owner: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        type: import("@prisma/client").$Enums.RoomType;
        ownerId: string;
    }>;
    getAgoraToken(id: string, user: User): Promise<{
        token: string;
        uid: number;
        channelName: string;
    }>;
}
