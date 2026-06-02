import { isPlainObject } from "../../../../../utils/common/objects.js";
import { getOrderedCriterionNames } from "../shared/criteriaWeighting.helpers.js";
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

const orderObjectByKeys = (obj, orderedKeys) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

const resolveCriterionNames = async ({ issue, criteria }) => {
  if (Array.isArray(criteria) && criteria.length > 0) {
    return criteria
      .map((criterion) =>
        typeof criterion === "string"
          ? criterion.trim()
          : String(criterion?.name || "").trim()
      )
      .filter(Boolean);
  }

  const { criterionNames } = await getOrderedCriterionNames({ issue });
  return criterionNames;
};

export const buildDisplayMeta = ({ storedEvaluation, criterionNames }) => {
  const rawPayload = isPlainObject(storedEvaluation?.payload)
    ? storedEvaluation.payload
    : {};

  return {
    bwm: {
      bestCriterion: rawPayload?.bestCriterion,
      worstCriterion: rawPayload?.worstCriterion,
      bestToOthers: orderObjectByKeys(rawPayload?.bestToOthers ?? {}, criterionNames),
      othersToWorst: orderObjectByKeys(rawPayload?.othersToWorst ?? {}, criterionNames),
    },
  };
};

export const buildGetPayload = async ({ storedEvaluation, issue, criteria }) => {
  const criterionNames = await resolveCriterionNames({ issue, criteria });

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
