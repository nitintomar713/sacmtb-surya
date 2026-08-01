import mongoose from "mongoose";

const arenaSettingSchema = new mongoose.Schema(
  {
    totalRegistered: {
      type: Number,
      default: 5000,
      min: 5000,
    },

    totalSlots: {
      type: Number,
      default: 20000,
    },

    launchDate: {
      type: Date,
      default: new Date("2027-01-01T00:00:00"),
    },
  },
  {
    timestamps: true,
  }
);

const ArenaSetting = mongoose.model("ArenaSetting", arenaSettingSchema);

export default ArenaSetting;