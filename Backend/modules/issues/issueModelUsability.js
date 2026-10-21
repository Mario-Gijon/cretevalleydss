import { createBadRequestError } from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";

export const isIssueModelUsable = (model) =>
  Boolean(model) &&
  model.implementationStatus === "ready" &&
  model.publicUsable === true &&
  model.manifestSync?.isStale !== true;

export const assertIssueModelUsableOrThrow = (
  model,
  { field = "selectedModelId" } = {}
) => {
  if (isIssueModelUsable(model)) return model;

  throw createBadRequestError(
    "Selected model is not ready for issue execution",
    {
      code: "ISSUE_MODEL_NOT_USABLE",
      field,
      details: {
        implementationStatus: model?.implementationStatus ?? null,
        publicUsable: model?.publicUsable ?? null,
        manifestSyncIsStale: model?.manifestSync?.isStale === true,
      },
    }
  );
};

export const assertPopulatedIssueModelUsableOrThrow = (
  issue,
  { field = "selectedModelId" } = {}
) => {
  const populatedModelId =
    typeof issue?.populated === "function"
      ? issue.populated("model")
      : null;
  const model = issue?.model;

  if (
    !populatedModelId ||
    !model ||
    typeof model !== "object" ||
    !model._id ||
    !sameId(populatedModelId, model._id)
  ) {
    return assertIssueModelUsableOrThrow(null, { field });
  }

  return assertIssueModelUsableOrThrow(model, { field });
};
