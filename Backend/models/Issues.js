import { Schema, model } from "mongoose";
import { Alternative } from "./Alternatives.js";
import { Criterion } from "./Criteria.js";
import { Evaluation } from "./Evaluations.js";
import { Participation } from "./Participations.js";
import { Consensus } from "./Consensus.js";

const issueSchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
  model: { type: Schema.Types.ObjectId, ref: "IssueModel", required: true },
  name: { type: String, required: true },
  isConsensus: { type: Boolean, required: true },
  consensusMaxPhases: { type: Number, default: null },
  consensusThreshold: { type: Number, default: null },
  description: { type: String, required: true },
  active: { type: Boolean, default: true },
  creationDate: { type: String, default: null },
  closureDate: { type: String, default: null },
  modelParameters: { type: Schema.Types.Mixed, default: {} },
  currentStage: {
    type: String,
    enum: [
      "criteriaWeighting",      // Los expertos están valorando los criterios
      "weightsFinished",        // Todos los expertos terminaron → admin puede calcular pesos
      "alternativeEvaluation",  // Los expertos evalúan las alternativas
      "finished"
    ],
    default: "criteriaWeighting",
  },
  weightingMode: {
    type: String,
    enum: ["manual", "consensus", "bwm", "consensusBwm", "simulatedConsensusBwm"],
    default: "manual",
  },
  alternativeOrder: [{ type: Schema.Types.ObjectId, ref: "Alternative" }],
  leafCriteriaOrder: [{ type: Schema.Types.ObjectId, ref: "Criterion" }],
});

// Middleware para eliminar todo lo relacionado con un Issue antes de eliminarlo
issueSchema.pre("remove", async function (next) {
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
        { alternative: { $in: alternatives.map((a) => a._id) } },
        { criterion: { $in: criteria.map((c) => c._id) } },
      ],
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

export const Issue = model("Issue", issueSchema);
