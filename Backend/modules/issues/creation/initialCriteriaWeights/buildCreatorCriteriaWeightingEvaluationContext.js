import { toIdString } from "../../../../utils/common/ids.js";
import { normalizeNonEmptyString } from "../../../../utils/common/strings.js";
import { EVALUATION_STAGES } from "../../../decisionPlugins/evaluations/evaluationStages.js";

const normalizeLeafCriterion = (criterion) => {
  if (typeof criterion === "string") {
    const name = normalizeNonEmptyString(criterion);
    return name ? { id: null, name } : null;
  }

  if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
    return null;
  }

  const name = normalizeNonEmptyString(criterion?.name);
  if (!name) {
    return null;
  }

  return {
    id: toIdString(criterion?._id ?? criterion?.id),
    name,
    type: normalizeNonEmptyString(criterion?.type),
    expressionDomain:
      criterion?.expressionDomain &&
      typeof criterion.expressionDomain === "object" &&
      !Array.isArray(criterion.expressionDomain)
        ? criterion.expressionDomain
        : null,
  };
};

const buildIdMap = (items = []) =>
  items.reduce((accumulator, item) => {
    if (item?.id) {
      accumulator[item.id] = item;
    }

    return accumulator;
  }, {});

const buildNameMap = (items = []) =>
  items.reduce((accumulator, item) => {
    if (item?.name) {
      accumulator[item.name] = item;
    }

    return accumulator;
  }, {});

const buildDomainMaps = (leafItems = []) =>
  leafItems.reduce(
    (accumulator, criterion) => {
      if (criterion?.id) {
        accumulator.byCriterionId[criterion.id] = criterion.expressionDomain || null;
      }

      if (criterion?.name) {
        accumulator.byCriterionName[criterion.name] = criterion.expressionDomain || null;
      }

      return accumulator;
    },
    {
      byCriterionId: {},
      byCriterionName: {},
    }
  );

export const buildCreatorCriteriaWeightingEvaluationContext = ({
  criteriaWeightingStructure,
  criteriaWeightingModel,
  normalizedCriteriaWeightingParameters = {},
  leafCriteria = [],
}) => {
  const leafItems = Array.isArray(leafCriteria)
    ? leafCriteria.map(normalizeLeafCriterion).filter(Boolean)
    : [];

  return {
    issue: {
      id: "creation",
      name: "Issue creation",
      currentStage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      consensusPhase: 0,
      isConsensus: false,
      consensusThreshold: null,
      consensusMaxPhases: null,
    },
    structure: {
      key: normalizeNonEmptyString(criteriaWeightingStructure?.key),
      stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
    },
    model: {
      id: toIdString(criteriaWeightingModel?._id ?? criteriaWeightingModel?.id),
      name: normalizeNonEmptyString(criteriaWeightingModel?.name),
      apiModelKey: normalizeNonEmptyString(criteriaWeightingModel?.apiModelKey),
    },
    parameters: {
      modelParameters: {},
      criteriaWeightingParameters:
        normalizedCriteriaWeightingParameters &&
        typeof normalizedCriteriaWeightingParameters === "object" &&
        !Array.isArray(normalizedCriteriaWeightingParameters)
          ? normalizedCriteriaWeightingParameters
          : {},
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
      leafNames: leafItems.map((criterion) => criterion.name),
      leafById: buildIdMap(leafItems),
      leafByName: buildNameMap(leafItems),
    },
    domains: buildDomainMaps(leafItems),
    consensus: {
      phase: 0,
      maxPhases: null,
      threshold: null,
      currentCollectiveEvaluations: {},
      previousCollectiveEvaluations: {},
    },
  };
};
