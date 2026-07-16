import { buildFinishedIssueExecutionOptions } from "../../../logic/selectFinishedIssueExecution.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const resolveModelDescription = (model) => {
  const short = model?.description?.short;
  if (typeof short === "string" && short.trim()) return short;

  const extended = model?.description?.extended;
  if (typeof extended === "string" && extended.trim()) return extended;

  return null;
};

const buildCriteriaTree = ({ nodes, rootIds, domainsById }) => {
  const nodesById = new Map(asArray(nodes).map((node) => [node?.id, node]));
  const visit = (id) => {
    const node = nodesById.get(id);
    if (!node) return null;
    return {
      id: node.id,
      name: node.name,
      type: node.type ?? null,
      expressionDomain: node.expressionDomainId ? domainsById.get(node.expressionDomainId) || null : null,
      children: asArray(node.childIds).map(visit).filter(Boolean),
    };
  };
  return asArray(rootIds).map(visit).filter(Boolean);
};

export const buildModelsParameterContextData = ({ payload, selectedExecution }) => {
  const domainsById = new Map(asArray(payload?.expressionDomains).map((domain) => [domain?.id, domain]));
  const criteriaTree = buildCriteriaTree({
    nodes: payload?.criteria?.nodes,
    rootIds: payload?.criteria?.rootIds,
    domainsById,
  });
  const leafCriteria = asArray(payload?.criteria?.nodes)
    .filter((node) => node?.isLeaf)
    .map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type ?? null,
      expressionDomain: node.expressionDomainId ? domainsById.get(node.expressionDomainId) || null : null,
    }));
  return {
    model: selectedExecution?.model || payload?.models?.base || null,
    alternatives: asArray(payload?.alternatives).map(({ id, name }) => ({ id, name })),
    criteriaTree,
    leafCriteria,
  };
};

export const buildModelsData = ({ payload, selectedExecution }) => ({
  baseModel: payload?.models?.base || null,
  criteriaWeightingModel: payload?.models?.criteriaWeighting || null,
  compatibleModels: Array.isArray(payload?.models?.compatible) ? payload.models.compatible : [],
  scenarios: Array.isArray(payload?.scenarios) ? payload.scenarios : [],
  executionOptions: buildFinishedIssueExecutionOptions(payload),
  selectedExecution: selectedExecution || null,
  configuredParameters: selectedExecution?.configuration?.configuredParameters ?? selectedExecution?.model?.configuredParameters ?? null,
  effectiveParameters: selectedExecution?.configuration?.normalizedParameters ?? selectedExecution?.model?.effectiveParameters ?? null,
  status: selectedExecution?.scenario?.status || "completed",
  error: selectedExecution?.scenario?.error ?? null,
  modelSpecificOutput: selectedExecution?.modelSpecificOutput ?? null,
  rawOutput: selectedExecution?.rawOutput ?? null,
  completeness: payload?.executionMetadata?.completeness ?? null,
});

export const buildModelsPreview = (data) => ({
  baseModelName: data.baseModel?.name || "—",
  selectedExecutionKey: data.selectedExecution?.key || "base",
  selectedExecutionLabel: data.selectedExecution?.label || "Base",
  selectedExecutionIsBase: data.selectedExecution?.type !== "scenario",
  additionalRunsCount: data.scenarios.length,
  selectedModelName: data.selectedExecution?.model?.name || data.baseModel?.name || "—",
  selectedModelDescription: resolveModelDescription(
    data.selectedExecution?.model || data.baseModel
  ),
  status: data.status,
  error: data.error,
  parameters: data.effectiveParameters || data.configuredParameters || {},
});
