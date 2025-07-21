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
    smallDescription: "Método para ordenación por similitud a la solución ideal.",
    extendDescription:
      "TOPSIS es una técnica de decisión multicriterio que selecciona la mejor alternativa basándose en la proximidad a una solución ideal.",
    moreInfoUrl: "https://ejemplo.com/topsis",
  },
  {
    name: "AHP",
    isConsensus: true,
    smallDescription: "Proceso Analítico Jerárquico.",
    extendDescription:
      "AHP estructura problemas de decisión complejos en una jerarquía para comparar criterios y alternativas de manera estructurada.",
    moreInfoUrl: "https://ejemplo.com/ahp",
  },
  {
    name: "DEA",
    isConsensus: false,
    smallDescription: "Análisis Envolvente de Datos.",
    extendDescription:
      "DEA mide la eficiencia relativa de unidades de decisión usando programación lineal, comparando insumos y productos.",
    moreInfoUrl: "https://ejemplo.com/dea",
  },
  {
    name: "VIKOR",
    isConsensus: true,
    smallDescription: "Método de Compromiso Multicriterio.",
    extendDescription:
      "VIKOR se usa para encontrar soluciones de compromiso en problemas con múltiples criterios conflictivos.",
    moreInfoUrl: "https://ejemplo.com/vikor",
  },
  {
    name: "PROMETHEE",
    isConsensus: true,
    smallDescription: "Método de Preferencia para la Ordenación.",
    extendDescription:
      "PROMETHEE es una técnica de decisión multicriterio que permite comparar alternativas basado en preferencias explícitas.",
    moreInfoUrl: "https://ejemplo.com/promethee",
  },
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
