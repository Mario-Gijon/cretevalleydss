
import { Schema, model } from "mongoose";





const notificationSchema = new Schema({
  expert: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    default: null,
  },
  type: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  requiresAction: {
    type: Boolean,
    required: true,
  },
  actionTaken: {
    type: Boolean,
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
  // Workflow notifications are emitted from state transitions. Keeping a
  // stable event key makes retries safe without changing invitation behavior.
  eventKey: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index(
  { expert: 1, issue: 1, eventKey: 1 },
  { unique: true, partialFilterExpression: { eventKey: { $type: "string" } } }
);


export const Notification = model("Notification", notificationSchema);
