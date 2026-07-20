"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.isDBConnected = isDBConnected;
const mongoose_1 = __importDefault(require("mongoose"));
let isConnected = false;
async function connectDB() {
    if (isConnected)
        return;
    const uri = process.env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGODB_URI no configurada');
    await mongoose_1.default.connect(uri);
    isConnected = true;
}
function isDBConnected() {
    return isConnected;
}
