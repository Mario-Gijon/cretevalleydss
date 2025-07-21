import { Schema, model } from "mongoose";

const exitUserIssueSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  phase: { type: Number, default: null },
  reason: { type: String, default: null }, // Motivo por el cual se oculta el issue para el usuario
  hidden: { type: Boolean, default: false },
  history: {
    type: [
      {
        timestamp: { type: Date, default: Date.now, required: true },
        phase: { type: Number, default: null },
        reason: { type: String, required: true, default: null }
      }
    ],
    default: null
  },

}, {
  timestamps: true // createdAt, updatedAt automáticos
});

// Evita duplicaciones (un solo registro por user-issue)
exitUserIssueSchema.index({ user: 1, issue: 1 }, { unique: true });

export const ExitUserIssue = model("ExitUserIssue", exitUserIssueSchema);
