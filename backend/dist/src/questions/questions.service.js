"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const rooms_gateway_1 = require("../rooms/rooms.gateway");
let QuestionsService = class QuestionsService {
    prisma;
    roomsGateway;
    constructor(prisma, roomsGateway) {
        this.prisma = prisma;
        this.roomsGateway = roomsGateway;
    }
    async create(dto, authorId) {
        const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
        if (!room)
            throw new common_1.NotFoundException('Oda bulunamadı.');
        const question = await this.prisma.question.create({
            data: { content: dto.content, roomId: dto.roomId, authorId },
            include: { author: { select: { id: true, name: true } } },
        });
        this.roomsGateway.emitNewQuestion(dto.roomId, question);
        return question;
    }
    async findByRoom(roomId) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException('Oda bulunamadı.');
        return this.prisma.question.findMany({
            where: { roomId },
            include: { author: { select: { id: true, name: true } } },
            orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
        });
    }
    async vote(questionId) {
        const question = await this.prisma.question.findUnique({ where: { id: questionId } });
        if (!question)
            throw new common_1.NotFoundException('Soru bulunamadı.');
        const updated = await this.prisma.question.update({
            where: { id: questionId },
            data: { upvotes: { increment: 1 } },
            include: { author: { select: { id: true, name: true } } },
        });
        this.roomsGateway.emitVoteUpdated(updated.roomId, { id: updated.id, upvotes: updated.upvotes });
        return updated;
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rooms_gateway_1.RoomsGateway])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map