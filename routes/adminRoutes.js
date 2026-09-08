import express from "express";
import jwt from "jsonwebtoken";
import { loginAdmin, getOverview, getAdminReport } from "../controllers/adminController.js";

const router = express.Router();

function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token." });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Admin access only." });
    req.adminId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

router.post("/login", loginAdmin);
router.get("/overview", adminAuth, getOverview);
router.get("/reports", adminAuth, getAdminReport);

export default router;