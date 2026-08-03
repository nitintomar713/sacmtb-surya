import express from "express";
import ArenaSetting from "../models/ArenaSetting.js";

const router = express.Router();

/* =========================================
   LIVE ARENA STATS
========================================= */

router.get("/stats", async (req, res) => {
  try {

    let arena = await ArenaSetting.findOne();

    if (!arena) {

      arena = await ArenaSetting.create({
        totalRegistered: 5000,
        totalSlots: 20000,
        launchDate: new Date("2027-01-01"),
      });

    }

    return res.json({
      success: true,
      totalRegistered: arena.totalRegistered,
      totalSlots: arena.totalSlots,
      launchDate: arena.launchDate,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to load arena stats",
    });

  }
});

export default router;