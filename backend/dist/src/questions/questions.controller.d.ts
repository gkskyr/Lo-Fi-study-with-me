import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import type { User } from '@prisma/client';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    create(dto: CreateQuestionDto, user: User): Promise<{
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
    findByRoom(id: string): Promise<({
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
    vote(id: string): Promise<{
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
