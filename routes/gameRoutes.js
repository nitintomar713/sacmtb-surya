import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  updateScore,
  getLeaderboard,
  getUserScores,
} from "../middleware/gameScoreMiddleware.js";

const router = express.Router();

router.post("/update", protect, updateScore);
router.get("/leaderboard/:gameName", getLeaderboard);
router.get("/my-scores", protect, getUserScores);

export default router;
