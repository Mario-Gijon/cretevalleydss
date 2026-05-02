/**
 * Alternative evaluation structures supported by the frontend.
 *
 * Values must stay stable because they are persisted in MongoDB and are
 * part of the backend/frontend contract.
 */
export const EVALUATION_STRUCTURES = Object.freeze({
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
});
