import { Schema, model } from "mongoose";

const exitUserIssueSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    hidden: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now, required: true },
    phase: { type: Number, default: null },
    stage: {
      type: String,
      enum: ["criteriaWeighting", "alternativeEvaluation", null],
      default: null,
    },
    reason: { type: String, default: null },

    history: {
      type: [
        {
          timestamp: { type: Date, default: Date.now, required: true },
          phase: { type: Number, default: null },
          stage: {
            type: String,
            enum: ["criteriaWeighting", "alternativeEvaluation", null],
            default: null,
          },
          action: {
            type: String,
            enum: ["entered", "exited"],
            required: true,
          },
          reason: { type: String, default: null },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

exitUserIssueSchema.index({ user: 1, issue: 1 }, { unique: true });

export const ExitUserIssue = model("ExitUserIssue", exitUserIssueSchema);