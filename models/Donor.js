import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const donorSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  phone:     { type: String, required: true, unique: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6 },

  address:   String,
  age:       Number,
  bloodGroup:String,
  district:  String,
  province:  String,
  pincode:   String,
  agreedToTerms: Boolean,

  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
  role:       { type: String, default: "donor" },

  // ── UPDATED: Multiple org links ──────────────────────────────────────────
  linkedOrganizations: [
    {
      organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
      orgCode:      { type: String },
      joinedAt:     { type: Date, default: Date.now },
    }
  ],

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },

  // ── Donation fields ──────────────────────────────────────────────────────
  lastDonationDate: { type: String },
  donationHistory: [
    {
      date:     { type: String },
      units:    { type: Number },
      location: { type: String },
      orgId:    { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
      orgName:  { type: String, default: "" },
    }
  ],

  // ── Health fields ────────────────────────────────────────────────────────
  healthIssues:       { type: String, default: "None" },
  currentMedications: { type: String, default: "None" },
  recentSurgery:      { type: String, enum: ["Yes", "No"], default: "No" },
  smoker:             { type: String, enum: ["Yes", "No"], default: "No" },
  alcoholic:          { type: String, enum: ["Yes", "No"], default: "No" },
  allergies:          { type: String, default: "None" },

}, { timestamps: true });

donorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

donorSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

donorSchema.virtual("isEligible").get(function () {
  if (!this.lastDonationDate) return true;
  const diff = Math.floor((new Date() - new Date(this.lastDonationDate)) / 86400000);
  return diff >= 90;
});

donorSchema.virtual("daysUntilEligible").get(function () {
  if (!this.lastDonationDate) return 0;
  const diff = Math.floor((new Date() - new Date(this.lastDonationDate)) / 86400000);
  return diff >= 90 ? 0 : 90 - diff;
});

donorSchema.set("toJSON", { virtuals: true });
donorSchema.index({ location: "2dsphere" });

const Donor = mongoose.model("Donor", donorSchema);
export default Donor;