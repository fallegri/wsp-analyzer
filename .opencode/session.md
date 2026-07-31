# Sesión - 29 Jul 2026

## Logro principal
App funcionando en producción → https://wsp-analyzer.vercel.app

## Seguridad corregida (esta sesión)
| Issue | Status | Archivo |
|-------|--------|---------|
| XSS en dashboard | ✅ Sanitizado con `sanitize()` | `public/dashboard.html` |
| JWT secret hardcodeado | ✅ Lanza error si no está configurado | `src/lib/auth.ts` |
| Test endpoints expuestos | ✅ Eliminados | `src/routes/api.ts` |
| Account enumeration | ✅ Mensaje genérico "Credenciales inválidas" | `src/routes/api.ts` |
| Rate limiting | ✅ 10 intentos / 15 min en auth | `src/routes/api.ts` |
| Validación password backend | ✅ Mínimo 6 caracteres | `src/routes/api.ts` |
| Helmet (seguridad HTTP) | ✅ Headers X-Frame, X-Content-Type, HSTS | `src/index.ts` |
| Validación magic bytes | ✅ Rechaza archivos binarios | `src/routes/api.ts` |

## Pendientes (no corregido)
1. **Probar flujo completo en Vercel**: Login → Subir archivo .txt → Ver dashboard
2. **Token en localStorage**: Vulnerable si hay XSS. Migrar a httpOnly cookie es más complejo
3. **Express 5**: Usa versión beta. Si da problemas, migrar a Express 4

## Estado actual
- **BD**: MongoDB Atlas cluster0, db `wsp-analyzer`, usuario `fernandoallegri_db_user`
- **Auth**: JWT con bcryptjs, roles: admin/user/pending
- **Deploy**: Vercel con serverless Express, env vars actualizadas
- **Usuarios prueba**:
  - `test@test.com` / `test123` (admin)
  - `user2@test.com` / `test123` (pending)

## Archivos clave
- `public/index.html` - Login/Registro
- `public/dashboard.html` - Dashboard con análisis (contiene `sanitize()`)
- `src/routes/api.ts` - Backend API (auth, rate-limit, upload)
- `src/index.ts` - Express app (helmet)
- `src/lib/auth.ts` - JWT sign/verify (sin fallback)
- `api/index.js` - Entry point Vercel
- `vercel.json` - Config Vercel
- `.env` - Variables locales (MONGODB_URI, JWT_SECRET)
