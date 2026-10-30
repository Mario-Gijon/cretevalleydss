import { selectFinishedIssueExecution } from "../../../logic/selectFinishedIssueExecution.js";
import { resolveResultPresentation } from "../../../resultPresentations/registry.js";
import { isAHPSortIExecution } from "../../../resultPresentations/modelFindings/ahp_sort_i.js";

const asArray = (value) => Array.isArray(value) ? value : [];
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const isGroupExecution = (execution) => {
  const diagnostics = execution?.standardizedOutput?.diagnostics;
  return isRecord(execution?.modelParameters?.ahpSortGroup) ||
    diagnostics?.aggregationMethod === "unweighted_plurality_vote" ||
    isRecord(diagnostics?.individualResultsByExpertId);
};

/**
 * Resolve the saved base AHPSort I result through the same result presentation
 * normalizer used by Finished Issue's result summary. This only validates and
 * formats persisted GAHPSort evidence; it does not recreate the vote.
 */
export const buildAHPSortIGroupEvaluationPresentation = ({ payload, phase } = {}) => {
  const execution = selectFinishedIssueExecution(payload, "base", phase);
  if (!isAHPSortIExecution(execution) || !isGroupExecution(execution)) return null;

  const resolution = resolveResultPresentation(execution);
  const presentation = resolution.presentation;
  if (!presentation) {
    return {
      status: "unavailable",
      message: "The saved AHPSort I classification is not available for this result format.",
      categories: [],
      alternativeIds: [],
      evidence: null,
    };
  }

  const result = presentation.normalizeDashboardResult({
    execution,
    alternatives: payload?.alternatives,
    criteria: payload?.criteria,
  });
  if (!result?.available) {
    return {
      status: "unavailable",
      message: result?.unavailableReason || "The saved AHPSort I classification is unavailable.",
      categories: [],
      alternativeIds: [],
      evidence: null,
    };
  }
  const evidence = result.ahpSortIGroup;
  if (!evidence) {
    return {
      status: "unavailable",
      message: "No saved GAHPSort classification evidence is available for this execution.",
      categories: [],
      alternativeIds: [],
      evidence: null,
    };
  }

  return {
    status: evidence.status,
    message: evidence.unavailableReason,
    evidence,
    categories: asArray(result.categories)
      .slice()
      .sort((left, right) => left.order - right.order)
      .map(({ id, label, order }) => ({ id, label, order })),
    alternativeIds: asArray(payload?.alternatives).map((alternative) => alternative?.id).filter(Boolean),
  };
};

export default buildAHPSortIGroupEvaluationPresentation;
