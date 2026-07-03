import { Schema, model } from "mongoose";

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
  typeKey: {
    type: String,
    required: true,
    trim: true,
  },
  family: {
    type: String,
    required: true,
    trim: true,
  },
  definition: {
    type: Schema.Types.Mixed,
    default: {},
  },
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
