import { Schema, model } from "mongoose";

/**
 * Criterio perteneciente a un issue.
 *
 * Permite representar tanto criterios raíz como criterios anidados,
 * formando una estructura en árbol. Cada criterio puede ser hoja o no,
 * y puede tener asociado un tipo funcional de evaluación.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece el criterio.
 * - `parentCriterion` -> criterio padre cuando existe jerarquía.
 *
 * Campos principales:
 * - `name`: nombre visible del criterio.
 * - `type`: tipo funcional del criterio.
 * - `isLeaf`: indica si el criterio es hoja y, por tanto, evaluable directamente.
 *
 * Notas de dominio:
 * - La jerarquía se construye mediante `parentCriterion`.
 * - Los criterios hoja suelen usarse como base para pesos y evaluaciones.
 */
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
});

export const Criterion = model("Criterion", criterionSchema);