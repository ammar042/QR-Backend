import Donor from "../models/Donor.js";
import Organization from "../models/Organization.js";
import Notification from "../models/Notification.js";

export const registerDonor = async (req, res) => {
  try {
    const donor = new Donor(req.body);
    const savedDonor = await donor.save();
    res.status(201).json({ message: "Donor registered successfully", donor: savedDonor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDonors = async (req, res) => {
  try {
    const donors = await Donor.find();
    res.json(donors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findById(req.userId)
      .select("-password")
      .populate("linkedOrganizations.organization", "organizationName address phone orgCode");

    if (!donor) return res.status(404).json({ error: "Donor not found." });
    res.json(donor.toJSON());
  } catch {
    res.status(500).json({ error: "Server error." });
  }
};

export const updateDonorLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body;
    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({ error: "Longitude and latitude are required." });
    }
    await Donor.findByIdAndUpdate(req.userId, {
      location: { type: "Point", coordinates: [longitude, latitude] },
    });
    res.json({ message: "Location updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDonorProfile = async (req, res) => {
  try {
    const {
      firstName, lastName, phone, email, address,
      age, bloodGroup, district, province, pincode,
      lastDonationDate,
      healthIssues, currentMedications, recentSurgery,
      smoker, alcoholic, allergies,
      organizationCode,
    } = req.body;

    const donor = await Donor.findById(req.userId);
    if (!donor) return res.status(404).json({ error: "Donor not found." });

    // ── Handle new org code — add to linkedOrganizations if not already there ──
    if (organizationCode) {
      const code = organizationCode.toUpperCase();
      const alreadyLinked = donor.linkedOrganizations.some(
        (l) => l.orgCode === code
      );

      if (!alreadyLinked) {
        const org = await Organization.findOne({ orgCode: code });
        if (!org) return res.status(400).json({ error: "Invalid organization code. Please check and try again." });

        // Add donor to org's donors array if not already there
        if (!org.donors.map(String).includes(donor._id.toString())) {
          org.donors.push(donor._id);
          await org.save();
        }

        // Add org to donor's linkedOrganizations
        donor.linkedOrganizations.push({
          organization: org._id,
          orgCode: code,
        });

        // ── Notify the organization ──
        await Notification.create({
          recipientId:   org._id,
          recipientType: "organization",
          type:          "new_donor",
          title:         "New Donor Linked",
          message:       `${donor.firstName} ${donor.lastName} (${donor.bloodGroup || "Unknown"}) has linked to your organization.`,
          emoji:         "👤",
          isRead:        false,
        });
      }
    }

    // Apply other profile updates
    Object.assign(donor, {
      firstName, lastName, phone, email, address,
      age, bloodGroup, district, province, pincode,
      lastDonationDate,
      healthIssues, currentMedications, recentSurgery,
      smoker, alcoholic, allergies,
    });

    await donor.save();

    const updated = await Donor.findById(donor._id)
      .select("-password")
      .populate("linkedOrganizations.organization", "organizationName address phone orgCode");

    res.json(updated.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};