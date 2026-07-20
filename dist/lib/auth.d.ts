import { Request, Response, NextFunction } from 'express';
export interface AuthPayload {
    userId: string;
    email: string;
    role: 'admin' | 'user' | 'pending';
}
export declare function signToken(payload: AuthPayload): string;
export declare function verifyToken(token: string): AuthPayload;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function adminOnly(req: Request, res: Response, next: NextFunction): void;
