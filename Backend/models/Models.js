import { Schema, model } from "mongoose";

// Definir el esquema del modelo
const issueModelSchema = new Schema({
  name: { type: String, required: true },
  isConsensus: { type: Boolean, required: true },
  isPairwise: { type: Boolean, required: true },
  smallDescription: { type: String, required: true },
  extendDescription: { type: String, required: true },
  moreInfoUrl: { type: String, required: true },
});

// Exportar el modelo
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
  },
  {
    name: "Herrera Viedma CRP",
    isConsensus: true,
    isPairwise: true,
    smallDescription: "Small description for herrera viedma crp.",
    extendDescription:
      "Extended description for Herrera Viedma CRP, a consensus-based method for decision making.",
    moreInfoUrl: "https://ejemplo.com/herrera-viedma-crp",
  },
  {
    name: "Herrera Viedma CRP",
    isConsensus: false,
    isPairwise: true,
    smallDescription: "Small description for herrera viedma crp.",
    extendDescription:
      "Extended description for Herrera Viedma CRP, a consensus-based method for decision making.",
    moreInfoUrl: "https://ejemplo.com/herrera-viedma-crp",
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
seedDB(); */
