import BloodRequest from "../models/BloodRequest.js";

// POST /api/requests/create
export const createBloodRequest = async (req, res) => {
  try {
    const {
      requesterName, requesterPhone, bloodGroup, units, urgency,
      hospitalName, hospitalAddress, district, province,
      patientName, condition, preferredMethod, latitude, longitude,
    } = req.body;

    if (!requesterName || !requesterPhone || !bloodGroup || !units || !hospitalName || !hospitalAddress) {
      return res.status(400).json({ error: "Required fields are missing." });
    }

    const request = await BloodRequest.create({
      requesterName, requesterPhone, bloodGroup, units, urgency,
      hospitalName, hospitalAddress, district, province,
      patientName, condition, preferredMethod,
      location: {
        type: "Point",
        coordinates: [longitude || 0, latitude || 0],
      },
    });

    res.status(201).json({ message: "Blood request created.", request });
  } catch (err) {
    console.error("createBloodRequest error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/requests?district=...&province=...
export const getBloodRequests = async (req, res) => {
  try {
    const { district, province, status } = req.query;
    const query = {};
    if (district) query.district = district;
    if (province) query.province = province;
    query.status = status || "open";

    const requests = await BloodRequest.find(query).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};