import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { Issue } from "../../../models/Issues.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import {
  persistPreparedIssueCreation,
  prepareIssueCreation,
} from "../../../modules/issues/creation/createIssue.js";
import {
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
  persistPreparedIssueCreationInTransaction,
} from "../../setup/fixtures.js";
import {
  buildIssueInfo,
  createPrometheeFixtures,
  createRemappedPrometheeRequestPayload,
} from "./criterionParameterIdRemappingFixture.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("criterion-keyed model parameter remapping during issue creation", () => {
  it("persists numeric boundary profiles with remapped criterion ids and creation snapshot identity", async () => {
    const owner = await createConfirmedUser({
      email: "boundary-profile-owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "boundary-profile-expert@example.com",
    });
    const model = await createIssueModel({
      name: "Boundary profile parameter persistence",
      parameters: [
        {
          key: "classOrder",
          name: "Class order",
          parameterStructureKey: "orderedCategories",
          required: true,
        },
        {
          key: "profiles",
          name: "Boundary profiles",
          parameterStructureKey: "boundaryProfiles",
          required: true,
        },
      ],
    });
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
      numericRange: { min: 0, max: 10, step: 1 },
    });
    const sourceIds = { quality: "temporary-quality", cost: "temporary-cost" };
    const issueInfo = buildIssueInfo({
      model,
      domain,
      expert,
      criteria: [
        {
          id: "temporary-quality-group",
          name: "Quality group",
          type: "group",
          children: [
            {
              id: sourceIds.quality,
              name: "Quality",
              type: "benefit",
              children: [],
            },
          ],
        },
        {
          id: sourceIds.cost,
          name: "Cost",
          type: "cost",
          children: [],
        },
      ],
      paramValues: {
        classOrder: [
          { categoryId: "basic", label: "Basic", order: 0 },
          { categoryId: "premium", label: "Premium", order: 1 },
        ],
        profiles: {
          profiles: [
            {
              profileId: "basic-premium-boundary",
              categoryId: "premium",
              valuesByCriterionId: {
                [sourceIds.cost]: 4,
                [sourceIds.quality]: 7,
              },
            },
          ],
        },
      },
    });

    const prepared = await prepareIssueCreation({ ownerUserId: owner._id, issueInfo });
    await persistPreparedIssueCreationInTransaction(prepared);

    const issue = await Issue.findOne({ name: "Example issue" }).lean();
    const leaves = await Criterion.find({ issue: issue._id, isLeaf: true }).lean();
    const idByName = Object.fromEntries(
      leaves.map((criterion) => [criterion.name, String(criterion._id)])
    );
    const expectedProfiles = {
      profiles: [
        {
          profileId: "basic-premium-boundary",
          categoryId: "premium",
          valuesByCriterionId: {
            [idByName.Quality]: 7,
            [idByName.Cost]: 4,
          },
        },
      ],
    };
    expect(issue.modelParameters.profiles).toEqual(expectedProfiles);

    const snapshot = await IssueStateSnapshot.findOne({
      issue: issue._id,
      snapshotType: "creation",
    }).lean();
    expect(snapshot.state.issue.effectiveModelParameters.profiles).toEqual(
      expectedProfiles
    );
    expect(snapshot.state.issue.effectiveModelParameters.classOrder).toEqual(
      issue.modelParameters.classOrder
    );
    expect(snapshot.state.model.parameters).toHaveLength(2);

    await IssueModel.updateOne({ _id: model._id }, { $set: { parameters: [] } });
    const unchangedSnapshot = await IssueStateSnapshot.findOne({
      issue: issue._id,
      snapshotType: "creation",
    }).lean();
    const unchangedIssue = await Issue.findById(issue._id).lean();
    expect(unchangedSnapshot.state.model.parameters).toHaveLength(2);
    expect(unchangedSnapshot.state.issue.effectiveModelParameters.profiles).toEqual(
      expectedProfiles
    );
    expect(unchangedIssue.modelParameters.profiles).toEqual(expectedProfiles);
  }, 20000);

  it("rejects profiles outside assigned numeric domains before persistence", async () => {
    const owner = await createConfirmedUser({ email: "boundary-invalid-owner@example.com" });
    const expert = await createConfirmedUser({ email: "boundary-invalid-expert@example.com" });
    const model = await createIssueModel({
      parameters: [
        {
          key: "classOrder",
          name: "Class order",
          parameterStructureKey: "orderedCategories",
          required: true,
        },
        {
          key: "profiles",
          name: "Boundary profiles",
          parameterStructureKey: "boundaryProfiles",
          required: true,
        },
      ],
    });
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
      numericRange: { min: 0, max: 10, step: 1 },
    });
    const issueInfo = buildIssueInfo({
      model,
      domain,
      expert,
      criteria: [{
        id: "temporary-quality",
        name: "Quality",
        type: "benefit",
        children: [],
      }],
      paramValues: {
        classOrder: [
          { categoryId: "basic", label: "Basic", order: 0 },
          { categoryId: "premium", label: "Premium", order: 1 },
        ],
        profiles: {
          profiles: [{
            profileId: "basic-premium-boundary",
            categoryId: "premium",
            valuesByCriterionId: { "temporary-quality": 11 },
          }],
        },
      },
    });

    await expect(prepareIssueCreation({ ownerUserId: owner._id, issueInfo })).rejects.toThrow(
      "must be within its expression domain [0, 10]"
    );
    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  }, 20000);

  it("remaps added, nested, and reordered criteria to Mongo ids for PROMETHEE VI", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const { issue, payload, idByName, inputIds, valuesByParameter } =
      await createRemappedPrometheeRequestPayload({ owner, expert, model, domain });
    expect(Object.values(idByName).every((id) => !Object.values(inputIds).includes(id))).toBe(true);
    expect(payload.context.criteria.map(({ name }) => name)).toEqual([
      "Cost",
      "Reliability",
      "Quality",
    ]);
    expect(payload.modelParameters).toEqual(issue.modelParameters);

    for (const [parameterKey, byName] of Object.entries(valuesByParameter)) {
      for (const [name, value] of Object.entries(byName)) {
        const criterionName = `${name[0].toUpperCase()}${name.slice(1)}`;
        expect(issue.modelParameters[parameterKey][idByName[criterionName]]).toBe(value);
      }
      expect(Object.keys(issue.modelParameters[parameterKey]).sort()).toEqual(
        Object.values(idByName).sort()
      );
    }

    expect(payload.context.criteria.map(({ id }) => id)).toEqual([
      idByName.Cost,
      idByName.Reliability,
      idByName.Quality,
    ]);
  }, 20000);

  it("rejects values left behind for a criterion deleted before submission", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const issueInfo = buildIssueInfo({
      model,
      domain,
      expert,
      criteria: [{
        id: "temporary-kept",
        name: "Kept criterion",
        type: "benefit",
        children: [],
      }],
      paramValues: {
        q: { "temporary-kept": 0.05, "temporary-removed": 0.1 },
      },
    });

    await expect(prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo,
    })).rejects.toThrow("contains unknown criterion key 'temporary-removed'");
    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
  });

  it("rejects direct persistence without an active transaction before writing", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const preparedIssueCreation = await prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [{
          id: "temporary-quality",
          name: "Quality",
          type: "benefit",
          children: [],
        }],
        paramValues: {},
      }),
    });

    await expect(persistPreparedIssueCreation({
      preparedIssueCreation,
    })).rejects.toMatchObject({
      field: "session",
      message: "Issue creation persistence requires an active MongoDB transaction",
    });

    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  });

  it("rolls back alternatives and criteria when issue persistence fails", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const preparedIssueCreation = await prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [{
          id: "temporary-quality",
          name: "Quality",
          type: "benefit",
          children: [],
        }],
        paramValues: {},
      }),
    });
    const session = await mongoose.startSession();
    const issueSaveError = new Error("forced issue save failure");
    const alternativeInsert = vi.spyOn(Alternative, "insertMany");
    const criterionInsert = vi.spyOn(Criterion, "insertMany");
    vi.spyOn(Issue.prototype, "save").mockRejectedValueOnce(issueSaveError);

    try {
      await expect(session.withTransaction(() => persistPreparedIssueCreation({
        preparedIssueCreation,
        session,
      }))).rejects.toBe(issueSaveError);
    } finally {
      await session.endSession();
    }

    expect(alternativeInsert).toHaveBeenCalledOnce();
    expect(criterionInsert).toHaveBeenCalledOnce();
    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  });

  it("rejects ambiguous criterion identities before writing documents", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const sharedId = "temporary-duplicate-identity";

    const preparedIssueCreation = await prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [{
          id: sharedId,
          name: "Group",
          type: "group",
          children: [{
            id: sharedId,
            name: "Criterion",
            type: "benefit",
            children: [],
          }],
        }],
        paramValues: {},
      }),
    });
    await expect(persistPreparedIssueCreationInTransaction(
      preparedIssueCreation
    )).rejects.toThrow("is duplicated and cannot be remapped");

    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  });
});
