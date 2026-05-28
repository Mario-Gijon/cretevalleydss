
import { Schema, model } from "mongoose";
import { orderedNumericArrayValidator } from "./validators/orderedNumericArrayValidator.js";



const expressionDomainSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  isGlobal: {
    type: Boolean,
    default: false,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ["numeric", "linguistic"],
    required: true,
  },

  numericRange: {
    min: { type: Number },
    max: { type: Number },
    step: {
      type: Number,
      default: null,
      validate: {
        validator: (value) => value == null || (Number.isFinite(value) && value > 0),
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

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

expressionDomainSchema.index(
  { user: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);

expressionDomainSchema.index(
  { isGlobal: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isGlobal: true },
  }
);

export const ExpressionDomain = model("ExpressionDomain", expressionDomainSchema);
