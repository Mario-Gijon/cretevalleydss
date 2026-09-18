import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateIssueContext } from "../../../src/features/createIssue/context/createIssue.context.js";
import { ExpressionDomainStep } from "../../../src/features/createIssue/expressionDomains/ExpressionDomainStep.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const model = {
  _id: "model-expression-guidance",
  name: "Range-guided method",
  supportedExpressionDomains: [
    { typeKey: "numericContinuous", constraints: { min: 0, max: 1 } },
  ],
};

const domain = {
  _id: "domain-0-1",
  name: "Continuous 0-1",
  typeKey: "numericContinuous",
  definition: { min: 0, max: 1 },
};

const renderStep = ({ globalDomains = [domain] } = {}) =>
  renderWithProviders(
    <CreateIssueContext.Provider
      value={{
        allData: {
          selectedModel: model,
          criteria: [{ id: "criterion-1", name: "Cost", children: [] }],
        },
        expressionDomainConfig: {
          mode: "global",
          globalDomainId: domain._id,
        },
        setExpressionDomainConfig: vi.fn(),
      }}
    >
      <ExpressionDomainStep />
    </CreateIssueContext.Provider>,
    {
      issuesValue: {
        globalDomains,
        expressionDomains: [],
        setExpressionDomains: vi.fn(),
      },
    }
  );

describe("ExpressionDomainStep supported-domain guidance", () => {
  it("shows supported domains without repeating the model name", () => {
    renderStep();

    expect(screen.getByText("Supported expression domains", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Numeric continuous [0, 1]", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Range-guided method", { exact: true })).not.toBeInTheDocument();
  });

  it("explains the selected model requirement when no compatible domain exists", () => {
    renderStep({ globalDomains: [] });

    expect(screen.getByText("No compatible expression domains found.", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Range-guided method requires a Numeric continuous domain from 0 to 1. Create a compatible expression domain to continue.",
        { exact: true }
      )
    ).toBeInTheDocument();
  });
});
