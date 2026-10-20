import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { Issue } from "../../../models/Issues.js";
import {
  persistPreparedIssueCreation,
  prepareIssueCreation,
} from "../../../modules/issues/creation/createIssue.js";
import {
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
