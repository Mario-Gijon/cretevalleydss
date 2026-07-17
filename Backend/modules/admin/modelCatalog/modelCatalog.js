import { IssueModel } from "../../../models/IssueModels.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

export const mapIssueModelCatalogItem = (model) => {
  const id = toIdString(model._id);
  const isStale = model?.manifestSync?.isStale === true;
  const publicUsable =
    model.modelKind === "criteriaWeighting"
      ? model.visibleInCriteriaWeighting !== false && !isStale
      : model.visibleInIssueCreation !== false && !isStale;

  return {
    _id: id,
    id,
    name: model.name,
    apiModelKey: model.apiModelKey,
    modelKind: model.modelKind || null,
    implementationStatus: model.implementationStatus || "ready",
    publicUsable,
    protectedHistoricalModel: isStale,
    visibleInIssueCreation: model.visibleInIssueCreation !== false,
    visibleInCriteriaWeighting: model.visibleInCriteriaWeighting !== false,
    apiEndpoint: model.apiEndpoint,
    manifestSync: model.manifestSync,
    isMultiCriteria: model.isMultiCriteria,
    evaluationStructureKey: model.evaluationStructureKey,
    usesCriteriaWeights: model.usesCriteriaWeights === true,
    usesExpertWeights: model.usesExpertWeights === true,
    usesFuzzyCriteriaWeights: model.usesFuzzyCriteriaWeights === true,
    usesCriterionTypes: model.usesCriterionTypes === true,
    supportsConsensus: model.supportsConsensus === true,
    supportsConsensusSimulation: model.supportsConsensusSimulation === true,
    parameters: model.parameters,
    modelInputFields: model.modelInputFields,
    modelOutputFields: model.modelOutputFields,
    request: model.request,
    response: model.response,
    supportedExpressionDomains: model.supportedExpressionDomains,
    smallDescription: model.smallDescription,
    extendDescription: model.extendDescription,
    moreInfoUrl: model.moreInfoUrl,
  };
};

export const getModelCatalogSortRank = (model) => {
  const visibleInIssueCreation = model.visibleInIssueCreation !== false;
  const visibleInCriteriaWeighting = model.visibleInCriteriaWeighting !== false;
  const stale = model?.manifestSync?.isStale === true;

  if (visibleInIssueCreation && !stale) return 0;
  if (visibleInIssueCreation) return 1;
  if (visibleInCriteriaWeighting && !stale) return 2;
  if (visibleInCriteriaWeighting) return 3;

  return 4;
};

export const sortModelCatalogItems = (models) =>
  [...models].sort((left, right) => {
    const rankDifference =
      getModelCatalogSortRank(left) - getModelCatalogSortRank(right);

    if (rankDifference !== 0) return rankDifference;

    return left.name.localeCompare(right.name);
  });

export const getAdminModelCatalog = async (
  { issueModelModel = IssueModel } = {}
) => {
  const models = await issueModelModel.find().select("-__v").lean();

  return {
    models: sortModelCatalogItems(models.map(mapIssueModelCatalogItem)),
  };
};

export const updateAdminModelCatalogVisibility = async (
  {
    modelId,
    visibleInIssueCreation,
    visibleInCriteriaWeighting,
  },
  {
    issueModelModel = IssueModel,
    isValidModelId = isValidObjectIdLike,
  } = {}
) => {
  if (!modelId || !isValidModelId(modelId)) {
    throw createBadRequestError("Valid model id is required", {
      field: "id",
    });
  }

  const hasIssueVisibility = typeof visibleInIssueCreation === "boolean";
  const hasCriteriaVisibility =
    typeof visibleInCriteriaWeighting === "boolean";

  if (!hasIssueVisibility && !hasCriteriaVisibility) {
    throw createBadRequestError(
      "visibleInIssueCreation or visibleInCriteriaWeighting must be boolean",
      {
        field: "visibleInIssueCreation",
      }
    );
  }

  const currentModel = await issueModelModel.findById(modelId);

  if (!currentModel) {
    throw createNotFoundError("Model not found", {
      field: "id",
    });
  }

  const isProtectedHistoricalModel =
    currentModel?.manifestSync?.isStale === true;
  const isIssueModel = currentModel?.modelKind === "issue";
  const isCriteriaWeightingModel =
    currentModel?.modelKind === "criteriaWeighting";

  if (isIssueModel && visibleInCriteriaWeighting === true) {
    throw createBadRequestError(
      "This visibility flag is not applicable to the selected model kind.",
      {
        code: "MODEL_VISIBILITY_NOT_APPLICABLE",
        field: "visibleInCriteriaWeighting",
      }
    );
  }

  if (isCriteriaWeightingModel && visibleInIssueCreation === true) {
    throw createBadRequestError(
      "This visibility flag is not applicable to the selected model kind.",
      {
        code: "MODEL_VISIBILITY_NOT_APPLICABLE",
        field: "visibleInIssueCreation",
      }
    );
  }

  if (
    isProtectedHistoricalModel &&
    ((hasIssueVisibility && visibleInIssueCreation === true) ||
      (hasCriteriaVisibility && visibleInCriteriaWeighting === true))
  ) {
    throw createBadRequestError(
      "This model is no longer present in the DecisionModelsService manifest and is kept only because existing issues reference it.",
      {
        code: "PROTECTED_HISTORICAL_MODEL_NOT_ACTIVABLE",
        field:
          hasIssueVisibility && visibleInIssueCreation === true
            ? "visibleInIssueCreation"
            : "visibleInCriteriaWeighting",
      }
    );
  }

  const visibilityUpdate = {};
  if (hasIssueVisibility) {
    visibilityUpdate.visibleInIssueCreation = visibleInIssueCreation;
  }
  if (hasCriteriaVisibility) {
    visibilityUpdate.visibleInCriteriaWeighting =
      visibleInCriteriaWeighting;
  }

  currentModel.set(visibilityUpdate);
  await currentModel.save();

  const model = await issueModelModel
    .findById(currentModel._id)
    .select("-__v")
    .lean();

  return {
    model: mapIssueModelCatalogItem(model),
  };
};
