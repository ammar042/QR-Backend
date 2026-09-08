import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientType: { type: String, enum: ["donor", "organization"], required: true },
    type:          { type: String, default: "badge" }, // expandable later: "low_stock", "new_donor" etc.
    title:         { type: String, required: true },
    message:       { type: String, required: true },
    emoji:         { type: String, default: "🔔" },
    isRead:        { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;