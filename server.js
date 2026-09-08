import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from './config/db.js';
import authRoutes  from './routes/authRoutes.js';
import orgRoutes   from "./routes/orgRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import searchRoutes from "./routes/searchRoutes.js"; 
import bloodRequestRoutes from "./routes/bloodRequestRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import badgeRoutes from "./routes/badgeRoutes.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/org',    orgRoutes);
app.use('/api/donor',  donorRoutes);
app.use('/api/search', searchRoutes);   
app.use("/api/requests", bloodRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/badges", badgeRoutes);


// test
app.get("/", (req, res) => res.send("Blood Donation API Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));