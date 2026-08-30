import { buildDefaultsResolved, mergeParamsResolved } from "../../../../decisionPlugins/modelParameters/resolveModelParameterValues.js";
import { buildScenarioCompatibilityMetadata } from "../../../scenarios/validateScenarioModelCompatibility.js";
import { resolveModelPaperUrl } from "./modelPaperUrl.js";
import {
  cloneSerializable,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";

const serializeCapabilities = (model) => ({
  supportsCreatorCriteriaWeighting: model.supportsCreatorCriteriaWeighting === true,
  supportsExpertCriteriaWeighting: model.supportsExpertCriteriaWeighting === true,
  requiresHomogeneousExpressionDomains:
    model.requiresHomogeneousExpressionDomains === true,
  supportsConsensus: model.supportsConsensus === true,
  supportsConsensusSimulation: model.supportsConsensusSimulation === true,
  usesCriteriaWeights: model.usesCriteriaWeights === true,
  usesExpertWeights: model.usesExpertWeights === true,
  usesFuzzyCriteriaWeights: model.usesFuzzyCriteriaWeights === true,
  usesCriterionTypes: model.usesCriterionTypes === true,
  isMultiCriteria: model.isMultiCriteria === true,
  supportedExpressionDomains: cloneSerializable(model.supportedExpressionDomains, []),
});

const serializeModel = ({ model, configuredParameters, leafCount, runtime }) => {
  if (!model) return null;
  const defaults = buildDefaultsResolved({ modelDoc: model, leafCount });

  return {
    id: toRequiredId(model, "model"),
    name: model.name,
    paperUrl: resolveModelPaperUrl(model),
    description: {
      short: model.smallDescription ?? null,
      extended: model.extendDescription ?? null,
    },
    kind: model.modelKind,
    evaluationStructureKey: model.evaluationStructureKey,
    capabilities: serializeCapabilities(model),
    parameterDefinitions: cloneSerializable(model.parameters, []),
    configuredParameters: cloneSerializable(configuredParameters, {}),
    effectiveParameters: mergeParamsResolved({
      defaultsResolved: defaults,
      savedParams: configuredParameters ?? {},
    }),
    definitionSource: "currentRegistry",
    technical: {
      apiModelKey: runtime?.apiModelKey ?? model.apiModelKey ?? null,
      apiEndpoint: cloneSerializable(runtime?.apiEndpoint ?? model.apiEndpoint, null),
      implementationStatus: model.implementationStatus ?? null,
      publicUsable: model.publicUsable ?? null,
      manifestSync: cloneSerializable(model.manifestSync, null),
      request: cloneSerializable(model.request, null),
      response: cloneSerializable(model.response, null),
    },
  };
};

export const serializeModels = ({ issue, compatibleModels, expressionDomains, criteria }) => {
  const leafCount = criteria.nodes.filter((criterion) => criterion.isLeaf).length;
  const base = serializeModel({
    model: issue.model,
    configuredParameters: issue.modelParameters,
    leafCount,
    runtime: {
      apiModelKey: issue.apiModelKey,
      apiEndpoint: issue.apiEndpoint,
    },
  });
  const criteriaWeighting = serializeModel({
    model: issue.criteriaWeightingModel,
    configuredParameters: issue.criteriaWeightingParameters,
    leafCount,
    runtime: {
      apiModelKey: issue.criteriaWeightingApiModelKey,
      apiEndpoint: issue.criteriaWeightingApiEndpoint,
    },
  });
  const compatible = compatibleModels
    .map((model) => {
      const compatibility = buildScenarioCompatibilityMetadata({
        issue,
        targetModel: model,
        issueDomainSnapshots: expressionDomains,
      });
      return {
        id: toRequiredId(model, "compatible model"),
        name: model.name,
        paperUrl: resolveModelPaperUrl(model),
        description: {
          short: model.smallDescription ?? null,
          extended: model.extendDescription ?? null,
        },
        kind: model.modelKind,
        evaluationStructureKey: model.evaluationStructureKey,
        capabilities: serializeCapabilities(model),
        parameterDefinitions: cloneSerializable(model.parameters, []),
        compatibility: {
          compatible: compatibility.compatible,
          reasons: compatibility.reasons,
          structureMatches: compatibility.structureMatches,
          domainsMatch: compatibility.domainsMatch,
          consensusModeMatches: compatibility.consensusModeMatches,
          sameModel: compatibility.sameModel,
        },
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return { base, criteriaWeighting, compatible };
};

export const getModelIdOrNull = (model) => toNullableId(model);
