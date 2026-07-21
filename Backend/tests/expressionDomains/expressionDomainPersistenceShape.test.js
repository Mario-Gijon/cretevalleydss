import { describe, expect, it, vi } from "vitest";

import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { createIssueDomainSnapshots } from "../../modules/expressionDomains/createIssueDomainSnapshots.js";
import { serializeExpressionDomain } from "../../modules/expressionDomains/serializeExpressionDomain.js";

describe("expression domain persistence shape", () => {
  it("ExpressionDomain schema has no family path", () => {
    expect(ExpressionDomain.schema.path("family")).toBeUndefined();
  });

  it("uses owner-only persistence and standard timestamps", () => {
    expect(ExpressionDomain.schema.path("owner")).toBeDefined();
    expect(ExpressionDomain.schema.path("user")).toBeUndefined();
    expect(ExpressionDomain.schema.path("isGlobal")).toBeUndefined();
    expect(ExpressionDomain.schema.path("locked")).toBeUndefined();
    expect(ExpressionDomain.schema.path("createdAt")).toBeDefined();
    expect(ExpressionDomain.schema.path("updatedAt")).toBeDefined();
    expect(ExpressionDomain.schema.indexes()).toEqual(expect.arrayContaining([
      [
        { owner: 1, name: 1 },
        expect.objectContaining({
          unique: true,
          name: "expression_domain_owner_name_unique",
          partialFilterExpression: { owner: { $type: "objectId" } },
        }),
      ],
      [
        { name: 1 },
        expect.objectContaining({
          unique: true,
          name: "expression_domain_global_name_unique",
          partialFilterExpression: { owner: null },
        }),
      ],
    ]));
  });

  it("IssueExpressionDomain schema has no family path", () => {
    expect(IssueExpressionDomain.schema.path("family")).toBeUndefined();
  });

  it("requires sourceDomain on every issue snapshot", () => {
    expect(IssueExpressionDomain.schema.path("sourceDomain").isRequired).toBe(true);
  });

  it("derives global presentation fields without exposing persistence ownership", () => {
    expect(serializeExpressionDomain({
      _id: "global-domain",
      owner: null,
      name: "Global",
      typeKey: "numericContinuous",
      definition: {},
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    })).toMatchObject({
      id: "global-domain",
      ownerId: null,
      isGlobal: true,
      locked: true,
    });
  });

  it("createIssueDomainSnapshots omits family from the persisted snapshot payload", async () => {
    const insertManySpy = vi
      .spyOn(IssueExpressionDomain, "insertMany")
      .mockResolvedValue([]);

    await createIssueDomainSnapshots({
      issueId: "issue-1",
      domainDocs: [
        {
          _id: "domain-1",
          name: "Continuous 0-1",
          typeKey: "numericContinuous",
          family: "numeric",
          definition: {
            min: 0,
            max: 1,
            step: null,
          },
        },
      ],
      session: null,
    });

    expect(insertManySpy).toHaveBeenCalledWith(
      [
        {
          issue: "issue-1",
          sourceDomain: "domain-1",
          name: "Continuous 0-1",
          typeKey: "numericContinuous",
          definition: {
            min: 0,
            max: 1,
            step: null,
          },
        },
      ],
      {
        session: null,
        ordered: true,
      }
    );

    insertManySpy.mockRestore();
  });
});
