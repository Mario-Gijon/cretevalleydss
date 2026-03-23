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
      default: null,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["numeric", "linguistic"], required: true },

    numericRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },

    linguisticLabels: [
      {
        label: { type: String, required: true },
        values: {
          type: [Number],
          validate: {
            validator: (arr) =>
              Array.isArray(arr) &&
              arr.length >= 2 &&
              arr.every((value) => Number.isFinite(value)) &&
              arr.every((value, index) => index === 0 || arr[index - 1] <= value),
            message: "values must be an ordered numeric array with at least 2 elements",
          },
        },
      },
    ],
  },
  { timestamps: true }
);

issueExpressionDomainSchema.index({ issue: 1, sourceDomain: 1 }, { unique: true });

export const IssueExpressionDomain = model(
  "IssueExpressionDomain",
  issueExpressionDomainSchema
);