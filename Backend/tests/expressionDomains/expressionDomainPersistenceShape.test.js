import { describe, expect, it, vi } from "vitest";

import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { createIssueDomainSnapshots } from "../../modules/expressionDomains/createIssueDomainSnapshots.js";

describe("expression domain persistence shape", () => {
  it("ExpressionDomain schema has no family path", () => {
    expect(ExpressionDomain.schema.path("family")).toBeUndefined();
  });

  it("IssueExpressionDomain schema has no family path", () => {
    expect(IssueExpressionDomain.schema.path("family")).toBeUndefined();
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
