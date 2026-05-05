import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
export declare class RoomsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateRoomDto, ownerId: string): Promise<{
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
    findAll(currentUserId?: string): Promise<({
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
    findOne(id: string, currentUserId?: string): Promise<{
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
