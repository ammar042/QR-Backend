import express from "express";
import { searchBlood, searchNearbyDonors,searchNearbyOrgs  } from "../controllers/searchController.js";

const router = express.Router();

// GET /api/search/blood?bloodGroup=O%2B&province=Punjab&district=Lahore
router.get("/blood", searchBlood);
router.get("/nearby", searchNearbyDonors); 
router.get("/nearby-orgs", searchNearbyOrgs);

export default router;