import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { resolveCriteria } from "./resolveCriteria.js";
import { validatePayloadShape } from "./validatePayloadShape.js";

const normalizeSelectionId = ({ value, field }) => {
  if (typeof value !== "string") {
    throw createBadRequestError("Criterion selection must be a string", {
      field,
    });
  }

  return value.trim();
};

const normalizeComparisonValue = ({ value, field }) => {
  if (value === "") {
    return "";
  }

  const normalizedValue =
    typeof value === "string" && value.trim() !== ""
      ? Number(value.trim())
      : value;

  if (
    !Number.isInteger(normalizedValue) ||
    normalizedValue < 1 ||
    normalizedValue > 9
  ) {
    throw createBadRequestError(
      "Comparison value must be an integer between 1 and 9",
      { field }
    );
  }

  return normalizedValue;
};

const normalizeComparisons = ({ comparisons, criteria, field }) =>
  Object.fromEntries(
    criteria.map((criterion) => [
      criterion.id,
      normalizeComparisonValue({
        value: comparisons[criterion.id],
        field: `${field}.${criterion.id}`,
      }),
    ])
  );

const validateSelection = ({ criterionId, criterionIds, field }) => {
  if (criterionId !== "" && !criterionIds.includes(criterionId)) {
    throw createBadRequestError(
      "Selected criterion must be a valid leaf criterion id",
      { field }
    );
  }
};

const validateVector = ({
  selectionId,
  comparisons,
  criteria,
  field,
  requireValue,
}) => {
  if (selectionId === "") {
    for (const criterion of criteria) {
      if (comparisons[criterion.id] !== "") {
        throw createBadRequestError(
          "An unselected comparison vector must be empty",
          { field: `${field}.${criterion.id}` }
        );
      }
    }

    return;
  }

  if (comparisons[selectionId] !== 1) {
    throw createBadRequestError(
      "Selected criterion self-comparison must be 1",
      { field: `${field}.${selectionId}` }
    );
  }

  if (requireValue) {
    for (const criterion of criteria) {
      if (comparisons[criterion.id] === "") {
        throw createBadRequestError(
          "All BWM comparisons are required for submit",
          { field: `${field}.${criterion.id}` }
        );
      }
    }
  }
};

export const normalizePayload = ({
  payload,
  decisionContext,
  requireValue,
}) => {
  const criteria = resolveCriteria({ decisionContext });

  validatePayloadShape({ payload, criteria });

  const criterionIds = criteria.map((criterion) => criterion.id);
  const bestCriterionId = normalizeSelectionId({
    value: payload.bestCriterionId,
    field: "payload.bestCriterionId",
  });
  const worstCriterionId = normalizeSelectionId({
    value: payload.worstCriterionId,
    field: "payload.worstCriterionId",
  });
  const bestToOthers = normalizeComparisons({
    comparisons: payload.bestToOthers,
    criteria,
    field: "payload.bestToOthers",
  });
  const othersToWorst = normalizeComparisons({
    comparisons: payload.othersToWorst,
    criteria,
    field: "payload.othersToWorst",
  });

  validateSelection({
    criterionId: bestCriterionId,
    criterionIds,
    field: "payload.bestCriterionId",
  });
  validateSelection({
    criterionId: worstCriterionId,
    criterionIds,
    field: "payload.worstCriterionId",
  });

  if (requireValue && bestCriterionId === "") {
    throw createBadRequestError("Best criterion is required for submit", {
      field: "payload.bestCriterionId",
    });
  }

  if (requireValue && worstCriterionId === "") {
    throw createBadRequestError("Worst criterion is required for submit", {
      field: "payload.worstCriterionId",
    });
  }

  if (
    criteria.length > 1 &&
    bestCriterionId !== "" &&
    bestCriterionId === worstCriterionId
  ) {
    throw createBadRequestError(
      "Best and worst criteria must be different",
      { field: "payload.worstCriterionId" }
    );
  }

  validateVector({
    selectionId: bestCriterionId,
    comparisons: bestToOthers,
    criteria,
    field: "payload.bestToOthers",
    requireValue,
  });
  validateVector({
    selectionId: worstCriterionId,
    comparisons: othersToWorst,
    criteria,
    field: "payload.othersToWorst",
    requireValue,
  });

  const normalizedPayload = {
    bestCriterionId,
    worstCriterionId,
    bestToOthers,
    othersToWorst,
  };

  return normalizedPayload;
};
