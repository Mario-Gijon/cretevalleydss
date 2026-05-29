import dayjs from "dayjs";
import { Issue } from "../../../models/Issues.js";
import { EVALUATION_STAGES } from "../evaluations/index.js";

export const buildIssueCreationDocument = ({
  adminUserId,
  model,
  apiModelKey,
  apiEndpoint,
  modelFamilyKey,
  modelVersion,
  versionLabel,
  alternativeEvaluationStructureKey,
  supportsConsensus,
  simulateConsensus,
  isConsensus,
  issueName,
  issueDescription,
  closureDate,
  usesCriteriaWeights,
  consensusMaxPhases,
  consensusThreshold,
  normalizedModelParameters,
}) => {
  return new Issue({
    admin: adminUserId,
    model: model._id,
    apiModelKey,
    apiEndpoint,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    criteriaWeightingStructureKey: null,
    criteriaWeightingModel: null,
    criteriaWeightingApiModelKey: null,
    criteriaWeightingApiEndpoint: null,
    criteriaWeightingParameters: {},
    alternativeEvaluationStructureKey,
    supportsConsensus,
    simulateConsensus,
    consensusPhase: 1,
    isConsensus,
    name: issueName,
    description: issueDescription,
    active: true,
    creationDate: dayjs().format("DD-MM-YYYY"),
    closureDate: closureDate ? dayjs(closureDate).format("DD-MM-YYYY") : null,
    currentStage: usesCriteriaWeights
      ? EVALUATION_STAGES.CRITERIA_WEIGHTING
      : EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    consensusMaxPhases,
    consensusThreshold,
    modelParameters: normalizedModelParameters,
  });
};

export const applyResolvedCriteriaWeightingToIssue = ({
  issue,
  resolvedCriteriaWeighting,
}) => {
  issue.criteriaWeightingStructureKey =
    resolvedCriteriaWeighting.criteriaWeightingStructureKey;
  issue.criteriaWeightingModel =
    resolvedCriteriaWeighting.criteriaWeightingModel
      ? resolvedCriteriaWeighting.criteriaWeightingModel._id
      : null;
  issue.criteriaWeightingApiModelKey =
    resolvedCriteriaWeighting.criteriaWeightingApiModelKey;
  issue.criteriaWeightingApiEndpoint =
    resolvedCriteriaWeighting.criteriaWeightingApiEndpoint;
  issue.criteriaWeightingParameters =
    resolvedCriteriaWeighting.criteriaWeightingParameters;
  issue.currentStage = resolvedCriteriaWeighting.currentStage;

  if (resolvedCriteriaWeighting.modelWeights !== null) {
    issue.modelParameters = {
      ...issue.modelParameters,
      weights: resolvedCriteriaWeighting.modelWeights,
    };
  }
};
