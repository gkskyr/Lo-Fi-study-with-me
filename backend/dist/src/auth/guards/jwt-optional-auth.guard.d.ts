declare const JwtOptionalAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtOptionalAuthGuard extends JwtOptionalAuthGuard_base {
    handleRequest(_err: any, user: any): any;
}
export {};
