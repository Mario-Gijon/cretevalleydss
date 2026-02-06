import { Schema, model } from "mongoose";

// Definir el esquema del modelo
const parameterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["number", "array", "fuzzyArray"], required: true },
  default: { type: Schema.Types.Mixed },
  restrictions: {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    step: { type: Number, default: null },
    length: { type: Schema.Types.Mixed, default: null }, // número o string "matchCriteria"
    sum: { type: Number, default: null }, // si necesitas que sumen exactamente 1
    allowed: { type: [Schema.Types.Mixed], default: null } // valores específicos permitidos
  }
});

// Validador custom para parámetros
parameterSchema.path("default").validate(function (value) {
  const restrictions = this.restrictions;

  // Validar arrays tipo intervalo [min, max]
  if (this.type === "array" && restrictions?.length === 2) {
    if (!Array.isArray(value) || value.length !== 2) {
      return false;
    }
    if (value[0] >= value[1]) {
      return false; // izquierda < derecha
    }
    if (restrictions.min !== null && (value[0] < restrictions.min || value[1] < restrictions.min)) {
      return false;
    }
    if (restrictions.max !== null && (value[0] > restrictions.max || value[1] > restrictions.max)) {
      return false;
    }
  }

  // Validar valores permitidos (allowed)
  if (restrictions?.allowed) {
    if (!restrictions.allowed.includes(value)) {
      return false;
    }
  }

  return true;
}, "Valor inválido para el parámetro según sus restricciones");


// Modelo principal
const issueModelSchema = new Schema({
  name: { type: String, required: true },
  isConsensus: { type: Boolean, required: true },
  isPairwise: { type: Boolean, required: true },
  isMultiCriteria: { type: Boolean, required: true },
  smallDescription: { type: String, required: true },
  extendDescription: { type: String, required: true },
  moreInfoUrl: { type: String, required: true },
  parameters: [parameterSchema],
  supportedDomains: {
    numeric: {
      enabled: { type: Boolean, default: false },
      range: {
        min: { type: Number, default: null },
        max: { type: Number, default: null }
      }
    },
    linguistic: {
      enabled: { type: Boolean, default: false },
      minLabels: { type: Number, default: null },
      maxLabels: { type: Number, default: null },
      oddOnly: { type: Boolean, default: false }
    }
  }
});

export const IssueModel = model("IssueModel", issueModelSchema);

const issueModels = [
  {
    name: "TOPSIS",
    isConsensus: false,
    isPairwise: false,
    isMultiCriteria: true,
    smallDescription:
      "Based on the idea that the selected alternative should have the shortest distance from the positive-ideal solution and the longest distance from the negative-ideal solution",
    extendDescription:
      "The TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) model is a multi-criteria decision-making (MCDM) technique...",
    moreInfoUrl: "https://ejemplo.com/topsis",
    parameters: [
      {
        name: "weights",
        type: "array",
        restrictions: { min: 0, max: 1, length: "matchCriteria", sum: 1 }
      }
    ],
    supportedDomains: {
      numeric: { enabled: true, range: { min: 0, max: 1 } },
      linguistic: { enabled: false }
    }
  },
  {
    name: "Herrera Viedma CRP",
    isConsensus: true,
    isPairwise: true,
    isMultiCriteria: false,
    smallDescription: "Modelo de consenso de Herrera-Viedma CRP.",
    extendDescription:
      "Herrera-Viedma CRP es un método de consenso en grupos de decisión multicriterio...",
    moreInfoUrl: "https://ejemplo.com/herrera-viedma-crp",
    parameters: [
      { name: "ag_lq", type: "array", default: [0.3, 0.8], restrictions: { min: 0, max: 1, length: 2 } },
      { name: "ex_lq", type: "array", default: [0.5, 1.0], restrictions: { min: 0, max: 1, length: 2 } },
      { name: "b", type: "number", default: 1.0, restrictions: { allowed: [0.5, 0.7, 0.9, 1.0] } },
      { name: "beta", type: "number", default: 0.8, restrictions: { min: 0, max: 1 } }
    ],
    supportedDomains: {
      numeric: { enabled: true },
      linguistic: { enabled: false }
    }
  },
  {
    name: "BORDA",
    isConsensus: false,
    isPairwise: false,
    isMultiCriteria: true, 
    smallDescription:
      "Preference voting system where voters rank options, and each ranked option receives points based on its position",
    extendDescription: "Borda",
    moreInfoUrl: "https://ejemplo.com/borda",
    parameters: [],
    supportedDomains: {
      numeric: { enabled: true, range: { min: 0, max: 1 } },
      linguistic: { enabled: false }
    }
  },
  {
    name: "ARAS",
    isConsensus: false,
    isPairwise: false,
    isMultiCriteria: true,
    smallDescription:
      "Additive Ratio Assessment. Technique developed by Zavadskas and Turskis...",
    extendDescription:
      "The Additive Ratio Assessment (ARAS) method is a multi-criteria decision-making (MCDM) technique...",
    moreInfoUrl: "https://ejemplo.com/aras",
    parameters: [
      {
        name: "weights",
        type: "array",
        restrictions: { min: 0, max: 1, length: "matchCriteria", sum: 1 }
      }
    ],
    supportedDomains: {
      numeric: { enabled: true, range: { min: 0, max: 1 } },
      linguistic: { enabled: false }
    }
  },
  {
    name: "Fuzzy TOPSIS",
    isConsensus: false,
    isPairwise: false,
    isMultiCriteria: true,
    smallDescription:
      "Extension of TOPSIS using fuzzy numbers to better capture uncertainty in evaluations.",
    extendDescription:
      "Fuzzy TOPSIS integrates fuzzy set theory with the classical TOPSIS method...",
    moreInfoUrl: "https://ejemplo.com/fuzzy-topsis",
    parameters: [
      {
        name: "weights",
        type: "fuzzyArray",
        restrictions: {
          length: "matchCriteria",
          triple: true,
          min: 0,
          max: 1
        }
      }
    ],
    supportedDomains: {
      numeric: { enabled: false },
      linguistic: { enabled: true, minLabels: 3, maxLabels: 9, oddOnly: true }
    }
  }
];




const seedDB = async () => {
  try {
    // Eliminar documentos anteriores (opcional)
    await IssueModel.deleteMany({});
    console.log("Modelos antiguos eliminados");

    // Insertar nuevos datos
    await IssueModel.insertMany(issueModels);
    console.log("Modelos insertados correctamente");


  } catch (error) {
    console.error("Error al insertar los modelos:", error);

  }
};

// Ejecutar el script
/* seedDB(); */
