import { createBadRequestError } from "../../../../../../utils/common/errors.js";

const EVALUATION_SAVE_MODES = Object.freeze({
  DRAFT: "draft",
  SUBMIT: "submit",
});

export const validateBestWorstSaveModeOrThrow = (mode) => {
  if (
    mode === EVALUATION_SAVE_MODES.DRAFT ||
    mode === EVALUATION_SAVE_MODES.SUBMIT
  ) {
    return;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};

export const validateSubmittedBestWorstCriteriaOrThrow = ({
  criterionItems,
  payload,
}) => {
  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = payload;
  const criterionIds = criterionItems.map((criterion) => criterion.id);

  if (!bestCriterion) {
    throw createBadRequestError("bestCriterion is required", {
      field: "payload.bestCriterion",
    });
  }

  if (!worstCriterion) {
    throw createBadRequestError("worstCriterion is required", {
      field: "payload.worstCriterion",
    });
  }

  if (!criterionIds.includes(bestCriterion)) {
    throw createBadRequestError("bestCriterion must be a valid criterion id", {
      field: "payload.bestCriterion",
    });
  }

  if (!criterionIds.includes(worstCriterion)) {
    throw createBadRequestError("worstCriterion must be a valid criterion id", {
      field: "payload.worstCriterion",
    });
  }

  if (criterionIds.length > 1 && bestCriterion === worstCriterion) {
    throw createBadRequestError(
      "bestCriterion and worstCriterion must be different",
      {
        field: "payload.worstCriterion",
      }
    );
  }

  for (const criterion of criterionItems) {
    const bestToOthersValue = Number(bestToOthers[criterion.id]);
    const othersToWorstValue = Number(othersToWorst[criterion.id]);

    if (
      criterion.id !== bestCriterion &&
      (!Number.isInteger(bestToOthersValue) ||
        bestToOthersValue < 1 ||
        bestToOthersValue > 9)
    ) {
      throw createBadRequestError(
        `bestToOthers['${criterion.id}'] for '${criterion.name}' must be an integer between 1 and 9`,
        {
          field: "payload.bestToOthers",
        }
      );
    }

    if (
      criterion.id !== worstCriterion &&
      (!Number.isInteger(othersToWorstValue) ||
        othersToWorstValue < 1 ||
        othersToWorstValue > 9)
    ) {
      throw createBadRequestError(
        `othersToWorst['${criterion.id}'] for '${criterion.name}' must be an integer between 1 and 9`,
        {
          field: "payload.othersToWorst",
        }
      );
    }
  }

  if (Number(bestToOthers[bestCriterion]) !== 1) {
    throw createBadRequestError("bestToOthers[bestCriterion] must be 1", {
      field: "payload.bestToOthers",
    });
  }

  if (Number(othersToWorst[worstCriterion]) !== 1) {
    throw createBadRequestError("othersToWorst[worstCriterion] must be 1", {
      field: "payload.othersToWorst",
    });
  }
};
