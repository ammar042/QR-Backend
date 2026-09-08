import mongoose from "mongoose";

const bloodRequestSchema = new mongoose.Schema(
  {
    requesterName:  { type: String, required: true },
    requesterPhone: { type: String, required: true },
    bloodGroup:     { type: String, required: true },
    units:          { type: Number, required: true },
    urgency:        { type: String, enum: ["routine", "urgent", "emergency"], default: "routine" },
    hospitalName:   { type: String, required: true },
    hospitalAddress:{ type: String, required: true },
    district:       { type: String },
    province:       { type: String },
    patientName:    { type: String },
    condition:      { type: String },
    preferredMethod:{ type: String, enum: ["in-hospital", "blood-bank"], default: "in-hospital" },
    status:         { type: String, enum: ["open", "fulfilled", "cancelled"], default: "open" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

bloodRequestSchema.index({ location: "2dsphere" });

const BloodRequest = mongoose.model("BloodRequest", bloodRequestSchema);
export default BloodRequest;