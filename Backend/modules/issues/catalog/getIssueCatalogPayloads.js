import { IssueModel } from "../../../models/IssueModels.js";
import { User } from "../../../models/Users.js";
import { isIssueModelExecutionAllowed } from "../issueModelUsability.js";

export const getAvailableIssueModelsPayload = async () => {
  const models = await IssueModel.find({
    $and: [
      {
        $or: [
          {
            modelKind: "issue",
            visibleInIssueCreation: true,
          },
          {
            modelKind: "criteriaWeighting",
            visibleInCriteriaWeighting: true,
          },
        ],
      },
      { "manifestSync.isStale": false },
    ],
  })
    .select("-__v")
    .lean();

  return {
    models: models.filter((model) => {
      if (model.modelKind !== "issue") return false;
      return isIssueModelExecutionAllowed(model);
    }),
    criteriaWeightingModels: models.filter(
      (model) => model.modelKind === "criteriaWeighting"
    ),
  };
};

export const getConfirmedUsersCatalogPayload = async () =>
  User.find({
    accountConfirm: true,
    isDeleted: { $ne: true },
  })
    .select("-_id name university email")
    .lean();
