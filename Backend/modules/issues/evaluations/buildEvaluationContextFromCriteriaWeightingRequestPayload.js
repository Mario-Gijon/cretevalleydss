import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";

const cloneSerializable = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const normalizePositiveIntegerOrNull = (value) =>
  Number.isInteger(value) && value > 0 ? value : null;

const normalizeFiniteNumberOrNull = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const buildEvaluationContextFromCriteriaWeightingRequestPayload = ({
  requestPayload,
}) => {
  const issue = requestPayload?.context?.issue;
  const structure = requestPayload?.context?.structure;
  const criteria = Array.isArray(requestPayload?.context?.criteria)
    ? requestPayload.context.criteria
    : [];
  const consensusPhase = normalizePositiveIntegerOrNull(
    requestPayload?.context?.consensusPhase
  );

  const leafItems = criteria.map((criterion) => ({
    id: toIdString(criterion?.id || criterion?._id) || null,
    name: typeof criterion?.name === "string" ? criterion.name.trim() : "",
    type: typeof criterion?.type === "string" ? criterion.type : null,
    isLeaf: true,
    parentId: null,
    expressionDomain: null,
  }));

  return {
    issue: {
      id: toIdString(issue?.id || issue?._id) || null,
      name: typeof issue?.name === "string" ? issue.name : null,
      currentStage: null,
      consensusPhase,
      isConsensus: null,
      consensusThreshold: normalizeFiniteNumberOrNull(issue?.consensusThreshold),
      consensusMaxPhases: normalizePositiveIntegerOrNull(issue?.consensusMaxPhases),
    },
    structure: {
      key: typeof structure?.key === "string" ? structure.key : null,
      stage: typeof structure?.stage === "string" ? structure.stage : null,
    },
    model: {
      id: null,
      name: null,
      apiModelKey: null,
      modelFamilyKey: null,
      versionLabel: null,
    },
    parameters: {
      modelParameters: {},
      criteriaWeightingParameters: cloneSerializable(
        requestPayload?.modelParameters,
        {}
      ),
    },
    alternatives: {
      items: [],
      names: [],
      byId: {},
      byName: {},
    },
    criteria: {
      tree: [],
      leafItems,
      leafNames: leafItems.map((criterion) => criterion.name).filter(Boolean),
      leafById: leafItems.reduce((accumulator, criterion) => {
        if (criterion.id) {
          accumulator[criterion.id] = criterion;
        }
        return accumulator;
      }, {}),
      leafByName: leafItems.reduce((accumulator, criterion) => {
        if (criterion.name) {
          accumulator[criterion.name] = criterion;
        }
        return accumulator;
      }, {}),
    },
    domains: {
      byCriterionId: {},
      byCriterionName: {},
    },
    consensus: {
      phase: consensusPhase,
      maxPhases: normalizePositiveIntegerOrNull(issue?.consensusMaxPhases),
      threshold: normalizeFiniteNumberOrNull(issue?.consensusThreshold),
      currentCollectiveEvaluations: {},
      previousCollectiveEvaluations: isPlainObject(
        requestPayload?.context?.previousStageResult?.collectiveEvaluations
      )
        ? cloneSerializable(
            requestPayload.context.previousStageResult.collectiveEvaluations,
            {}
          )
        : {},
    },
  };
};
