import Organization from "../models/Organization.js";
import OTP from "../models/OTP.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { geocodeAddress } from "../utils/geocode.js";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ── Create transporter lazily inside a function so dotenv is already loaded ──
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// POST /api/org/register/send-otp
export const sendRegisterOTP = async (req, res) => {
  try {
    const { organizationName, address, province, district, headName, phone, email, password, latitude, longitude} = req.body;

    if (!organizationName || !address || !headName || !phone || !email || !password || !province || !district || !latitude || !longitude) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const exists = await Organization.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(400).json({ error: "Email or phone already registered." });
    }

    await OTP.deleteMany({ email, purpose: "registration" });

    const otp = generateOTP();
    await OTP.create({ email, otp, purpose: "registration" });

    // Create transporter here — dotenv is definitely loaded by now
    await getTransporter().sendMail({
      from: `"Blood Needer" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Organization Registration OTP",
      html: `
        <h2>Blood Needer — Organization Registration</h2>
        <p>Hello <b>${organizationName}</b>,</p>
        <p>Your OTP for registration is:</p>
        <h1 style="letter-spacing:8px;color:#9f1239">${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    res.json({ message: "OTP sent to email." });
  } catch (err) {
    console.error("sendRegisterOTP error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/org/register/verify-otp
export const verifyRegisterOTP = async (req, res) => {
  try {
    const { organizationName, address, province, district, headName, phone, email, password, otp, latitude, longitude } = req.body;

    const record = await OTP.findOne({ email, purpose: "registration" });
    if (!record) return res.status(400).json({ error: "OTP not found. Please request again." });
    if (record.otp !== otp) {
      await OTP.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ error: "Invalid OTP." });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "OTP expired. Please request again." });
    }

    const org = await Organization.create({
      organizationName, address, province, district, headName, phone, email, password,
      isVerified: true,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    await OTP.deleteMany({ email, purpose: "registration" });

    const token = generateToken(org._id, "organization");

    res.status(201).json({
      token,
      organization: {
        id:               org._id,
        organizationName: org.organizationName,
        email:            org.email,
        orgCode:          org.orgCode,
        role:             org.role,
      },
    });
  } catch (err) {
    console.error("verifyRegisterOTP error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/org/login
export const loginOrganization = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: "Email/phone and password are required." });
    }

    const query = email ? { email } : { phone };
    const org = await Organization.findOne(query);
    if (!org) return res.status(401).json({ error: "Invalid credentials." });

    const match = await org.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Invalid credentials." });

    if (!org.isActive) return res.status(403).json({ error: "Account is deactivated." });

    const token = generateToken(org._id, "organization");

    res.json({
      token,
      organization: {
        id:               org._id,
        organizationName: org.organizationName,
        email:            org.email,
        orgCode:          org.orgCode,
        role:             org.role,
      },
    });
  } catch (err) {
    console.error("loginOrganization error:", err.message);
    res.status(500).json({ error: err.message });
  }
};