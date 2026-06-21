import { isPlainObject } from "../../../../../utils/common/objects.js";
import { normalizeText } from "./bestWorstCriteria.payload.js";

const buildEmptyComparisons = (criterionNames) =>
  criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = "";
    return accumulator;
  }, {});

const mergeStoredPayload = ({ storedPayload, criterionNames }) => {
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
    bestToOthers: criterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        bestToOthersSource[criterionName] === undefined
          ? ""
          : bestToOthersSource[criterionName];
      return accumulator;
    }, {}),
    othersToWorst: criterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        othersToWorstSource[criterionName] === undefined
          ? ""
          : othersToWorstSource[criterionName];
      return accumulator;
    }, {}),
  };
};

const resolveCriterionNames = async ({ evaluationContext }) => {
  if (Array.isArray(evaluationContext?.leafCriteria) && evaluationContext.leafCriteria.length > 0) {
    return evaluationContext.leafCriteria
      .map((criterion) => criterion?.name)
      .filter(Boolean);
  }

  return [];
};

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const criterionNames = await resolveCriterionNames({ evaluationContext });

  const normalizedPayload = !payload || typeof payload !== "object"
    ? {
        bestCriterion: "",
        worstCriterion: "",
        bestToOthers: buildEmptyComparisons(criterionNames),
        othersToWorst: buildEmptyComparisons(criterionNames),
      }
    : mergeStoredPayload({
        storedPayload: payload,
        criterionNames,
      });

  return {
    payload: normalizedPayload,
    criterionNames,
  };
};
