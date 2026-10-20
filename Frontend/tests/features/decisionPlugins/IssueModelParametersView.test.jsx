import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IssueModelParametersView from "../../../src/features/modelParameters/components/IssueModelParametersView.jsx";

const parameter = {
  key: "alpha",
  label: "Alpha",
  valueType: "number",
  parameterStructureKey: "numberGlobal",
  required: true,
  default: 0.5,
  restrictions: { min: 0, max: 1, allowed: null },
};

const renderView = (values) =>
  render(
    <IssueModelParametersView
      parameters={[parameter]}
      values={values}
      parameterContext={{
        alternatives: [],
        criteriaTree: [],
        leafCriteria: [],
      }}
    />
  );

describe("IssueModelParametersView numberGlobal ownership", () => {
  it("resolves a declared default before passing the value to read-only rendering", () => {
    renderView({});
    expect(screen.getByText("0.5")).toBeInTheDocument();
  });

  it("prefers stored zero and scenario override values", () => {
    const { rerender } = renderView({ alpha: 0 });
    expect(screen.getByText("0")).toBeInTheDocument();

    rerender(
      <IssueModelParametersView
        parameters={[parameter]}
        values={{ alpha: -0.125 }}
        parameterContext={{
          alternatives: [],
          criteriaTree: [],
          leafCriteria: [],
        }}
      />
    );
    expect(screen.getByText("-0.125")).toBeInTheDocument();
  });
});

describe("IssueModelParametersView dependent structures", () => {
  it("passes the persisted parameter values to read-only plugins for category labels", () => {
    render(
      <IssueModelParametersView
        parameters={[
          { key: "categories", label: "Categories", parameterStructureKey: "orderedCategories" },
          { key: "profiles", label: "Profiles", parameterStructureKey: "boundaryProfiles" },
        ]}
        values={{
          categories: [
            { categoryId: "low", label: "Low", order: 0 },
            { categoryId: "high", label: "High", order: 1 },
          ],
          profiles: {
            profiles: [
              { profileId: "profile-1", categoryId: "high", valuesByCriterionId: { oldCriterion: 0.5 } },
            ],
          },
        }}
        parameterContext={{
          alternatives: [],
          criteriaTree: [],
          leafCriteria: [],
        }}
      />
    );

    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Low → High")).toBeInTheDocument();
    expect(screen.getByText("Criterion oldCriterion")).toBeInTheDocument();
  });
});
