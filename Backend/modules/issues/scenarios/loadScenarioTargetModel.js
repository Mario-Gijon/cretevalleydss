import { IssueModel } from "../../../models/IssueModels.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

export const getTargetScenarioModelOrThrow = async ({ targetModelId }) => {
  if (typeof targetModelId !== "string") {
    throw createBadRequestError("targetModelId is required", {
      field: "targetModelId",
    });
  }

  const cleanTargetModelId = targetModelId.trim();

  if (!cleanTargetModelId) {
    throw createBadRequestError("targetModelId is required", {
      field: "targetModelId",
    });
  }

  if (!isValidObjectIdLike(cleanTargetModelId)) {
    throw createBadRequestError("targetModelId must be a valid id", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  const targetModel = await IssueModel.findById(cleanTargetModelId);

  if (!targetModel) {
    throw createBadRequestError("Target model not found", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  if (targetModel.modelKind !== "issue") {
    throw createBadRequestError("Target model is not available for issue simulation", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  if (targetModel.manifestSync.isStale === true) {
    throw createBadRequestError(
      "Target model is missing from the current manifest and cannot be used for simulation",
      {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    }
    );
  }

  return targetModel;
};
