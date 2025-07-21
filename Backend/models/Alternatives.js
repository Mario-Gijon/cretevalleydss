import { Schema, model } from "mongoose";

// Alternativa dentro de un problema
const alternativeSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true }, // Problema asociado
  name: { type: String, required: true }, // Nombre de la alternativa
});

export const Alternative = model("Alternative", alternativeSchema);
