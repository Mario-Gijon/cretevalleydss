import { createBadRequestError } from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";
import { resolveResultStructureMetadata } from "../decisionPlugins/resultStructureMetadata.js";
import {
  isResultStructureCapabilityEnabled,
  RESULT_STRUCTURE_REGISTRY,
} from "../decisionPlugins/resultStructures/resultStructureRegistry.js";

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

export const isIssueModelExecutionAllowed = (
  model,
  { resultStructureRegistry = RESULT_STRUCTURE_REGISTRY } = {}
) => {
  if (
    !isIssueModelUsable(model) ||
    model.modelKind !== "issue" ||
    model.issueExecutionAuthorized !== true
  ) {
    return false;
  }

  try {
    const resultStructure = resolveResultStructureMetadata(model, {
      registry: resultStructureRegistry,
    });
    return isResultStructureCapabilityEnabled({
      ...resultStructure,
      capability: "issueExecution",
      registry: resultStructureRegistry,
    });
  } catch {
    return false;
  }
};

export const assertIssueModelExecutionAuthorizedOrThrow = (
  model,
  { field = "selectedModelId" } = {}
) => {
  assertIssueModelUsableOrThrow(model, { field });

  if (model.modelKind !== "issue") {
    throw createBadRequestError("Selected model is not an issue Decision Plugin", {
      code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
      field,
    });
  }

  if (model.issueExecutionAuthorized !== true) {
    throw createBadRequestError(
      "Selected model is not authorized for issue execution",
      {
        code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
        field,
        details: { issueExecutionAuthorized: model.issueExecutionAuthorized ?? null },
      }
    );
  }

  return model;
};

export const assertResultStructureIssueExecutionEnabledOrThrow = (
  model,
  {
    field = "resultStructureKey",
    resultStructureRegistry = RESULT_STRUCTURE_REGISTRY,
  } = {}
) => {
  const resultStructure = resolveResultStructureMetadata(model, {
    registry: resultStructureRegistry,
  });
  if (
    !isResultStructureCapabilityEnabled({
      ...resultStructure,
      capability: "issueExecution",
      registry: resultStructureRegistry,
    })
  ) {
    throw createBadRequestError(
      "The selected result structure is not enabled for model execution",
      { field }
    );
  }

  return model;
};

export const assertIssueModelExecutionAllowedOrThrow = (
  model,
  { field = "selectedModelId", resultStructureRegistry = RESULT_STRUCTURE_REGISTRY } = {}
) => {
  assertIssueModelExecutionAuthorizedOrThrow(model, { field });
  return assertResultStructureIssueExecutionEnabledOrThrow(model, {
    field: "resultStructureKey",
    resultStructureRegistry,
  });
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
