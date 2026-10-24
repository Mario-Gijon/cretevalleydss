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
import { isPlainObject } from "../../../utils/common/objects.js";
import { getEvaluationStructureEntry } from "./evaluationStructureRegistry.js";

/**
 * Dispatches collective-payload usability checks through the owning evaluation
 * structure. Structures without a specialized validator retain the generic
 * object check used by existing evaluation types.
 */
export const isCollectiveEvaluationUsable = ({
  structureKey,
  decisionContext,
  collectiveEvaluation,
}) => {
  if (!isPlainObject(collectiveEvaluation)) return false;

  const structure = getEvaluationStructureEntry(structureKey);
  if (typeof structure?.isCollectiveEvaluationUsable !== "function") return true;

  return structure.isCollectiveEvaluationUsable({
    decisionContext,
    collectiveEvaluation,
  });
};
