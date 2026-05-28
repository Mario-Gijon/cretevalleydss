
import { Schema, model } from "mongoose";





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
});


export const Criterion = model("Criterion", criterionSchema);
