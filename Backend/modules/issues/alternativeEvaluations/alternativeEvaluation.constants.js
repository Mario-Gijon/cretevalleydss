/**
 * Estructuras de evaluación de alternativas soportadas por el backend.
 *
 * Los valores deben mantenerse estables porque se persisten en Mongo
 * y forman parte del contrato entre backend y frontend.
 */
export const EVALUATION_STRUCTURES = Object.freeze({
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
});

/**
 * Lista de estructuras de evaluación soportadas.
 */
export const SUPPORTED_ALTERNATIVE_EVALUATION_STRUCTURES = Object.freeze(
  Object.values(EVALUATION_STRUCTURES)
);
