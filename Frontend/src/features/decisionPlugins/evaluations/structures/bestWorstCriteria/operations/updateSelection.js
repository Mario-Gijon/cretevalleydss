import { isPlainObject } from "../../../../../../utils/common/objects";
import { buildEmptyComparisons } from "./buildEmptyPayload";

const SELECTION_CONFIG = Object.freeze({
  best: {
    selectionKey: "bestCriterionId",
    comparisonKey: "bestToOthers",
    oppositeSelectionKey: "worstCriterionId",
  },
  worst: {
    selectionKey: "worstCriterionId",
    comparisonKey: "othersToWorst",
    oppositeSelectionKey: "bestCriterionId",
  },
});

export const updateSelection = ({
  evaluation,
  criteria,
  selection,
  criterionId,
}) => {
  if (!isPlainObject(evaluation)) {
    throw new Error("BWM evaluation state must be an object.");
  }

  const config = SELECTION_CONFIG[selection];
  if (!config) {
    throw new Error("BWM selection kind is invalid.");
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  if (criterionId !== "" && !criterionIds.includes(criterionId)) {
    throw new Error("BWM selection references an unknown criterion.");
  }

  if (
    criteria.length > 1 &&
    criterionId !== "" &&
    evaluation[config.oppositeSelectionKey] === criterionId
  ) {
    throw new Error("BWM best and worst criteria must be different.");
  }

  const nextComparisons = buildEmptyComparisons(criteria);
  if (criterionId !== "") {
    nextComparisons[criterionId] = 1;
  }

  const nextEvaluation = structuredClone(evaluation);
  nextEvaluation[config.selectionKey] = criterionId;
  nextEvaluation[config.comparisonKey] = nextComparisons;

  return nextEvaluation;
};
