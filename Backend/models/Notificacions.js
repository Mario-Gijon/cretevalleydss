import { Schema, model } from "mongoose";

const notificationSchema = new Schema({
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true },
  issue: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
  type: { type: String, required: true },
  message: { type: String, required: true },
  requiresAction: { type: Boolean, required: true },
  actionTaken: { type: Boolean, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = model("Notification", notificationSchema);