import { Router } from "express";
import {
  createUserProfile,
  updateUserConsent,
  updateUserAge,
  getUserProfile,
  deleteUserProfile,
  getUserInterests,
  getLearningStats,
} from "../controllers/learningController.js";

const router = Router();

router.post("/learning/profile", createUserProfile);
router.put("/learning/consent", updateUserConsent);
router.put("/learning/age", updateUserAge);
router.get("/learning/profile/:userId", getUserProfile);
router.delete("/learning/profile/:userId", deleteUserProfile);
router.get("/learning/interests/:userId", getUserInterests);
router.get("/learning/stats", getLearningStats);

export default router;
