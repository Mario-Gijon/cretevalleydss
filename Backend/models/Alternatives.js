import { Schema, model } from "mongoose";

/**
 * Alternativa perteneciente a un issue.
 *
 * Representa una de las opciones que serán evaluadas dentro de un problema
 * de decisión.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece la alternativa.
 *
 * Campos principales:
 * - `name`: nombre visible de la alternativa.
 *
 * Notas de dominio:
 * - El orden estable de visualización o procesamiento no se guarda aquí,
 *   sino en `Issue.alternativeOrder`.
 */
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