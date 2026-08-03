import express from "express";
import ArenaSetting from "../models/ArenaSetting.js";
import User from "../models/userModel.js";

const router = express.Router();

/* =========================================
   LIVE ARENA STATS
========================================= */

router.get("/stats", async (req, res) => {
  try {

    let arena = await ArenaSetting.findOne();

    // Create default settings if not found
    if (!arena) {

      arena = await ArenaSetting.create({
        totalRegistered: 5000,
        totalSlots: 20000,
        launchDate: new Date("2027-01-01"),
      });

    }

    // Get the latest registered game player
    const latestUser = await User.findOne({
      gameRegistered: true,
    }).sort({
      riderNumber: -1,
    });

    // Current participation counter
    const totalRegistered =
      latestUser?.riderNumber || arena.totalRegistered;

    // Keep ArenaSetting synchronized
    if (arena.totalRegistered !== totalRegistered) {

      arena.totalRegistered = totalRegistered;
      await arena.save();

    }

    const remainingSlots = Math.max(
      arena.totalSlots - totalRegistered,
      0
    );

    return res.status(200).json({
      success: true,

      totalRegistered,

      totalSlots: arena.totalSlots,

      remainingSlots,

      launchDate: arena.launchDate,

      participationPrefix: "SACRIDER",
    });

  } catch (error) {

    console.error("Arena Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load arena stats",
    });

  }
});

export default router;