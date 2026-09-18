import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { navbarPages } from "../../../src/components/ResponsiveNavbar/constants/ResponsiveNavbar.constants";
import { ModelsView } from "../../../src/features/models";
import { renderWithProviders } from "../../setup/renderWithProviders";

const decisionModel = {
  apiModelKey: "generic-decision-method",
  displayName: "Balanced choice method",
  smallDescription: "Compares alternatives across the criteria that matter to you.",
  supportedExpressionDomains: [
    { typeKey: "numericContinuous", constraints: { min: 0, max: 1 } },
    { typeKey: "numericDiscrete", constraints: {} },
  ],
  modelSection: {
    whatItDoes: "Combines the evaluation of each alternative into a clear comparison.",
    whenToUse: "Use it when you need to compare several alternatives with the same criteria.",
    advantages: ["Makes trade-offs easier to understand.", "Works with several alternatives."],
    limitations: ["Results depend on the quality of the input evaluations."],
  },
  moreInfoUrl: "https://example.com/models/balanced-choice",
};

const weightingModel = {
  apiModelKey: "generic-weighting-method",
  displayName: "Priority weighting method",
  smallDescription: "Helps set the relative importance of your criteria.",
  supportedExpressionDomains: [],
  modelSection: {
    whatItDoes: "Captures the importance of each criterion before alternatives are compared.",
    whenToUse: "Use it when criteria should not all have the same influence.",
    advantages: ["Makes priorities explicit."],
    limitations: ["Requires participants to agree on their priorities."],
  },
  moreInfoUrl: null,
};

const consensusModel = {
  apiModelKey: "generic-consensus-method",
  displayName: "Consensus reaching method",
  smallDescription: "Helps experts reach a collective decision.",
  supportsConsensus: true,
  modelSection: {
    whatItDoes: "Supports consensus reaching among multiple experts.",
  },
};

const renderModelsView = (issuesValue = {}) =>
  renderWithProviders(<ModelsView />, {
    issuesValue: {
      models: [decisionModel],
      criteriaWeightingModels: [weightingModel],
      ...issuesValue,
    },
  });

describe("ModelsView", () => {
  it("keeps the Models navigation enabled", () => {
    expect(navbarPages.find((page) => page.label === "Models")).toEqual({
      label: "Models",
      url: "/dashboard/models",
      path: "/dashboard/models",
    });
  });

  it("renders catalog families from IssuesDataContext", () => {
    renderModelsView({ models: [decisionModel, consensusModel] });

    const decisionSection = screen.getByRole("region", { name: "Decision models" });
    expect(decisionSection).toBeInTheDocument();
    const decisionCard = within(decisionSection).getByRole("button", {
      name: "Learn about Balanced choice method",
    });
    expect(decisionCard).toBeInTheDocument();
    expect(decisionCard).not.toHaveAttribute("aria-selected");
    expect(decisionCard).not.toHaveAttribute("aria-pressed");
    expect(within(decisionSection).queryByRole("button", {
      name: "Learn about Consensus reaching method",
    })).not.toBeInTheDocument();

    const consensusSection = screen.getByRole("region", { name: "Consensus models" });
    expect(within(consensusSection).getByRole("button", {
      name: "Learn about Consensus reaching method",
    })).toBeInTheDocument();

    const weightingSection = screen.getByRole("region", { name: "Criteria weighting methods" });
    expect(within(weightingSection).getByRole("button", {
      name: "Learn about Priority weighting method",
    })).toBeInTheDocument();
  });

  it("classifies consensus-capable models using supportsConsensus", () => {
    renderModelsView({ models: [decisionModel, consensusModel] });

    const decisionSection = screen.getByRole("region", { name: "Decision models" });
    const consensusSection = screen.getByRole("region", { name: "Consensus models" });

    expect(within(decisionSection).getByRole("button", {
      name: "Learn about Balanced choice method",
    })).toBeInTheDocument();
    expect(within(decisionSection).queryByRole("button", {
      name: "Learn about Consensus reaching method",
    })).not.toBeInTheDocument();
    expect(within(consensusSection).getByRole("button", {
      name: "Learn about Consensus reaching method",
    })).toBeInTheDocument();
  });

  it("filters both catalog families using user-facing model content", async () => {
    const user = userEvent.setup();
    renderModelsView();

    await user.type(screen.getByRole("textbox", { name: "Search models" }), "priority");

    const decisionSection = screen.getByRole("region", { name: "Decision models" });
    const weightingSection = screen.getByRole("region", { name: "Criteria weighting methods" });
    expect(within(decisionSection).getByText("No decision models match your search.")).toBeInTheDocument();
    expect(within(weightingSection).getByRole("button", {
      name: "Learn about Priority weighting method",
    })).toBeInTheDocument();
  });

  it("places a matching consensus model in the Consensus models section", async () => {
    const user = userEvent.setup();
    renderModelsView({ models: [decisionModel, consensusModel] });

    await user.type(screen.getByRole("textbox", { name: "Search models" }), "consensus");

    const decisionSection = screen.getByRole("region", { name: "Decision models" });
    const consensusSection = screen.getByRole("region", { name: "Consensus models" });
    expect(within(decisionSection).getByText("No decision models match your search.")).toBeInTheDocument();
    expect(within(decisionSection).queryByRole("button", {
      name: "Learn about Consensus reaching method",
    })).not.toBeInTheDocument();
    expect(within(consensusSection).getByRole("button", {
      name: "Learn about Consensus reaching method",
    })).toBeInTheDocument();
  });

  it("shows metadata-driven educational content and an external reference when available", async () => {
    const user = userEvent.setup();
    renderModelsView();

    const decisionCard = screen.getByRole("button", {
      name: "Learn about Balanced choice method",
    });
    await user.click(decisionCard);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Close dialog", exact: true })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Close", exact: true })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(decisionModel.smallDescription, { exact: true })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Decision", { exact: true })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "What does it do?" })).toBeInTheDocument();
    expect(
      within(dialog).getByText("Combines the evaluation of each alternative into a clear comparison.")
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "When should I use it?" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Expression domains" })).toBeInTheDocument();
    expect(within(dialog).getByText("Numeric continuous [0, 1]", { exact: true })).toBeInTheDocument();
    expect(within(dialog).getByText("Numeric discrete", { exact: true })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Advantages" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Limitations" })).toBeInTheDocument();

    expect(decisionCard).not.toHaveAttribute("aria-selected");
    const reference = within(dialog).getByRole("link", { name: "Further information" });
    expect(reference).toHaveAttribute("href", "https://example.com/models/balanced-choice");
    expect(reference).toHaveAttribute("target", "_blank");
    expect(reference).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render a fake reference when the model has no moreInfoUrl", async () => {
    const user = userEvent.setup();
    renderModelsView();

    await user.click(
      screen.getByRole("button", { name: "Learn about Priority weighting method" })
    );

    expect(screen.queryByRole("link", { name: "Further information" })).not.toBeInTheDocument();
  });

  it("omits expression-domain guidance for criteria weighting models", async () => {
    const user = userEvent.setup();
    renderModelsView();

    await user.click(
      screen.getByRole("button", { name: "Learn about Priority weighting method" })
    );

    expect(screen.queryByRole("heading", { name: "Expression domains" })).not.toBeInTheDocument();
  });

  it("keeps a catalog model usable when its educational metadata is unavailable", async () => {
    const user = userEvent.setup();
    const scaffoldModel = {
      apiModelKey: "future-method",
      name: "Future method",
      smallDescription: "A method that will receive educational details later.",
      modelSection: {},
      moreInfoUrl: null,
    };
    renderModelsView({ models: [scaffoldModel], criteriaWeightingModels: [] });

    await user.click(screen.getByRole("button", { name: "Learn about Future method" }));

    expect(
      screen.getByText("Additional educational information is not available yet.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Advantages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Limitations" })).not.toBeInTheDocument();
  });
});
