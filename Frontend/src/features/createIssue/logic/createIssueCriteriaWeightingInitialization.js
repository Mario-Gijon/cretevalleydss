import { isPlainObject } from "../../../utils/common/objects";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/registry";
import { buildDecisionContext } from "../../issueEvaluation/context";

const toCanonicalId = (value) =>
  typeof value === "string" ? value.trim() : "";

export const buildCriteriaWeightingDecisionContext = ({
  criteriaWeightingModel,
  structureEntry,
  criteriaWeightingParameters = {},
  criteriaTree = [],
  leafCriteria = [],
}) =>
  buildDecisionContext({
    issue: {
      id: null,
      name: null,
      currentStage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      consensusPhase: 0,
      isConsensus: false,
    },
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
    structure: structureEntry,
    model: criteriaWeightingModel,
    parameters: {
      modelParameters: {},
      criteriaWeightingParameters,
    },
    alternatives: [],
    criteriaTree,
    leafCriteria,
  });

export const buildCriteriaWeightingInitializationIdentity = ({
  criteriaWeightingModel,
  structureEntry,
  decisionContext,
}) => {
  const modelIdentity = toCanonicalId(
    criteriaWeightingModel?._id ??
      criteriaWeightingModel?.id ??
      criteriaWeightingModel?.apiModelKey
  );
  const structureKey = toCanonicalId(structureEntry?.key);
  const leafItems = decisionContext?.leafCriteria;

  if (!modelIdentity) {
    throw new Error(
      "Creator-side criteria weighting requires a model identifier."
    );
  }
  if (!structureKey) {
    throw new Error(
      "Creator-side criteria weighting requires an evaluation structure key."
    );
  }
  if (!Array.isArray(leafItems)) {
    throw new Error(
      "Creator-side criteria weighting requires canonical leaf criteria."
    );
  }

  const leafCriterionIds = leafItems.map((criterion, index) => {
    const criterionId = toCanonicalId(criterion?.id);
    if (!criterionId) {
      throw new Error(
        `Creator-side leaf criterion at index ${index} requires an id.`
      );
    }
    return criterionId;
  });

  if (new Set(leafCriterionIds).size !== leafCriterionIds.length) {
    throw new Error("Creator-side leaf criterion ids must be unique.");
  }

  return JSON.stringify([modelIdentity, structureKey, leafCriterionIds]);
};

export const buildCreatorCriteriaWeightingInitialization = ({
  criteriaWeightingModel,
  structureEntry,
  decisionContext,
}) => {
  if (!structureEntry?.View) {
    throw new Error(
      "The selected criteria weighting structure does not expose a View."
    );
  }
  if (typeof structureEntry?.buildInitialEvaluation !== "function") {
    throw new Error(
      "The selected criteria weighting structure cannot initialize creator-side evaluation."
    );
  }

  const evaluation = structureEntry.buildInitialEvaluation({
    decisionContext,
  });
  if (!isPlainObject(evaluation)) {
    throw new Error(
      "Creator-side evaluation initialization must return a complete object."
    );
  }

  return {
    evaluation,
    initializationIdentity: buildCriteriaWeightingInitializationIdentity({
      criteriaWeightingModel,
      structureEntry,
      decisionContext,
    }),
  };
};
