"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const api_1 = __importDefault(require("./routes/api"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public')));
}
app.use('/api', api_1.default);
app.get(/^\/conversation\/([a-f0-9-]+)(\/.*)?$/i, (_req, res) => {
    res.sendFile(path_1.default.join(process.cwd(), 'public', 'dashboard.html'));
});
app.use((_req, res) => {
    res.sendFile(path_1.default.join(process.cwd(), 'public', 'index.html'));
});
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`WhatsApp Analyzer corriendo en http://localhost:${PORT}`);
    });
}
exports.default = app;
