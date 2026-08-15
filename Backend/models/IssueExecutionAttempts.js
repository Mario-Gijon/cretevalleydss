import { Schema, model } from "mongoose";

const issueExecutionAttemptSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", default: null, index: true },
  scope: { type: String, enum: ["issueCreation", "issueStage", "scenario"], required: true },
  actorType: { type: String, enum: ["user", "system"], required: true },
  actorUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
  correlationId: { type: String, required: true, trim: true, index: true },
  evaluationStage: { type: String, enum: ["criteriaWeighting", "alternativeEvaluation", null], default: null },
  issueStage: { type: String, enum: ["criteriaWeighting", "weightsFinished", "alternativeEvaluation", "finished", null], default: null },
  consensusPhase: { type: Number, min: 0, default: null },
  modelContext: { type: Schema.Types.Mixed, required: true },
  request: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["running", "succeeded", "failed"], required: true, default: "running" },
  failureStage: { type: String, enum: ["transport", "responseEnvelope", "normalization", null], default: null },
  startedAt: { type: Date, required: true }, responseReceivedAt: { type: Date, default: null }, completedAt: { type: Date, default: null },
  durationMs: { type: Number, min: 0, default: null }, transportDurationMs: { type: Number, min: 0, default: null },
  response: { type: Schema.Types.Mixed, default: null }, normalizedResult: { type: Schema.Types.Mixed, default: null }, error: { type: Schema.Types.Mixed, default: null },
  application: { type: Schema.Types.Mixed, required: true, default: () => ({ status: "pending", completedAt: null, entityType: null, entityId: null, resultSnapshot: null, error: null }) },
  schemaVersion: { type: Number, required: true, default: 1 },
}, { timestamps: true, minimize: false });
issueExecutionAttemptSchema.index({ issue: 1, startedAt: 1, _id: 1 });
issueExecutionAttemptSchema.index({ issue: 1, evaluationStage: 1, consensusPhase: 1, startedAt: 1, _id: 1 });
issueExecutionAttemptSchema.index({ status: 1, startedAt: 1 });
issueExecutionAttemptSchema.index({ scope: 1, startedAt: 1 });
issueExecutionAttemptSchema.path("actorUser").validate(function(v) { return this.actorType === "user" ? v != null : v == null; }, "actorUser is inconsistent with actorType");
export const IssueExecutionAttempt = model("IssueExecutionAttempt", issueExecutionAttemptSchema);
