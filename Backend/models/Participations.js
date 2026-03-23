import { Schema, model } from "mongoose";

const participationSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    expert: { type: Schema.Types.ObjectId, ref: "User", required: true },

    invitationStatus: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      required: true,
    },

    evaluationCompleted: { type: Boolean, default: false },
    weightsCompleted: { type: Boolean, default: false },

    entryPhase: { type: Number, default: null },
    entryStage: {
      type: String,
      enum: ["criteriaWeighting", "alternativeEvaluation", null],
      default: null,
    },

    joinedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

participationSchema.index({ issue: 1, expert: 1 }, { unique: true });

export const Participation = model("Participation", participationSchema);