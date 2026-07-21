import { Schema, model } from "mongoose";

const issueExpressionDomainSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    sourceDomain: {
      type: Schema.Types.ObjectId,
      ref: "ExpressionDomain",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    typeKey: {
      type: String,
      required: true,
      trim: true,
    },
    definition: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

issueExpressionDomainSchema.index(
  { issue: 1, sourceDomain: 1 },
  { unique: true }
);

export const IssueExpressionDomain = model(
  "IssueExpressionDomain",
  issueExpressionDomainSchema
);
