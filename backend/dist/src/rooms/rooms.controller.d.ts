import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import type { User } from '@prisma/client';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
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
}
