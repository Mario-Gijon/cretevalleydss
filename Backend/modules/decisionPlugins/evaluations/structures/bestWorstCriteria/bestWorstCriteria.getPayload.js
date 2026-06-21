import { isPlainObject } from "../../../../../utils/common/objects.js";
import { normalizeText } from "./bestWorstCriteria.payload.js";

const buildEmptyComparisons = (criterionItems) =>
  criterionItems.reduce((accumulator, criterion) => {
    accumulator[criterion.id] = "";
    return accumulator;
  }, {});

const mergeStoredPayload = ({ storedPayload, criterionItems }) => {
  const payload = isPlainObject(storedPayload) ? storedPayload : {};
  const bestToOthersSource = isPlainObject(payload.bestToOthers)
    ? payload.bestToOthers
    : {};
  const othersToWorstSource = isPlainObject(payload.othersToWorst)
    ? payload.othersToWorst
    : {};

  return {
    bestCriterion: normalizeText(payload.bestCriterion),
    worstCriterion: normalizeText(payload.worstCriterion),
    bestToOthers: criterionItems.reduce((accumulator, criterion) => {
      accumulator[criterion.id] =
        bestToOthersSource[criterion.id] === undefined
          ? ""
          : bestToOthersSource[criterion.id];
      return accumulator;
    }, {}),
    othersToWorst: criterionItems.reduce((accumulator, criterion) => {
      accumulator[criterion.id] =
        othersToWorstSource[criterion.id] === undefined
          ? ""
          : othersToWorstSource[criterion.id];
      return accumulator;
    }, {}),
  };
};

const resolveCriterionItems = async ({ evaluationContext }) => {
  if (Array.isArray(evaluationContext?.leafCriteria) && evaluationContext.leafCriteria.length > 0) {
    return evaluationContext.leafCriteria
      .map((criterion) => ({
        id: normalizeText(criterion?.id ?? criterion?._id),
        name: normalizeText(criterion?.name),
      }))
      .filter((criterion) => criterion.id && criterion.name);
  }

  return [];
};

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const criterionItems = await resolveCriterionItems({ evaluationContext });

  const normalizedPayload = !payload || typeof payload !== "object"
    ? {
        bestCriterion: "",
        worstCriterion: "",
        bestToOthers: buildEmptyComparisons(criterionItems),
        othersToWorst: buildEmptyComparisons(criterionItems),
      }
    : mergeStoredPayload({
        storedPayload: payload,
        criterionItems,
      });

  return {
    payload: normalizedPayload,
    criterionItems,
  };
};
