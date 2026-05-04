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
var EmailValidatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailValidatorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const dns = __importStar(require("dns/promises"));
const disposableDomains = require('disposable-email-domains');
let EmailValidatorService = EmailValidatorService_1 = class EmailValidatorService {
    config;
    logger = new common_1.Logger(EmailValidatorService_1.name);
    constructor(config) {
        this.config = config;
    }
    async validate(email) {
        const apiKey = this.config.get('ABSTRACT_API_KEY');
        if (apiKey) {
            await this.validateWithAbstractApi(email, apiKey);
        }
        else {
            await this.validateWithFallback(email);
        }
    }
    async validateWithAbstractApi(email, apiKey) {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
        let data;
        try {
            const res = await fetch(url);
            data = (await res.json());
        }
        catch {
            this.logger.warn('Abstract API erişilemedi, fallback doğrulamaya geçiliyor.');
            await this.validateWithFallback(email);
            return;
        }
        if (!data.is_valid_format?.value) {
            throw new common_1.BadRequestException('Geçersiz e-posta formatı.');
        }
        if (data.is_disposable_email?.value) {
            throw new common_1.BadRequestException('Geçici (tek kullanımlık) e-posta adresleri kabul edilmez.');
        }
        if (!data.is_mx_found?.value) {
            throw new common_1.BadRequestException('Bu e-posta adresi için geçerli bir mail sunucusu bulunamadı.');
        }
        if (data.deliverability === 'UNDELIVERABLE') {
            throw new common_1.BadRequestException('Bu e-posta adresine ulaşılamıyor. Lütfen geçerli bir adres girin.');
        }
    }
    async validateWithFallback(email) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) {
            throw new common_1.BadRequestException('Geçersiz e-posta formatı.');
        }
        if (disposableDomains.includes(domain)) {
            throw new common_1.BadRequestException('Geçici (tek kullanımlık) e-posta adresleri kabul edilmez.');
        }
        try {
            const records = await dns.resolveMx(domain);
            if (!records || records.length === 0) {
                throw new common_1.BadRequestException('Bu domain için mail sunucusu bulunamadı.');
            }
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.BadRequestException('Bu e-posta adresi için geçerli bir mail sunucusu bulunamadı.');
        }
    }
};
exports.EmailValidatorService = EmailValidatorService;
exports.EmailValidatorService = EmailValidatorService = EmailValidatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailValidatorService);
//# sourceMappingURL=email-validator.service.js.map