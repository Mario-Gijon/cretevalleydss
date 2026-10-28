import { buildOverviewData } from "../../overview/logic/buildFinishedIssueOverviewData.js";
import { resolveResultPresentation } from "../../../resultPresentations/registry.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

export const buildDashboardData = ({ payload, selectedExecution }) => {
  const canonicalPayload = payload || {};
  const overview = buildOverviewData(canonicalPayload);
  const execution = selectedExecution || {};
  const resolution = resolveResultPresentation(execution);
  const modelName = execution.model?.name || canonicalPayload.models?.base?.name || "—";
  const normalized = resolution.presentation
    ? resolution.presentation.normalizeDashboardResult({
      execution,
      alternatives: canonicalPayload.alternatives,
      criteria: canonicalPayload.criteria,
    })
    : { available: false, unavailableReason: resolution.unavailableReason };

  return {
    issueSummary: {
      alternativesCount: asArray(canonicalPayload.alternatives).length,
      criteriaCount: asArray(canonicalPayload.criteria?.nodes).filter((node) => node?.isLeaf === true).length,
      expertsCount: overview.participation.total,
      modelName,
    },
    result: normalized,
    resultStructure: {
      key: resolution.resultStructureKey,
      version: resolution.resultStructureVersion,
      legacyFallback: resolution.legacyFallback,
    },
    resultPresentation: resolution.presentation,
    findings: resolution.presentation && normalized.available
      ? resolution.presentation.buildDashboardFindings(normalized, execution)
      : [],
  };
};

export default buildDashboardData;
