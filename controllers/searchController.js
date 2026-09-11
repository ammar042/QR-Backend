import Organization from "../models/Organization.js";
import Donor from "../models/Donor.js";

// Adds a random offset within ~200m so exact home location isn't exposed
function jitterCoordinates([lng, lat], maxMeters = 200) {
  const earthRadius = 6378100;

  const randomDistance = Math.random() * maxMeters;
  const randomAngle = Math.random() * 2 * Math.PI;

  const dLat =
    (randomDistance * Math.cos(randomAngle)) / earthRadius;

  const dLng =
    (randomDistance * Math.sin(randomAngle)) /
    (earthRadius * Math.cos((lat * Math.PI) / 180));

  return [
    lng + (dLng * 180) / Math.PI,
    lat + (dLat * 180) / Math.PI,
  ];
}


// ─────────────────────────────────────────────────────────────
// GET /api/search/blood
// Example:
// /api/search/blood?bloodGroup=O%2B&province=Punjab&district=Lahore
// ─────────────────────────────────────────────────────────────

export const searchBlood = async (req, res) => {
  try {
    const { bloodGroup, province, district } = req.query;

    if (!province || !district) {
      return res.status(400).json({
        error: "Province and district are required.",
      });
    }

    // Normalize values coming from frontend
    const cleanProvince = province.trim();
    const cleanDistrict = district.trim();
    const cleanBloodGroup = bloodGroup?.trim();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("FIND BLOOD SEARCH");
    console.log("Province:", cleanProvince);
    console.log("District:", cleanDistrict);
    console.log("Blood Group:", cleanBloodGroup || "ALL");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");


    // ─────────────────────────────────────────────────────────
    // IMPORTANT:
    // Do NOT filter isActive here.
    //
    // Some existing MongoDB organizations may not have
    // isActive saved because they were created before the field
    // was added.
    //
    // This query therefore accepts:
    //   isActive: true
    //   OR isActive does not exist
    // ─────────────────────────────────────────────────────────

    const orgs = await Organization.find({
      $and: [
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } },
          ],
        },

        {
          $or: [
            {
              province: {
                $regex: `^${escapeRegex(cleanProvince)}$`,
                $options: "i",
              },
              district: {
                $regex: `^${escapeRegex(cleanDistrict)}$`,
                $options: "i",
              },
            },

            // Fallback:
            // If province/district fields are missing,
            // search district inside address.
            {
              address: {
                $regex: escapeRegex(cleanDistrict),
                $options: "i",
              },
            },
          ],
        },
      ],
    }).select(
      "-password -donors"
    );


    console.log("Organizations found:", orgs.length);


    // ─────────────────────────────────────────────────────────
    // Convert stock safely
    // Supports Mongoose Map as well as plain JS object.
    // ─────────────────────────────────────────────────────────

    const results = orgs
      .map((org) => {

        let stock = {};

        // Mongoose Map
        if (
          org.bloodStock &&
          typeof org.bloodStock.forEach === "function"
        ) {
          org.bloodStock.forEach((value, key) => {
            const amount = Number(value) || 0;

            if (amount > 0) {
              stock[String(key).trim()] = amount;
            }
          });
        }

        // Plain object fallback
        else if (
          org.bloodStock &&
          typeof org.bloodStock === "object"
        ) {
          Object.entries(org.bloodStock).forEach(
            ([key, value]) => {
              const amount = Number(value) || 0;

              if (amount > 0) {
                stock[String(key).trim()] = amount;
              }
            }
          );
        }


        // ─────────────────────────────────────────────────────
        // Requested blood group stock
        // Case-insensitive lookup
        // ─────────────────────────────────────────────────────

        let requestedStock = 0;

        if (cleanBloodGroup) {
          const requestedKey = Object.keys(stock).find(
            (key) =>
              key.toLowerCase() ===
              cleanBloodGroup.toLowerCase()
          );

          if (requestedKey) {
            requestedStock = Number(stock[requestedKey]) || 0;
          }
        }


        // Total available stock
        const totalStock = Object.values(stock).reduce(
          (total, amount) => total + (Number(amount) || 0),
          0
        );


        console.log(
          org.organizationName,
          "|",
          org.province,
          "|",
          org.district,
          "| STOCK:",
          stock,
          "| REQUESTED:",
          requestedStock
        );


        return {
          _id: org._id,

          organizationName:
            org.organizationName || "Blood Bank",

          address:
            org.address || "",

          district:
            org.district || "",

          province:
            org.province || "",

          phone:
            org.phone || "",

          email:
            org.email || "",

          stock,

          requestedStock,

          totalStock,
        };
      })


      // ─────────────────────────────────────────────────────────
      // Only show organizations that actually have stock.
      // ─────────────────────────────────────────────────────────

      .filter((org) => {

        if (cleanBloodGroup) {
          return org.requestedStock > 0;
        }

        return org.totalStock > 0;
      })


      // ─────────────────────────────────────────────────────────
      // Highest available stock first
      // ─────────────────────────────────────────────────────────

      .sort((a, b) => {

        if (cleanBloodGroup) {
          return (
            b.requestedStock -
            a.requestedStock
          );
        }

        return (
          b.totalStock -
          a.totalStock
        );
      });


    console.log(
      "FINAL RESULTS:",
      results.length
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");


    return res.json({
      success: true,
      count: results.length,
      results,
    });

  } catch (err) {

    console.error(
      "searchBlood error:",
      err
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


// ─────────────────────────────────────────────────────────────
// Escape special regex characters
// ─────────────────────────────────────────────────────────────

function escapeRegex(value = "") {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


// ─────────────────────────────────────────────────────────────
// GET /api/search/nearby
// ─────────────────────────────────────────────────────────────

export const searchNearbyDonors = async (req, res) => {
  try {

    const {
      lat,
      lng,
      radius,
      bloodGroup,
    } = req.query;


    if (!lat || !lng) {
      return res.status(400).json({
        error:
          "Latitude and longitude are required.",
      });
    }


    const maxDistance =
      parseInt(radius) || 5000;


    const query = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              parseFloat(lng),
              parseFloat(lat),
            ],
          },

          $maxDistance: maxDistance,
        },
      },
    };


    if (bloodGroup) {
      query.bloodGroup =
        bloodGroup.trim();
    }


    const donors =
      await Donor.find(query).select(
        "firstName lastName bloodGroup phone location lastDonationDate donationHistory"
      );


    const results = donors.map((d) => {

      const isEligible =
        !d.lastDonationDate ||
        Math.floor(
          (new Date() -
            new Date(d.lastDonationDate)) /
            86400000
        ) >= 90;


      const donationCount =
        d.donationHistory?.length || 0;


      const reliability =
        donationCount >= 5
          ? "high"
          : donationCount >= 2
          ? "medium"
          : "new";


      return {
        id: d._id,

        name:
          `${d.firstName} ${d.lastName}`,

        bloodGroup:
          d.bloodGroup,

        phone:
          d.phone,

        coordinates:
          jitterCoordinates(
            d.location.coordinates
          ),

        isEligible,

        donationCount,

        reliability,
      };
    });


    return res.json({
      donors: results,
      count: results.length,
    });

  } catch (err) {

    console.error(
      "searchNearbyDonors error:",
      err.message
    );

    return res.status(500).json({
      error: err.message,
    });
  }
};


// ─────────────────────────────────────────────────────────────
// GET /api/search/nearby-orgs
// ─────────────────────────────────────────────────────────────

export const searchNearbyOrgs = async (req, res) => {
  try {

    const {
      lat,
      lng,
      radius,
      bloodGroup,
    } = req.query;


    if (!lat || !lng) {
      return res.status(400).json({
        error:
          "Latitude and longitude are required.",
      });
    }


    const maxDistance =
      parseInt(radius) || 5000;


    const orgs =
      await Organization.find({

        $or: [
          { isActive: true },
          { isActive: { $exists: false } },
        ],

        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [
                parseFloat(lng),
                parseFloat(lat),
              ],
            },

            $maxDistance: maxDistance,
          },
        },

      }).select(
        "organizationName address phone bloodStock location"
      );


    const results = orgs
      .map((org) => {

        const stock = {};


        if (
          org.bloodStock &&
          typeof org.bloodStock.forEach ===
            "function"
        ) {

          org.bloodStock.forEach(
            (value, key) => {

              const amount =
                Number(value) || 0;

              if (amount > 0) {
                stock[key] = amount;
              }
            }
          );
        }


        let requestedStock = 0;


        if (bloodGroup) {

          const requestedKey =
            Object.keys(stock).find(
              (key) =>
                key.toLowerCase() ===
                bloodGroup
                  .trim()
                  .toLowerCase()
            );


          if (requestedKey) {
            requestedStock =
              Number(stock[requestedKey]) || 0;
          }
        }


        return {

          id: org._id,

          organizationName:
            org.organizationName,

          address:
            org.address,

          phone:
            org.phone,

          coordinates:
            org.location?.coordinates || null,

          stock,

          requestedStock,
        };
      })

      .filter((org) => {

        if (bloodGroup) {
          return org.requestedStock > 0;
        }

        return (
          Object.keys(org.stock).length > 0
        );
      });


    return res.json({
      organizations: results,
      count: results.length,
    });

  } catch (err) {

    console.error(
      "searchNearbyOrgs error:",
      err.message
    );

    return res.status(500).json({
      error: err.message,
    });
  }
};