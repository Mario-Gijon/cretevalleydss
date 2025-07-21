import { Schema, model } from "mongoose";
import { Alternative } from "./Alternatives.js";
import { Criterion } from "./Criteria.js";
import { Evaluation } from "./Evaluations.js";
import { Participation } from "./Participations.js";
import { Consensus } from "./Consensus.js";

const issueSchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Usuario creador
  model: { type: Schema.Types.ObjectId, ref: "IssueModel", required: true }, // Modelo DSS asociado
  name: { type: String, required: true, unique: true }, // Nombre del problema
  isConsensus: { type: Boolean, required: true }, // Indica si el modelo es de consenso
  consensusMaxPhases: { type: Number, default: null }, // // Número máximo de rondas de consenso (null si no hay límite).
  consensusThreshold: { type: Number, default: null }, // Umbral de consenso a alcanzar (null si no es un problema de consenso).
  description: { type: String, required: true }, // Descripción detallada
  active: { type: Boolean, default: true }, // Estado del problema (abierto/cerrado)
  creationDate: { type: Date, default: Date.now }, // Fecha de creación
  closureDate: { type: Date, default: null }, // Fecha de cierre opcional
});

// Middleware para eliminar todo lo relacionado con un Issue antes de eliminarlo
issueSchema.pre('remove', async function(next) {
  try {
    // Eliminar alternativas asociadas al Issue
    await Alternative.deleteMany({ issue: this._id });

    // Eliminar criterios asociados al Issue
    await Criterion.deleteMany({ issue: this._id });

    // Obtener alternativas y criterios asociados al Issue
    const alternatives = await Alternative.find({ issue: this._id });
    const criteria = await Criterion.find({ issue: this._id });

    // Eliminar evaluaciones asociadas a las alternativas y criterios
    await Evaluation.deleteMany({
      $or: [
        { alternative: { $in: alternatives.map(a => a._id) } },
        { criterion: { $in: criteria.map(c => c._id) } }
      ]
    });

    // Eliminar participaciones asociadas al Issue
    await Participation.deleteMany({ issue: this._id });

    // Eliminar registros de consenso asociados al Issue
    await Consensus.deleteMany({ issue: this._id });

    // Continuar con la eliminación del Issue
    next();
  } catch (error) {
    next(error); // Enviar el error al manejador de errores de Mongoose
  }
});

// Crear y exportar el modelo
export const Issue = model("Issue", issueSchema);




