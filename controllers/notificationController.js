import Notification from "../models/Notification.js";
import { computeDonorBadges, computeOrgBadges, DONOR_BADGE_DEFS, ORG_BADGE_DEFS } from "../utils/badges.js";
import Donor from "../models/Donor.js";
import Organization from "../models/Organization.js";

// GET /api/notifications — fetch unread notifications for the logged-in user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.userId || req.orgId,
      isRead: false,
    }).sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/:id/read — mark one as read
export const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: "Marked as read." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/read-all — mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.userId || req.orgId, isRead: false },
      { isRead: true }
    );
    res.json({ message: "All marked as read." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Called internally after profile loads — checks for new badges and creates notifications
export const checkAndCreateBadgeNotifications = async (recipientId, recipientType, earnedBadges) => {
  try {
    const badgeDefs = recipientType === "donor" ? DONOR_BADGE_DEFS : ORG_BADGE_DEFS;

    for (const badge of earnedBadges) {
      const already = await Notification.findOne({
        recipientId,
        recipientType,
        type: "badge",
        title: badge.label,
      });

      if (!already) {
        await Notification.create({
          recipientId,
          recipientType,
          type: "badge",
          title: badge.label,
          message: badge.description,
          emoji: badge.emoji,
          isRead: false,
        });
      }
    }
  } catch (err) {
    console.error("Badge notification error:", err.message);
  }
};