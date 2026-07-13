
import { Schema, model } from "mongoose";
import {
  ALTERNATIVE_DESCRIPTION_MAX_LENGTH,
  ALTERNATIVE_NAME_MAX_LENGTH,
} from "../modules/issues/shared/entityLimits.js";





const alternativeSchema = new Schema({
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    required: true,
  },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: ALTERNATIVE_NAME_MAX_LENGTH,
    },
  description: {
    type: String,
    default: null,
    maxlength: ALTERNATIVE_DESCRIPTION_MAX_LENGTH,
    },
  position: {
    type: Number,
    required: true,
    min: 0,
  },
});

alternativeSchema.index({ issue: 1, position: 1, _id: 1 });

export const Alternative = model("Alternative", alternativeSchema);
