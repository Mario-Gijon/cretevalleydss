import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IssueModelParametersView from "../../../src/features/modelParameters/components/IssueModelParametersView.jsx";

const parameter = {
  key: "alpha",
  label: "Alpha",
  valueType: "number",
  scope: "global",
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
