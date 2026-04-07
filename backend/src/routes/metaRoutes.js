import { Router } from "express";

const router = Router();

router.get("/version", (req, res) => {
  return res.json({
    api: "gaia-backend",
    version: "v1",
    timestamp: new Date().toISOString(),
  });
});

export default router;