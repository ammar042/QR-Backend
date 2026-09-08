import express from "express";
import jwt from "jsonwebtoken";
import Donor from "../models/Donor.js";
import Organization from "../models/Organization.js";
import { computeDonorBadges, computeOrgBadges } from "../utils/badges.js";

const router = express.Router();

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token." });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.role   = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

// GET /api/badges — returns earned badges for the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.role === "donor") {
      const donor = await Donor.findById(req.userId).select("-password")
        .populate("linkedOrganizations.organization");
      if (!donor) return res.status(404).json({ error: "Donor not found." });
      const badges = computeDonorBadges(donor.toJSON());
      return res.json({ badges });
    }

    if (req.role === "organization") {
      const org = await Organization.findById(req.userId).select("-password");
      if (!org) return res.status(404).json({ error: "Org not found." });
      const badges = computeOrgBadges(org.toObject());
      return res.json({ badges });
    }

    res.status(400).json({ error: "Unknown role." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;