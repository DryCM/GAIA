/* ================================================================
   GaIA Auth Routes / Rutas de autenticación
   ES: Define los endpoints de registro y login.
   EN: Defines the registration and login endpoints.
   ================================================================ */

import { Router } from "express";
import { register, login } from "../controllers/authController.js";

const router = Router();

// POST /auth/register  → Crear cuenta nueva
// POST /auth/login     → Iniciar sesión
router.post("/auth/register", register);
router.post("/auth/login", login);

export default router;
