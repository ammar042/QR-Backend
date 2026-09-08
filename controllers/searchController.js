import Organization from "../models/Organization.js";
import Donor from "../models/Donor.js";

// Adds a random offset within ~200m so exact home location isn't exposed
function jitterCoordinates([lng, lat], maxMeters = 200) {
  const earthRadius = 6378137; // meters
  const randomDistance = Math.random() * maxMeters;
  const randomAngle = Math.random() * 2 * Math.PI;

  const dLat = (randomDistance * Math.cos(randomAngle)) / earthRadius;
  const dLng = (randomDistance * Math.sin(randomAngle)) / (earthRadius * Math.cos((lat * Math.PI) / 180));

  return [
    lng + (dLng * 180) / Math.PI,
    lat + (dLat * 180) / Math.PI,
  ];
}

export const searchBlood = async (req, res) => {
  try {
    const { bloodGroup, province, district } = req.query;

    if (!province || !district) {
      return res.status(400).json({ error: "Province and district are required." });
    }

    // Find all active orgs in the given province + district
    const orgs = await Organization.find({
      isActive: true,
      $or: [
        {
          district: { $regex: district, $options: "i" },
          province: { $regex: province, $options: "i" },
        },
        {
          // fallback for orgs without district/province fields
          address: { $regex: district, $options: "i" },
        },
      ],
    }).select("-password -donors");

    if (orgs.length === 0) {
      return res.json({ results: [] });
    }

    // Build results from blood stock
    const results = orgs
      .map((org) => {
        // Convert the bloodStock Map to a plain object
        const stock = {};
        if (org.bloodStock) {
          org.bloodStock.forEach((value, key) => {
            if (value > 0) stock[key] = value;  // only include groups with stock > 0
          });
        }

        const requestedStock = bloodGroup ? (org.bloodStock?.get(bloodGroup) || 0) : null;
        const totalStock     = Object.values(stock).reduce((s, n) => s + n, 0);

        return {
          _id:              org._id,
          organizationName: org.organizationName,
          address:          org.address,
          district:         org.district,
          province:         org.province,
          phone:            org.phone,
          email:            org.email,
          stock,            // e.g. { "O+": 900, "A+": 450 }
          requestedStock,   // ml available for the requested blood group
          totalStock,       // total ml across all groups
        };
      })
      .filter((org) => {
        if (bloodGroup) return org.requestedStock > 0;  // must have that blood group in stock
        return org.totalStock > 0;                       // must have any blood in stock
      })
      .sort((a, b) => {
        if (bloodGroup) return b.requestedStock - a.requestedStock;
        return b.totalStock - a.totalStock;
      });

    res.json({ results });
  } catch (err) {
    console.error("searchBlood error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/search/nearby?lat=...&lng=...&radius=5000&bloodGroup=O+
export const searchNearbyDonors = async (req, res) => {
  try {
    const { lat, lng, radius, bloodGroup } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    const maxDistance = parseInt(radius) || 5000;

    const query = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: maxDistance,
        },
      },
    };
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const donors = await Donor.find(query).select(
      "firstName lastName bloodGroup phone location lastDonationDate donationHistory"
    );

    const results = donors.map((d) => {
      const isEligible = !d.lastDonationDate ||
        Math.floor((new Date() - new Date(d.lastDonationDate)) / 86400000) >= 90;

      const donationCount = d.donationHistory?.length || 0;
      const reliability = donationCount >= 5 ? "high" : donationCount >= 2 ? "medium" : "new";

      return {
        id: d._id,
        name: `${d.firstName} ${d.lastName}`,
        bloodGroup: d.bloodGroup,
        phone: d.phone,
        coordinates: jitterCoordinates(d.location.coordinates),
        isEligible,
        donationCount,
        reliability,
      };
    });

    res.json({ donors: results, count: results.length });
  } catch (err) {
    console.error("searchNearbyDonors error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
// GET /api/search/nearby-orgs?lat=...&lng=...&radius=5000&bloodGroup=O+
export const searchNearbyOrgs = async (req, res) => {
  try {
    const { lat, lng, radius, bloodGroup } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    const maxDistance = parseInt(radius) || 5000;

    const orgs = await Organization.find({
      isActive: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: maxDistance,
        },
      },
    }).select("organizationName address phone bloodStock location");

    const results = orgs
      .map((org) => {
        const stock = {};
        if (org.bloodStock) {
          org.bloodStock.forEach((value, key) => {
            if (value > 0) stock[key] = value;
          });
        }
        const requestedStock = bloodGroup ? (org.bloodStock?.get(bloodGroup) || 0) : null;

        return {
          id: org._id,
          organizationName: org.organizationName,
          address: org.address,
          phone: org.phone,
          coordinates: org.location.coordinates,
          stock,
          requestedStock,
        };
      })
      // .filter((org) => (bloodGroup ? org.requestedStock > 0 : Object.keys(org.stock).length > 0));

    res.json({ organizations: results, count: results.length });
  } catch (err) {
    console.error("searchNearbyOrgs error:", err.message);
    res.status(500).json({ error: err.message });
  }
};