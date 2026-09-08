// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import { v4 as uuidv4 } from "uuid";

// const organizationSchema = new mongoose.Schema(
//   {
//     organizationName: { type: String, required: true, trim: true },
//     address:          { type: String, required: true },
//     headName:         { type: String, required: true, trim: true },
//     phone:            { type: String, required: true, unique: true },
//     email:            { type: String, required: true, unique: true, lowercase: true },
//     password:         { type: String, required: true, minlength: 6 },

//     // Unique 6-character code donors use to link to this org
//     orgCode: {
//       type: String,
//       unique: true,
//       default: () => uuidv4().substring(0, 6).toUpperCase(),
//     },

//     isVerified: { type: Boolean, default: false },
//     isActive:   { type: Boolean, default: true },
//     role:       { type: String, default: "organization" },

//     // Donors linked to this organization (array of Donor _id refs)
//     donors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donor" }],
//   },
//   { timestamps: true }
// );

// /* PASSWORD HASH */
// organizationSchema.pre("save", async function () {
//   if (!this.isModified("password")) return;
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// /* PASSWORD COMPARE */
// organizationSchema.methods.comparePassword = async function (entered) {
//   return await bcrypt.compare(entered, this.password);
// };

// const Organization = mongoose.model("Organization", organizationSchema);
// export default Organization;
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const dispenseEntrySchema = new mongoose.Schema({
  bloodGroup:    { type: String },
  units:         { type: Number },
  recipientName: { type: String, default: "Anonymous" },
  date:          { type: String },
}, { _id: false });

const organizationSchema = new mongoose.Schema(
  {
    organizationName: { type: String, required: true, trim: true },
    address:          { type: String, required: true },
    district: { type: String, trim: true },
province: { type: String, trim: true },
    headName:         { type: String, required: true, trim: true },
    phone:            { type: String, required: true, unique: true },
    email:            { type: String, required: true, unique: true, lowercase: true },
    password:         { type: String, required: true, minlength: 6 },

    orgCode: {
      type: String,
      unique: true,
      default: () => uuidv4().substring(0, 6).toUpperCase(),
    },

    isVerified: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },
    role:       { type: String, default: "organization" },

    donors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donor" }],

    // ── Blood stock: { "A+": 450, "O-": 900, ... } in ml ──────────────────
    bloodStock: {
      type: Map,
      of: Number,
      default: {},
    },

    // ── Log of every dispense (blood given to recipients) ──────────────────
    dispenseHistory: [dispenseEntrySchema],
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }
    }
  },
  
  { timestamps: true }
);

organizationSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

organizationSchema.methods.comparePassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

organizationSchema.index({ location: "2dsphere" });

const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;