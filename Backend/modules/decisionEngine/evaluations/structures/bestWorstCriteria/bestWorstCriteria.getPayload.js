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

const resolveCriterionNames = async ({ structureContext }) => {
  if (Array.isArray(structureContext?.leafCriteria) && structureContext.leafCriteria.length > 0) {
    return structureContext.leafCriteria
      .map((criterion) =>
        typeof criterion === "string"
          ? criterion.trim()
          : String(criterion?.name || "").trim()
      )
      .filter(Boolean);
  }

  return [];
};

export const buildGetPayload = async ({
  storedEvaluation,
  structureContext,
}) => {
  const criterionNames = await resolveCriterionNames({ structureContext });

  const payload = !storedEvaluation
    ? {
        bestCriterion: "",
        worstCriterion: "",
        bestToOthers: buildEmptyComparisons(criterionNames),
        othersToWorst: buildEmptyComparisons(criterionNames),
      }
    : mergeStoredPayload({
        storedPayload: storedEvaluation?.payload,
        criterionNames,
      });

  return {
    payload,
    criterionNames,
  };
};
