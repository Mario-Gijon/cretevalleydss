import { describe, expect, it } from "vitest";

import { buildExpressionDomainAssignmentsByCriterionIdOrThrow } from "../../../modules/expressionDomains/buildIssueDomainConfig.js";
import { buildScenarioCriteriaWithExpressionDomainsOrThrow } from "../../../modules/issues/scenarios/buildScenarioExecutionContext.js";

const continuousDomain = {
  _id: "domain-continuous",
  name: "Continuous scale",
  typeKey: "numericContinuous",
  definition: { min: 0, max: 10, precision: 2 },
};

const linguisticDomain = {
  _id: "domain-linguistic",
  name: "Satisfaction",
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", index: 0, values: [0, 0.25, 0.5] },
      { key: "high", label: "High", index: 1, values: [0.5, 0.75, 1] },
    ],
  },
};

const criterion = ({ id, name, type, expressionDomain }) => ({
  _id: id,
  name,
  type,
  expressionDomain,
});

const serialize = ({ criteria, snapshots }) => {
  const assignments = buildExpressionDomainAssignmentsByCriterionIdOrThrow({
    leafCriteria: criteria,
  });
  return buildScenarioCriteriaWithExpressionDomainsOrThrow({
    criteria,
    domainAssignmentsByCriterion: assignments,
    domainSnapshotsById: new Map(snapshots.map((snapshot) => [snapshot._id, snapshot])),
    issueId: "issue-1",
  });
};

describe("scenario criterion expression-domain serialization", () => {
  it("serializes the complete immutable numeric domain snapshot for every criterion sharing it", () => {
    const criteria = [
      criterion({ id: "criterion-cost", name: "Cost", type: "cost", expressionDomain: "domain-continuous" }),
      criterion({ id: "criterion-quality", name: "Quality", type: "benefit", expressionDomain: "domain-continuous" }),
    ];

    const serialized = serialize({ criteria, snapshots: [continuousDomain] });

    expect(serialized.map((item) => item.id)).toEqual(["criterion-cost", "criterion-quality"]);
    expect(serialized.map((item) => item.expressionDomain)).toEqual([
      { id: "domain-continuous", name: "Continuous scale", typeKey: "numericContinuous", definition: { min: 0, max: 10, precision: 2 } },
      { id: "domain-continuous", name: "Continuous scale", typeKey: "numericContinuous", definition: { min: 0, max: 10, precision: 2 } },
    ]);
  });

  it("associates heterogeneous snapshots by criterion and domain IDs rather than array position", () => {
    const criteria = [
      criterion({ id: "criterion-quality", name: "Quality", type: "benefit", expressionDomain: "domain-linguistic" }),
      criterion({ id: "criterion-cost", name: "Cost", type: "cost", expressionDomain: "domain-continuous" }),
    ];

    const serialized = serialize({ criteria, snapshots: [continuousDomain, linguisticDomain] });

    expect(serialized.map((item) => item.id)).toEqual(["criterion-quality", "criterion-cost"]);
    expect(serialized.map((item) => item.expressionDomain.id)).toEqual(["domain-linguistic", "domain-continuous"]);
    expect(serialized[0].expressionDomain.definition).toEqual(linguisticDomain.definition);
    expect(JSON.parse(JSON.stringify(serialized[0].expressionDomain.definition))).toEqual(linguisticDomain.definition);
    expect(serialized[0].expressionDomain.definition).not.toBe(linguisticDomain.definition);
  });

  it("fails safely when an assigned immutable snapshot cannot be resolved", () => {
    const criteria = [
      criterion({ id: "criterion-quality", name: "Quality", type: "benefit", expressionDomain: "domain-missing" }),
    ];
    const assignments = buildExpressionDomainAssignmentsByCriterionIdOrThrow({ leafCriteria: criteria });

    expect(() => buildScenarioCriteriaWithExpressionDomainsOrThrow({
      criteria,
      domainAssignmentsByCriterion: assignments,
      domainSnapshotsById: new Map(),
      issueId: "issue-1",
    })).toThrow(/could not be resolved/);
  });
});
