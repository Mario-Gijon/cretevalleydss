import { Schema, model } from "mongoose";

const expressionDomainSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

expressionDomainSchema.index(
  { owner: 1, name: 1 },
  {
    unique: true,
    name: "expression_domain_owner_name_unique",
    partialFilterExpression: { owner: { $type: "objectId" } },
  }
);

expressionDomainSchema.index(
  { name: 1 },
  {
    unique: true,
    name: "expression_domain_global_name_unique",
    partialFilterExpression: { owner: null },
  }
);

export const ExpressionDomain = model("ExpressionDomain", expressionDomainSchema);
