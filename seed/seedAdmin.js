import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const existing = await Admin.findOne({ email: "admin@bloodneeder.com" });
    if (existing) {
      console.log("⚠ Admin already exists. Skipping seed.");
      process.exit(0);
    }

    const admin = await Admin.create({
      name: "Super Admin",
      email: "admin@bloodneeder.com",
      password: "Admin@123",
    });

    console.log("✅ Admin created:", admin.email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seedAdmin();