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
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET no configurado');
    return secret;
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, getSecret(), { expiresIn: '7d' });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, getSecret());
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
