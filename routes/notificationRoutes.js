import express from "express";
import jwt from "jsonwebtoken";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// Works for both donors and orgs — sets req.userId or req.orgId
function notifAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token." });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.orgId  = decoded.id; // same field, controller handles both
    req.role   = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

router.get("/",              notifAuth, getNotifications);
router.put("/:id/read",     notifAuth, markAsRead);
router.put("/read-all",     notifAuth, markAllAsRead);

export default router;