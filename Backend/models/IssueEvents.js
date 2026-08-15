import { Schema, model } from "mongoose";

const issueEventSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
    eventType: { type: String, required: true, trim: true, index: true },
    actorType: { type: String, enum: ["user", "system"], required: true },
    actorUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subjectUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    entityType: { type: String, default: null, trim: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    stage: {
      type: String,
      enum: ["criteriaWeighting", "weightsFinished", "alternativeEvaluation", "finished", null],
      default: null,
    },
    phase: { type: Number, min: 0, default: null },
    occurredAt: { type: Date, required: true },
    correlationId: { type: String, required: true, trim: true },
    reason: { type: String, default: null, trim: true },
    previousState: { type: Schema.Types.Mixed, default: null },
    nextState: { type: Schema.Types.Mixed, default: null },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
    schemaVersion: { type: Number, required: true, min: 1, default: 1 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false,
  }
);

issueEventSchema.path("actorUser").validate(function validateActorUser(value) {
  return this.actorType === "user" ? value != null : value == null;
}, "actorUser must be present for a user actor and null for a system actor");

issueEventSchema.index({ issue: 1, occurredAt: 1, _id: 1 });
issueEventSchema.index({ issue: 1, eventType: 1, occurredAt: 1, _id: 1 });
issueEventSchema.index({ issue: 1, subjectUser: 1, occurredAt: 1, _id: 1 });
issueEventSchema.index({ correlationId: 1 });

export const IssueEvent = model("IssueEvent", issueEventSchema);
