import { createBadRequestError } from "../../utils/common/errors.js";

export const isIssueModelUsable = (model) =>
  Boolean(model) &&
  model.implementationStatus === "ready" &&
  model.publicUsable === true;

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
      },
    }
  );
};
