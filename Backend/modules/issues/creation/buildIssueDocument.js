import dayjs from "dayjs";
import { Issue } from "../../../models/Issues.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/index.js";

export const buildIssueCreationDocument = ({
  ownerUserId,
  model,
  apiModelKey,
  apiEndpoint,
  evaluationStructureKey,
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
    ownerId: ownerUserId,
    createdBy: ownerUserId,
    model: model._id,
    apiModelKey,
    apiEndpoint,
    criteriaWeightsStructureKey: null,
    criteriaWeightingModel: null,
    criteriaWeightingApiModelKey: null,
    criteriaWeightingApiEndpoint: null,
    criteriaWeightingParameters: {},
    evaluationStructureKey,
    supportsConsensus,
    simulateConsensus,
    consensusPhase: 0,
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
