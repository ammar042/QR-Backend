import express from "express";
import jwt from "jsonwebtoken";
import {
  sendRegisterOTP,
  verifyRegisterOTP,
  loginOrganization,
} from "../controllers/orgauthController.js";
import {
  getOrgProfile,
  getLinkedDonors,
  getDonorById,
  recordDonation,
  dispenseBlood,
  getStock,
  getOrgStats,
  updateOrgLocation,
  getOrgReport,
} from "../controllers/orgDashboardController.js";

const router = express.Router();

function orgAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token." });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    if (decoded.role !== "organization") return res.status(403).json({ error: "Not an organization account." });
    req.orgId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

// Public
router.post("/register/send-otp",   sendRegisterOTP);
router.post("/register/verify-otp", verifyRegisterOTP);
router.post("/login",               loginOrganization);

// Protected
router.get("/profile",              orgAuth, getOrgProfile);
router.get("/donors",               orgAuth, getLinkedDonors);
router.get("/donors/:donorId",      orgAuth, getDonorById);
router.post("/donations/record",    orgAuth, recordDonation);
router.post("/stock/dispense",      orgAuth, dispenseBlood);   // ← new
router.get("/stock",                orgAuth, getStock);         // ← new
router.get("/stats",                orgAuth, getOrgStats);
router.put("/update-location", orgAuth, updateOrgLocation);
router.get("/reports", orgAuth, getOrgReport);

export default router;