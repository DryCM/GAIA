import { Router } from "express";
import { getGamification, postMessage, parentalStats } from "../controllers/gamificationController.js";

const router = Router();

// GET  /api/gamification/:userId          → estado completo (racha, monedas, logros)
// POST /api/gamification/:userId/message  → registrar mensaje (+2 monedas, racha)
// GET  /api/gamification/:userId/parental → estadísticas para padres
router.get( "/gamification/:userId",           getGamification);
router.post("/gamification/:userId/message",   postMessage);
router.get( "/gamification/:userId/parental",  parentalStats);

export default router;
