/**
 * Modos de evaluación de pesos soportados por el backend.
 *
 * Los valores deben mantenerse estables porque se persisten en Mongo
 * y se exponen al frontend.
 */
export const WEIGHTING_MODES = Object.freeze({
  MANUAL: "manual",
  CONSENSUS: "consensus",
  BWM: "bwm",
  CONSENSUS_BWM: "consensusBwm",
  SIMULATED_CONSENSUS_BWM: "simulatedConsensusBwm",
});
