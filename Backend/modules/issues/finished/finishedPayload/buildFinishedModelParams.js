import { toIdString } from "../../../../utils/common/ids.js";
import {
  buildDefaultsResolved,
  mergeParamsResolved,
} from "../../../decisionEngine/modelParameters/resolveModelParameterValues.js";
import {
  buildExpressionDomainConfigFromLeafCriteriaOrThrow,
} from "../../../expressionDomains/buildIssueDomainConfig.js";

export const buildLeafCriteriaModelParams = ({ orderedLeafCriteria }) => {
  return orderedLeafCriteria.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
  }));
};

export const buildBaseModelParamsPayload = ({
  issue,
  model,
  leafCount,
}) => {
  const baseDefaultsResolved = buildDefaultsResolved({
    modelDoc: model,
    leafCount,
  });

  const baseParamsSaved = issue.modelParameters || {};
  const baseParamsResolved = mergeParamsResolved({
    defaultsResolved: baseDefaultsResolved,
    savedParams: baseParamsSaved,
  });

  return {
    modelId: toIdString(model._id),
    modelName: model.name,
    alternativeEvaluationStructureKey:
      issue.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    supportsConsensus: issue.supportsConsensus === true,
    parameters: model.parameters,
    paramsSaved: baseParamsSaved,
    paramsResolved: baseParamsResolved,
  };
};

export const buildExpressionDomainConfigForModelParamsOrThrow = ({
  orderedLeafCriteria,
}) => {
  return buildExpressionDomainConfigFromLeafCriteriaOrThrow({
    leafCriteria: orderedLeafCriteria,
    field: "expressionDomain",
  });
};

export const buildModelParamsPayloadOrThrow = ({
  issue,
  model,
  orderedLeafCriteria,
  availableModels,
  domainType,
}) => {
  const leafCount = orderedLeafCriteria.length;

  return {
    leafCriteria: buildLeafCriteriaModelParams({ orderedLeafCriteria }),
    domainType,
    expressionDomainConfig: buildExpressionDomainConfigForModelParamsOrThrow({
      orderedLeafCriteria,
    }),
    base: buildBaseModelParamsPayload({
      issue,
      model,
      leafCount,
    }),
    availableModels,
  };
};
