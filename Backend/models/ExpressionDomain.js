import { Schema, model } from "mongoose";

const orderedNumericArrayValidator = {
  validator: (arr) =>
    Array.isArray(arr) &&
    arr.length >= 2 &&
    arr.every((value) => typeof value === "number" && Number.isFinite(value)) &&
    arr.every((value, index) => index === 0 || arr[index - 1] <= value),
  message: "values must be an ordered numeric array with at least 2 elements",
};

const expressionDomainSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  name: { type: String, required: true, trim: true },
  isGlobal: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  type: { type: String, enum: ["numeric", "linguistic"], required: true },

  numericRange: {
    min: { type: Number },
    max: { type: Number },
  },

  linguisticLabels: [
    {
      label: { type: String, required: true, trim: true },
      values: {
        type: [Number],
        validate: orderedNumericArrayValidator,
      },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

expressionDomainSchema.index(
  { user: 1, name: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);

expressionDomainSchema.index(
  { isGlobal: 1, name: 1 },
  { unique: true, partialFilterExpression: { isGlobal: true } }
);

export const ExpressionDomain = model("ExpressionDomain", expressionDomainSchema);