
import { Schema, model } from "mongoose";





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
  },
  position: {
    type: Number,
    required: true,
    min: 0,
  },
});

alternativeSchema.index({ issue: 1, position: 1, _id: 1 });

export const Alternative = model("Alternative", alternativeSchema);
