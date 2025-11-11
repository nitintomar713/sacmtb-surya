import mongoose from "mongoose";

const gameScoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    gameName: {
      type: String,
      required: true,
    },

    level: {
      type: Number,
      default: 1,
    },

    score: {
      type: Number,
      required: true,
      default: 0,
    },

    highScore: {
      type: Number,
      default: 0,
    },

    achievements: [
      {
        title: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],

    playTime: {
      type: Number, // seconds or minutes
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const GameScore = mongoose.model("GameScore", gameScoreSchema);
export default GameScore;
