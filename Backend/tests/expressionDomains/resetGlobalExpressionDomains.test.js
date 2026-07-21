import { describe, expect, it } from "vitest";

import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { resetGlobalExpressionDomains } from "../../modules/expressionDomains/resetGlobalExpressionDomains.js";
import { getExpressionDomainsPayload } from "../../modules/expressionDomains/getExpressionDomains.js";
import {
  createConfirmedUser,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

describe("resetGlobalExpressionDomains", () => {
  it("replaces only global domains and preserves user domains and snapshots", async () => {
    const owner = await createConfirmedUser({ email: "domain-owner@example.com" });
    const issue = await createIssueFixture({ ownerId: owner._id });
    const userDomain = await ExpressionDomain.create({
      owner: owner._id,
      name: "User domain",
      typeKey: "numericDiscrete",
      definition: { min: 1, max: 5, step: 1 },
    });
    const snapshot = await createIssueExpressionDomainSnapshotFixture({
      issueId: issue._id,
      sourceDomain: userDomain._id,
      name: "Snapshot domain",
      type: "numeric",
      numericRange: { min: 2, max: 8, step: 2 },
    });
    await ExpressionDomain.create([
      {
        owner: null,
        name: "Obsolete global",
        typeKey: "legacyType",
        definition: { legacy: true },
      },
      {
        owner: null,
        name: "Malformed global",
        typeKey: "numericDiscrete",
        definition: { min: 9, max: 1, step: 0 },
      },
    ]);

    const originalIssue = await Issue.findById(issue._id).lean();
    const originalUserDomain = await ExpressionDomain.findById(userDomain._id).lean();
    const originalSnapshot = await IssueExpressionDomain.findById(snapshot._id).lean();

    const result = await resetGlobalExpressionDomains();

    expect(result).toEqual({
      deletedCount: 2,
      insertedCount: 4,
      insertedNames: [
        "Continuous 0-1",
        "Discrete 0-9",
        "Ordinal 5",
        "Fuzzy Linguistic 5",
      ],
    });

    expect(await ExpressionDomain.countDocuments({ owner: null })).toBe(4);
    expect(await ExpressionDomain.find({ owner: null }).select("-createdAt -updatedAt -_id").lean()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner: null,
          name: "Continuous 0-1",
          typeKey: "numericContinuous",
          definition: { min: 0, max: 1, step: null },
        }),
        expect.objectContaining({
          owner: null,
          name: "Discrete 0-9",
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 9, step: 1 },
        }),
        expect.objectContaining({
          name: "Ordinal 5",
          typeKey: "linguisticOrdinal",
          definition: {
            labelCount: 5,
            labels: [
              { key: "very_low", label: "Very Low", index: 0 },
              { key: "low", label: "Low", index: 1 },
              { key: "medium", label: "Medium", index: 2 },
              { key: "high", label: "High", index: 3 },
              { key: "very_high", label: "Very High", index: 4 },
            ],
          },
        }),
        expect.objectContaining({
          name: "Fuzzy Linguistic 5",
          typeKey: "linguisticFuzzy",
          definition: {
            membershipFunction: "triangular",
            labelCount: 5,
            labels: [
              { key: "very_low", label: "Very Low", values: [0, 0, 0.25], index: 0 },
              { key: "low", label: "Low", values: [0, 0.25, 0.5], index: 1 },
              { key: "medium", label: "Medium", values: [0.25, 0.5, 0.75], index: 2 },
              { key: "high", label: "High", values: [0.5, 0.75, 1], index: 3 },
              { key: "very_high", label: "Very High", values: [0.75, 1, 1], index: 4 },
            ],
          },
        }),
      ])
    );
    expect(await ExpressionDomain.findById(userDomain._id).lean()).toEqual(originalUserDomain);
    expect(await IssueExpressionDomain.findById(snapshot._id).lean()).toEqual(originalSnapshot);
    expect(await Issue.findById(issue._id).lean()).toEqual(originalIssue);

    const secondResult = await resetGlobalExpressionDomains();
    expect(secondResult).toEqual({
      deletedCount: 4,
      insertedCount: 4,
      insertedNames: result.insertedNames,
    });
    expect(await ExpressionDomain.countDocuments({ owner: null })).toBe(4);

    await ExpressionDomain.create({
      owner: owner._id,
      name: "Second user domain",
      typeKey: "numericContinuous",
      definition: { min: 0, max: 1, step: null },
    });
    const domainsPayload = await getExpressionDomainsPayload({ userId: owner._id });
    expect(domainsPayload.globals).toHaveLength(4);
    expect(domainsPayload.globals.every(({ ownerId }) => ownerId === null)).toBe(true);
    expect(domainsPayload.userDomains).toHaveLength(2);
    expect(domainsPayload.userDomains.map(({ _id }) => _id)).toContain(String(userDomain._id));
  });
});
