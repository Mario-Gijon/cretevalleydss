
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
});


export const Alternative = model("Alternative", alternativeSchema);