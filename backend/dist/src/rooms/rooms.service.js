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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let RoomsService = class RoomsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, ownerId) {
        return this.prisma.room.create({
            data: { title: dto.title, type: dto.type, ownerId },
            include: { owner: { select: { id: true, name: true } } },
        });
    }
    async findAll(currentUserId) {
        return this.prisma.room.findMany({
            where: {
                OR: [
                    { type: client_1.RoomType.COMMUNITY },
                    ...(currentUserId ? [{ type: client_1.RoomType.PERSONAL, ownerId: currentUserId }] : []),
                ],
            },
            include: { owner: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, currentUserId) {
        const room = await this.prisma.room.findUnique({
            where: { id },
            include: { owner: { select: { id: true, name: true } } },
        });
        if (!room)
            throw new common_1.NotFoundException('Oda bulunamadı.');
        if (room.type === client_1.RoomType.PERSONAL && room.ownerId !== currentUserId) {
            throw new common_1.ForbiddenException('Bu odaya erişim yetkiniz yok.');
        }
        return room;
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map