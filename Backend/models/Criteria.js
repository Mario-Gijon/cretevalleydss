import { Schema, model } from "mongoose";

// Criterio de evaluación dentro de un problema
const criterionSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true }, // Problema asociado
  parentCriterion: { type: Schema.Types.ObjectId, ref: "Criterion", default: null }, // Criterio padre (jerarquía)
  name: { type: String, required: true }, // Nombre del criterio
  type: { type: String, required: true }, // Tipo de criterio
  isLeaf: { type: Boolean, required: true }, // Indica si es un criterio final o compuesto
});

export const Criterion = model("Criterion", criterionSchema);