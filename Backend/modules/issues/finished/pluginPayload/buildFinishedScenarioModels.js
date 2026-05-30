import { toIdString } from "../../../../utils/common/ids.js";
import { buildDefaultsResolved } from "../../scenarios/resolveScenarioModelParameters.js";
import { buildScenarioCompatibilityMetadata } from "../../scenarios/validateScenarioModelCompatibility.js";

export const buildAvailableModelsPayload = ({
  issue,
  allModels,
  issueAlternativeEvaluationStructureKey,
  issueDomainSnapshots,
  leafCount,
}) => {
  const linguisticValueCounts = Array.from(
    new Set(
      (Array.isArray(issueDomainSnapshots) ? issueDomainSnapshots : [])
        .filter((domain) => domain?.type === "linguistic")
        .map((domain) => Number(domain?.valueCount))
        .filter((valueCount) => Number.isInteger(valueCount) && valueCount >= 2)
    )
  );
  const fuzzyWeightsValueCount =
    linguisticValueCounts.length === 1 ? linguisticValueCounts[0] : null;

  return allModels.map((modelDoc) => {
    const metadata = buildScenarioCompatibilityMetadata({
      issue,
      targetModel: modelDoc,
      issueDomainSnapshots,
    });

    return {
      id: toIdString(modelDoc._id),
      name: modelDoc.name,
      alternativeEvaluationStructureKey:
        modelDoc.alternativeEvaluationStructureKey || null,
      supportsConsensus: modelDoc.supportsConsensus === true,
      isMultiCriteria: modelDoc.isMultiCriteria,
      usesCriteriaWeights: modelDoc.usesCriteriaWeights === true,
      usesFuzzyCriteriaWeights: modelDoc.usesFuzzyCriteriaWeights === true,
      usesCriterionTypes: modelDoc.usesCriterionTypes === true,
      fuzzyWeightsValueCount,
      smallDescription: modelDoc.smallDescription,
      moreInfoUrl: modelDoc.moreInfoUrl,
      parameters: modelDoc.parameters,
      defaultsResolved: buildDefaultsResolved({
        modelDoc: {
          ...modelDoc,
          fuzzyWeightsValueCount,
        },
        leafCount,
      }),
      scenarioCompatibility: {
        compatible: metadata.compatible,
        reasons: metadata.reasons,
        structureMatches: metadata.structureMatches,
        domainsMatch: metadata.domainsMatch,
        consensusModeMatches: metadata.consensusModeMatches,
        sameModel: metadata.sameModel,
      },
      compatibility: {
        alternativeEvaluationStructure:
          modelDoc.alternativeEvaluationStructureKey ===
          issueAlternativeEvaluationStructureKey,
        domain: metadata.domainsMatch,
      },
    };
  });
};
