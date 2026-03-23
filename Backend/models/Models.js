import { Schema, model } from "mongoose";

const parameterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["number", "array", "fuzzyArray"], required: true },
  default: { type: Schema.Types.Mixed },
  restrictions: {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    step: { type: Number, default: null },
    length: { type: Schema.Types.Mixed, default: null },
    sum: { type: Number, default: null },
    allowed: { type: [Schema.Types.Mixed], default: null },
  },
});

parameterSchema.path("default").validate(function (value) {
  const restrictions = this.restrictions;

  if (this.type === "array" && restrictions?.length === 2) {
    if (!Array.isArray(value) || value.length !== 2) {
      return false;
    }

    if (value[0] >= value[1]) {
      return false;
    }

    if (
      restrictions.min !== null &&
      (value[0] < restrictions.min || value[1] < restrictions.min)
    ) {
      return false;
    }

    if (
      restrictions.max !== null &&
      (value[0] > restrictions.max || value[1] > restrictions.max)
    ) {
      return false;
    }
  }

  if (restrictions?.allowed) {
    if (!restrictions.allowed.includes(value)) {
      return false;
    }
  }

  return true;
}, "Valor inválido para el parámetro según sus restricciones");

const issueModelSchema = new Schema({
  name: { type: String, required: true },
  isConsensus: { type: Boolean, required: true },
  isPairwise: { type: Boolean, required: true },
  isMultiCriteria: { type: Boolean, required: true },
  smallDescription: { type: String, required: true },
  extendDescription: { type: String, required: true },
  moreInfoUrl: { type: String, required: true },
  parameters: [parameterSchema],
  supportedDomains: {
    numeric: {
      enabled: { type: Boolean, default: false },
      range: {
        min: { type: Number, default: null },
        max: { type: Number, default: null },
      },
    },
    linguistic: {
      enabled: { type: Boolean, default: false },
      minLabels: { type: Number, default: null },
      maxLabels: { type: Number, default: null },
      oddOnly: { type: Boolean, default: false },
    },
  },
});

export const IssueModel = model("IssueModel", issueModelSchema);