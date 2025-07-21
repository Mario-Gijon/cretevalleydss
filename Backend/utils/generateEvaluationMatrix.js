
import { Participation } from '../models/Participations.js';

export const generateEvaluationMatrices = async (issueId) => {
  const evaluaciones = {};

  // Obtener todas las evaluaciones de los expertos para el problema
  const participations = await Participation.find({ issue: issueId })
    .populate("expert") // Obtener la información del experto
    .populate("evaluations"); // Obtener las evaluaciones realizadas

  for (const participation of participations) {
    const expertName = participation.expert.email; // O usa otro identificador único

    if (!evaluaciones[expertName]) {
      evaluaciones[expertName] = {};
    }

    for (const evaluation of participation.evaluations) {
      const criterio = evaluation.criterion.name; // Nombre del criterio
      const matriz = evaluation.pairwiseMatrix; // Matriz de pares

      evaluaciones[expertName][criterio] = matriz;
    }
  }

  return evaluaciones;
};
