import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from '../rooms/rooms.gateway';
import { CreateQuestionDto } from './dto/create-question.dto';
export declare class QuestionsService {
    private readonly prisma;
    private readonly roomsGateway;
    constructor(prisma: PrismaService, roomsGateway: RoomsGateway);
    create(dto: CreateQuestionDto, authorId: string): Promise<{
        author: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        roomId: string;
        content: string;
        upvotes: number;
        authorId: string;
    }>;
    findByRoom(roomId: string): Promise<({
        author: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        roomId: string;
        content: string;
        upvotes: number;
        authorId: string;
    })[]>;
    vote(questionId: string): Promise<{
        author: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        roomId: string;
        content: string;
        upvotes: number;
        authorId: string;
    }>;
}
