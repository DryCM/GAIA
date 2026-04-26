/* ================================================================
   GaIA Auth Middleware / Middleware de autenticación
   ES: Middleware opcional que lee el token JWT del encabezado
       Authorization: Bearer <token> y adjunta al request:
       - req.authUserId   → ID del usuario autenticado
       - req.authUsername → nombre de usuario
       - req.authUserRole → "normal" | "admin"
       Si el token falta o es inválido, el request continúa sin
       atributos de autenticación (compatibilidad retroactiva).
   EN: Optional middleware that reads the JWT from the
       Authorization: Bearer <token> header and attaches to req:
       - req.authUserId   → authenticated user ID
       - req.authUsername → username
       - req.authUserRole → "normal" | "admin"
       If the token is missing or invalid, the request continues
       without auth attributes (backwards compatibility).
   ================================================================ */

import { verifyToken } from "../services/authService.js";

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        req.authUserId = payload.userId;
        req.authUsername = payload.username;
        req.authUserRole = payload.role;
      }
    }
  }

  next();
}

export { optionalAuth };
