import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { buildDefaultsResolved } from "../../../decisionEngine/modelParameters/resolveModelParameterValues.js";
import { buildScenarioCompatibilityMetadata } from "../../scenarios/validateScenarioModelCompatibility.js";

export const buildAvailableModelsPayload = ({
  issue,
  allModels,
  issueAlternativeEvaluationStructureKey,
  issueDomainSnapshots,
  leafCount,
}) => {
  if (!Array.isArray(issueDomainSnapshots)) {
    throw createInternalError("Finished issue domain snapshots must be an array", {
      field: "issueDomainSnapshots",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  const linguisticDomains = issueDomainSnapshots.filter(
    (domain) => domain?.type === "linguistic"
  );

  for (const domain of linguisticDomains) {
    if (!Number.isInteger(domain.valueCount) || domain.valueCount < 2) {
      throw createInternalError(
        "Finished linguistic issue domain snapshot valueCount is invalid",
        {
          field: "issueDomainSnapshots.valueCount",
          details: {
            issueId: toIdString(issue._id),
            domainId: toIdString(domain?._id) || null,
            valueCount: domain.valueCount,
          },
        }
      );
    }
  }

  const linguisticValueCounts = Array.from(
    new Set(
      linguisticDomains.map((domain) => domain.valueCount)
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
