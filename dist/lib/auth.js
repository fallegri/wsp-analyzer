"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.requireAuth = requireAuth;
exports.adminOnly = adminOnly;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function signToken(payload) {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '7d' });
}
function verifyToken(token) {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    return jsonwebtoken_1.default.verify(token, secret);
}
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token requerido' });
        return;
    }
    try {
        const payload = verifyToken(header.slice(7));
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}
function adminOnly(req, res, next) {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        res.status(403).json({ error: 'Se requiere rol de administrador' });
        return;
    }
    next();
}
