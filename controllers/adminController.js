import Admin from "../models/Admin.js";
import Donor from "../models/Donor.js";
import Organization from "../models/Organization.js";
import jwt from "jsonwebtoken";

function generateToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/admin/login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ error: "Invalid credentials." });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Invalid credentials." });

    const token = generateToken(admin._id, "admin");

    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/bootstrap
// One-time helper to create the admin account on whichever database this
// deployment is actually connected to (production Vercel + MongoDB Atlas).
// This fixes the classic "Invalid credentials" issue that happens when
// `seed/seedAdmin.js` was only ever run against a local database instead
// of the production MONGODB_URI.
//
// Protected by ADMIN_SEED_KEY (set this in Vercel → Project → Settings →
// Environment Variables, then redeploy). Call it once, e.g.:
//   POST https://your-backend.vercel.app/api/admin/bootstrap?key=YOUR_KEY
// Body (all optional, defaults shown):
//   { "name": "Super Admin", "email": "admin@bloodneeder.com", "password": "Admin@123" }
// It is idempotent — if the admin already exists it just confirms that.
export const bootstrapAdmin = async (req, res) => {
  try {
    const providedKey = req.query.key || req.body.key || req.headers["x-seed-key"];

    if (!process.env.ADMIN_SEED_KEY) {
      return res.status(500).json({
        error: "ADMIN_SEED_KEY is not set on the server. Add it in your Vercel environment variables first.",
      });
    }

    if (!providedKey || providedKey !== process.env.ADMIN_SEED_KEY) {
      return res.status(401).json({ error: "Invalid or missing seed key." });
    }

    const email = (req.body.email || "admin@bloodneeder.com").toLowerCase();
    const password = req.body.password || "Admin@123";
    const name = req.body.name || "Super Admin";

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.json({
        success: true,
        message: "Admin already exists — no changes made.",
        admin: { id: existing._id, email: existing.email },
      });
    }

    const admin = await Admin.create({ name, email, password });

    res.status(201).json({
      success: true,
      message: "Admin created. You can now log in with this email/password.",
      admin: { id: admin._id, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/overview
export const getOverview = async (req, res) => {
  try {
    const donors = await Donor.find().select("-password");
    const organizations = await Organization.find().select("-password");

    const totalDonors = donors.length;
    const totalOrgs = organizations.length;
    const eligibleDonors = donors.filter((d) => {
      if (!d.lastDonationDate) return true;
      const diff = Math.floor((new Date() - new Date(d.lastDonationDate)) / 86400000);
      return diff >= 90;
    }).length;

    let totalStockMl = 0;
    organizations.forEach((org) => {
      if (org.bloodStock) {
        org.bloodStock.forEach((ml) => (totalStockMl += ml));
      }
    });

    res.json({
      stats: {
        totalDonors,
        totalOrgs,
        eligibleDonors,
        notEligibleDonors: totalDonors - eligibleDonors,
        totalStockMl,
      },
      donors,
      organizations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/reports
// Admin-wide report. With organizationId it reports one organization;
// without it, it aggregates every organization and every donor.
export const getAdminReport = async (req, res) => {
  try {
    const { period, start, end, organizationId } = req.query;

    const now = new Date();
    let startDate;
    let endDate = now;

    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid report date range." });
      }
      // Include the complete selected end date.
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "daily") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === "monthly") {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "yearly") {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date("2000-01-01T00:00:00.000Z");
    }

    const orgQuery = organizationId ? { _id: organizationId } : {};
    const [organizations, donors] = await Promise.all([
      Organization.find(orgQuery).select(
        "organizationName address phone headName bloodStock dispenseHistory"
      ),
      Donor.find(
        organizationId
          ? { "linkedOrganizations.organization": organizationId }
          : {}
      ).select("-password"),
    ]);

    if (organizationId && organizations.length === 0) {
      return res.status(404).json({ error: "Organization not found." });
    }

    const donations = [];
    donors.forEach((d) => {
      (d.donationHistory || []).forEach((entry) => {
        const entryDate = new Date(entry.date);
        if (entryDate >= startDate && entryDate <= endDate) {
          donations.push({
            donorName: `${d.firstName} ${d.lastName}`,
            donorId: d._id,
            bloodGroup: d.bloodGroup || "—",
            date: entry.date,
            units: Number(entry.units || 0),
            location: entry.location || "—",
            orgName: entry.orgName || "—",
            orgId: entry.orgId || null,
          });
        }
      });
    });
    donations.sort((a, b) => new Date(b.date) - new Date(a.date));

    const dispenses = [];
    organizations.forEach((org) => {
      (org.dispenseHistory || []).forEach((entry) => {
        const entryDate = new Date(entry.date);
        if (entryDate >= startDate && entryDate <= endDate) {
          dispenses.push({
            organizationName: org.organizationName,
            organizationId: org._id,
            bloodGroup: entry.bloodGroup || "—",
            date: entry.date,
            units: Number(entry.units || 0),
            recipientName: entry.recipientName || "Anonymous",
          });
        }
      });
    });
    dispenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const donationsByBloodGroup = Object.fromEntries(
      bloodGroups.map((bg) => [bg, 0])
    );
    const dispensesByBloodGroup = Object.fromEntries(
      bloodGroups.map((bg) => [bg, 0])
    );

    donations.forEach((d) => {
      if (donationsByBloodGroup[d.bloodGroup] !== undefined) {
        donationsByBloodGroup[d.bloodGroup] += d.units;
      }
    });

    dispenses.forEach((d) => {
      if (dispensesByBloodGroup[d.bloodGroup] !== undefined) {
        dispensesByBloodGroup[d.bloodGroup] += d.units;
      }
    });

    const currentStock = Object.fromEntries(
      bloodGroups.map((bg) => [bg, 0])
    );

    organizations.forEach((org) => {
      bloodGroups.forEach((bg) => {
        currentStock[bg] += org.bloodStock?.get(bg) || 0;
      });
    });

    const eligibleDonors = donors.filter((d) => d.isEligible).length;

    res.json({
      scope: organizationId ? "organization" : "all",
      organizations: organizations.map((org) => ({
        id: org._id,
        name: org.organizationName,
        address: org.address,
        phone: org.phone,
        head: org.headName,
      })),
      period: { label: period || "custom", startDate, endDate },
      summary: {
        totalOrganizations: organizations.length,
        totalDonors: donors.length,
        eligibleDonors,
        totalDonations: donations.length,
        totalMlRecorded: donations.reduce((sum, d) => sum + d.units, 0),
        totalDispenses: dispenses.length,
        totalMlDispensed: dispenses.reduce((sum, d) => sum + d.units, 0),
        netStock:
          donations.reduce((sum, d) => sum + d.units, 0) -
          dispenses.reduce((sum, d) => sum + d.units, 0),
        donationsByBloodGroup,
        dispensesByBloodGroup,
      },
      currentStock,
      donations,
      dispenses,
    });
  } catch (err) {
    console.error("getAdminReport error:", err.message);
    res.status(500).json({ error: err.message });
  }
};