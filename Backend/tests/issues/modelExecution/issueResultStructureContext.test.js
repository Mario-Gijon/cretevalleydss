import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { IssueModel } from "../../../models/IssueModels.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { buildIssueResultStructureContextOrThrow } from "../../../modules/issues/modelExecution/buildIssueResultStructureContext.js";
import { writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import {
  createConfirmedUser,
  createIssueFixture,
  createIssueModel,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const categoryDefinition = {
  key: "categories",
  name: "Categories",
  label: "Categories",
  parameterStructureKey: "orderedCategories",
  required: true,
  default: [
    { categoryId: "low", label: "Low", order: 0 },
    { categoryId: "high", label: "High", order: 1 },
  ],
};

describe("issue result structure parameter context", () => {
  it("uses persisted categories and creation-snapshot definitions after the model catalog changes", async () => {
    const owner = await createConfirmedUser();
    const model = await createIssueModel({
      name: "Sorting categories context fixture",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      parameters: [categoryDefinition],
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      modelId: model._id,
      currentStage: "alternativeEvaluation",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      modelParameters: {
        categories: [
          { categoryId: "high", label: "High", order: 1 },
          { categoryId: "low", label: "Low", order: 0 },
        ],
      },
    });
    const snapshot = await writeIssueStateSnapshot({
      issue,
      snapshotType: "creation",
      occurredAt: new Date(),
      correlationId: new mongoose.Types.ObjectId().toString(),
    });

    expect(issue.modelParameters.categories).toEqual([
      { categoryId: "high", label: "High", order: 1 },
      { categoryId: "low", label: "Low", order: 0 },
    ]);
    expect(snapshot.state.issue.effectiveModelParameters.categories).toEqual(
      issue.modelParameters.categories
    );
    expect(snapshot.state.model.parameters).toContainEqual(
      expect.objectContaining({
        key: "categories",
        parameterStructureKey: "orderedCategories",
        default: categoryDefinition.default,
      })
    );

    await IssueModel.updateOne({ _id: model._id }, { $set: { parameters: [] } });
    const resultContext = await buildIssueResultStructureContextOrThrow({ issue });
    expect(resultContext).toEqual({
      authorizedCategories: [
        { categoryId: "low", label: "Low", order: 0 },
        { categoryId: "high", label: "High", order: 1 },
      ],
    });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(1);
  });

  it("requires a creation snapshot before it can authorize categories", async () => {
    const owner = await createConfirmedUser();
    const model = await createIssueModel({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      parameters: [categoryDefinition],
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      modelId: model._id,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      modelParameters: { categories: categoryDefinition.default },
    });

    await expect(buildIssueResultStructureContextOrThrow({ issue })).rejects.toMatchObject({
      message: "Creation snapshot does not contain the model parameter definitions required by the result structure",
    });
  });
});
