import express from "express";
import { registerDonor, getDonors, getDonorProfile, updateDonorProfile, updateDonorLocation} from "../controllers/donorController.js";
import jwt from "jsonwebtoken";

const router = express.Router();
// ── Donor auth middleware ─────────────────────────────────────────────────────
function donorAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token." });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}
 
router.get("/profile", donorAuth, getDonorProfile);
router.put("/profile", donorAuth, updateDonorProfile);
router.put("/update-location", donorAuth, updateDonorLocation);
// Register new donor
router.post("/register", registerDonor);

// Get all donors
router.get("/", getDonors);

export default router;