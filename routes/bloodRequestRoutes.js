import express from "express";
import { createBloodRequest, getBloodRequests } from "../controllers/bloodRequestController.js";

const router = express.Router();

router.post("/create", createBloodRequest);
router.get("/", getBloodRequests);

export default router;