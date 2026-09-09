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

const app = express();

app.use(cors({
  // Reflect the requesting origin so all browser origins are allowed.
  // This is required when credentials are enabled; `*` is not valid with credentials.
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check does not depend on MongoDB.
app.get("/", (req, res) => res.send("Blood Donation API Running"));

// Serverless invocations must wait for the shared MongoDB connection. Returning
// an Express response here preserves CORS headers if Atlas is unavailable.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database unavailable:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
    });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/org',    orgRoutes);
app.use('/api/donor',  donorRoutes);
app.use('/api/search', searchRoutes);   
app.use("/api/requests", bloodRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/badges", badgeRoutes);

const PORT = process.env.PORT || 5000;

// Vercel uses the exported Express app as a serverless function.
// Keep the listener for local development only.
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
