
import { Schema, model } from "mongoose";
import {
  CRITERION_DESCRIPTION_MAX_LENGTH,
  CRITERION_NAME_MAX_LENGTH,
} from "../modules/issues/shared/entityLimits.js";





const criterionSchema = new Schema({
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    required: true,
  },
  parentCriterion: {
    type: Schema.Types.ObjectId,
    ref: "Criterion",
    default: null,
  },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CRITERION_NAME_MAX_LENGTH,
    },
  description: {
    type: String,
    default: null,
    maxlength: CRITERION_DESCRIPTION_MAX_LENGTH,
    },
  type: {
    type: String,
    required: true,
  },
  isLeaf: {
    type: Boolean,
    required: true,
  },
  expressionDomain: {
    type: Schema.Types.ObjectId,
    ref: "IssueExpressionDomain",
    default: null,
  },
  position: {
    type: Number,
    required: true,
    min: 0,
  },
});

criterionSchema.index({ issue: 1, parentCriterion: 1, position: 1, _id: 1 });

export const Criterion = model("Criterion", criterionSchema);
