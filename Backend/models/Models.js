import { Schema, model } from "mongoose";

// Definir el esquema del modelo
const parameterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["number", "array"], required: true },
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

  // Validar que la suma sea igual a restrictions.sum
  if (this.type === "array" && restrictions?.sum !== null) {
    const sum = value.reduce((acc, v) => acc + v, 0);
    if (Math.abs(sum - restrictions.sum) > 1e-9) { // tolerancia flotante
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
  smallDescription: { type: String, required: true },
  extendDescription: { type: String, required: true },
  moreInfoUrl: { type: String, required: true },
  parameters: [parameterSchema]
});

export const IssueModel = model("IssueModel", issueModelSchema);

/* const issueModels = [
  {
    name: "TOPSIS",
    isConsensus: false,
    isPairwise: false,
    smallDescription: "Método para ordenación por similitud a la solución ideal.",
    extendDescription:
      "TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) es un método de decisión multicriterio que ayuda a clasificar y seleccionar alternativas basándose en su proximidad a una solución ideal.",
    moreInfoUrl: "https://ejemplo.com/topsis",
    parameters: [
      {
        name: "weights",
        type: "array",
        restrictions: { min: 0, max: 1, sum: 1, length: "matchCriteria" }
      }
    ]
  },
  {
    name: "Herrera Viedma CRP",
    isConsensus: true,
    isPairwise: true,
    smallDescription: "Modelo de consenso de Herrera-Viedma CRP.",
    extendDescription:
      "Herrera-Viedma CRP es un método de consenso en grupos de decisión multicriterio, basado en cuantificadores lingüísticos y operadores OWA.",
    moreInfoUrl: "https://ejemplo.com/herrera-viedma-crp",
    parameters: [
      {
        name: "ag_lq",
        type: "array",
        default: [0.3, 0.8],
        restrictions: { length: 2, min: 0, max: 1 }
      },
      {
        name: "ex_lq",
        type: "array",
        default: [0.5, 1.0],
        restrictions: { length: 2, min: 0, max: 1 }
      },
      {
        name: "b",
        type: "number",
        default: 1.0,
        restrictions: { allowed: [0.5, 0.7, 0.9, 1.0] } // solo valores específicos
      },
      {
        name: "beta",
        type: "number",
        default: 0.8,
        restrictions: { min: 0, max: 1 }
      }
    ]
  }
];


const seedDB = async () => {
  try {
    // Eliminar documentos anteriores (opcional)
    await IssueModel.deleteMany({});
    console.log("Modelos antiguos eliminados");

    console.log("HOLA")

    // Insertar nuevos datos
    await IssueModel.insertMany(issueModels);
    console.log("Modelos insertados correctamente");

    
  } catch (error) {
    console.error("Error al insertar los modelos:", error);
    
  }
};

// Ejecutar el script
seedDB();
 */