
import { Schema, model } from "mongoose";
import { orderedNumericArrayValidator } from "./validators/orderedNumericArrayValidator.js";





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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["numeric", "linguistic"],
      required: true,
    },

    numericRange: {
      min: {
        type: Number,
        default: null,
      },
      max: {
        type: Number,
        default: null,
      },
      step: {
        type: Number,
        default: null,
        validate: {
          validator: (value) =>
            value == null || (Number.isFinite(value) && value > 0),
          message: "numericRange.step must be null or a positive number",
        },
      },
    },

    membershipFunction: {
      type: String,
      trim: true,
      default: null,
      required() {
        return this.type === "linguistic";
      },
    },
    valueCount: {
      type: Number,
      default: null,
      required() {
        return this.type === "linguistic";
      },
    },
    valuesMode: {
      type: String,
      enum: ["automatic", "custom"],
      default: null,
      required() {
        return this.type === "linguistic";
      },
    },

    linguisticLabels: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        values: {
          type: [Number],
          validate: orderedNumericArrayValidator,
        },
      },
    ],
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
