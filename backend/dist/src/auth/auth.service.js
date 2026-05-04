"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
const email_validator_service_1 = require("./services/email-validator.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    mailService;
    emailValidator;
    constructor(usersService, jwtService, mailService, emailValidator) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.emailValidator = emailValidator;
    }
    async register(dto) {
        await this.emailValidator.validate(dto.email);
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing)
            throw new common_1.ConflictException('Bu e-posta zaten kayıtlı.');
        const hashed = await bcrypt.hash(dto.password, 10);
        const user = await this.usersService.create({
            email: dto.email,
            name: dto.name,
            password: hashed,
        });
        const code = this.generateOtp();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.setVerificationCode(user.email, code, expiry);
        await this.mailService.sendVerificationCode(user.email, user.name, code);
        return { message: 'Kayıt başarılı. E-posta adresinize doğrulama kodu gönderildi.' };
    }
    async verifyEmail(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user)
            throw new common_1.BadRequestException('Geçersiz istek.');
        if (user.isEmailVerified) {
            return { message: 'E-posta zaten doğrulanmış.' };
        }
        if (!user.emailVerificationCode ||
            !user.emailVerificationExpiry ||
            user.emailVerificationCode !== dto.code ||
            user.emailVerificationExpiry < new Date()) {
            throw new common_1.BadRequestException('Doğrulama kodu geçersiz veya süresi dolmuş.');
        }
        await this.usersService.verifyEmail(user.email);
        return this.signToken(user.id, user.email);
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user)
            throw new common_1.UnauthorizedException('Geçersiz kimlik bilgileri.');
        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch)
            throw new common_1.UnauthorizedException('Geçersiz kimlik bilgileri.');
        if (!user.isEmailVerified) {
            throw new common_1.ForbiddenException('Lütfen önce e-posta adresinizi doğrulayın.');
        }
        return this.signToken(user.id, user.email);
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    signToken(userId, email) {
        const payload = { sub: userId, email };
        return { access_token: this.jwtService.sign(payload) };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mail_service_1.MailService,
        email_validator_service_1.EmailValidatorService])
], AuthService);
//# sourceMappingURL=auth.service.js.map