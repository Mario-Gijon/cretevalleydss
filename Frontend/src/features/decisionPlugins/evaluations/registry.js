/**
 * Focused public contract for consumers that dispatch evaluation plugins.
 *
 * Keep evaluation structure discovery and implementation details private to
 * the Decision Plugins boundary.
 */
export { EVALUATION_STAGES } from "./evaluationStages.js";
export {
  EVALUATION_STRUCTURE_REGISTRY,
  getDefaultEvaluationStructureEntryForStage,
  getEvaluationStructureEntry,
  getEvaluationStructureDisplayLabel,
  getEvaluationStructureEntryForStage,
} from "./evaluationStructureRegistry.js";
