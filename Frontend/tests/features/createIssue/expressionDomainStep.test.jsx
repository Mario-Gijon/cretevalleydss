import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    expect(screen.getByText("Selected model supports", { exact: true })).toBeInTheDocument();
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

  it("selects the global Saaty scale automatically and excludes every other domain for AHPSort I", async () => {
    const user = userEvent.setup();
    const ahpDomain = {
      _id: "domain-ahp",
      name: "AHP Saaty Scale",
      typeKey: "numericSaaty",
      definition: { scale: "saaty-fundamental-1-9" },
    };
    const setExpressionDomainConfig = vi.fn();
    renderWithProviders(
      <CreateIssueContext.Provider
        value={{
          allData: {
            selectedModel: {
              _id: "model-ahp-sort-i",
              name: "AHPSort I",
              requiresHomogeneousExpressionDomains: true,
              supportedExpressionDomains: [
                {
                  typeKey: "numericSaaty",
                  constraints: { scale: "saaty-fundamental-1-9" },
                },
              ],
            },
            criteria: [{ id: "criterion-quality", name: "Quality", children: [] }],
          },
          expressionDomainConfig: { mode: "global", globalDomainId: "" },
          setExpressionDomainConfig,
        }}
      >
        <ExpressionDomainStep />
      </CreateIssueContext.Provider>,
      {
        issuesValue: {
          globalDomains: [domain, ahpDomain],
          expressionDomains: [],
          setExpressionDomains: vi.fn(),
        },
      }
    );

    expect(screen.getByText("AHP Saaty Scale", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /By criterion/ })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("combobox", { name: "Domain" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    const ahpOption = screen.getByRole("option", { name: /AHP Saaty Scale/ });
    expect(ahpOption).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Continuous 0-1/ })).not.toBeInTheDocument();
    await user.click(ahpOption);
    expect(setExpressionDomainConfig).toHaveBeenCalledWith({
      mode: "global",
      globalDomainId: ahpDomain._id,
    });
  });
});
