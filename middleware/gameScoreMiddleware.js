import GameScore from "../models/gameScoreModel.js";

// 🆕 Create or update player score
export const updateScore = async (req, res) => {
  try {
    const { gameName, score, level, playTime } = req.body;
    const userId = req.user._id;

    let gameScore = await GameScore.findOne({ user: userId, gameName });

    if (gameScore) {
      // Update existing record
      gameScore.score = score;
      gameScore.level = level || gameScore.level;
      gameScore.playTime += playTime || 0;

      if (score > gameScore.highScore) {
        gameScore.highScore = score;
      }

      await gameScore.save();
    } else {
      // Create new record
      gameScore = await GameScore.create({
        user: userId,
        gameName,
        score,
        highScore: score,
        level,
        playTime,
      });
    }

    res.status(200).json({ success: true, gameScore });
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 📊 Get leaderboard for a specific game
export const getLeaderboard = async (req, res) => {
  try {
    const { gameName } = req.params;
    const scores = await GameScore.find({ gameName })
      .populate("user", "name")
      .sort({ highScore: -1 })
      .limit(10);
    res.status(200).json(scores);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 👤 Get logged-in user's scores
export const getUserScores = async (req, res) => {
  try {
    const scores = await GameScore.find({ user: req.user._id });
    res.status(200).json(scores);
  } catch (error) {
    console.error("Error fetching user scores:", error);
    res.status(500).json({ message: "Server error" });
  }
};
