import { Schema, model } from "mongoose";

const issueStateSnapshotSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
  snapshotType: { type: String, enum: ["creation", "consensusPhaseStart"], required: true },
  stage: { type: String, enum: ["criteriaWeighting", "weightsFinished", "alternativeEvaluation", "finished"], required: true },
  consensusPhase: { type: Number, required: true, min: 0 },
  occurredAt: { type: Date, required: true },
  correlationId: { type: String, required: true, trim: true },
  sourceEvent: { type: Schema.Types.ObjectId, ref: "IssueEvent", default: null },
  sourceExecutionAttempt: { type: Schema.Types.ObjectId, ref: "IssueExecutionAttempt", default: null },
  state: { type: Schema.Types.Mixed, required: true },
  schemaVersion: { type: Number, required: true, default: 1 },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });
issueStateSnapshotSchema.index({ issue: 1, occurredAt: 1, _id: 1 });
issueStateSnapshotSchema.index({ issue: 1, snapshotType: 1, consensusPhase: 1 }, { unique: true });
export const IssueStateSnapshot = model("IssueStateSnapshot", issueStateSnapshotSchema);
