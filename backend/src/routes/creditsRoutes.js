import { Router } from "express";
import { getCredits } from "../controllers/creditsController.js";

const router = Router();

router.get("/credits", getCredits);

export default router;