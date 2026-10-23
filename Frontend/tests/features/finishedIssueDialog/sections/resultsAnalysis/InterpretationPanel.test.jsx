import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import InterpretationPanel from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/InterpretationPanel.jsx";

describe("InterpretationPanel", () => {
  it("renders persisted execution analyses in the selected order without Base fallback", () => {
    render(<InterpretationPanel executions={[
      { key: "scenario-1", displayLabel: "Test 1", modelName: "TOPSIS", genericAnalysis: { interpretation: "### Scenario\n\n1. Own result" } },
      { key: "base", displayLabel: "Base", modelName: "Base model", genericAnalysis: { interpretation: "### Base\n\n| A | B |\n| - | - |\n| 1 | 2 |" } },
      { key: "scenario-2", displayLabel: "Test 2", modelName: "BORDA", genericAnalysis: null },
    ]} />);

    expect(screen.getAllByText("Test 1")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Base")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Test 2")[0]).toBeInTheDocument();
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.getByText("Own result")).toBeInTheDocument();
    expect(screen.getByText("General analysis is not available for this execution. Reload Analysis to generate it.")).toBeInTheDocument();
    expect(screen.queryByText("Model analysis")).not.toBeInTheDocument();
    expect(screen.queryByText("TOPSIS")).not.toBeInTheDocument();
    expect(screen.queryByText("Base model")).not.toBeInTheDocument();
    expect(screen.queryByText("BORDA")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders each execution's optional alternative evaluation interpretation independently", () => {
    render(<InterpretationPanel executions={[
      { key: "base", displayLabel: "Base", modelName: "Base model", genericAnalysis: { interpretation: "Base general" }, alternativeEvaluationAnalysis: { analysis: { interpretation: "Base model interpretation" } } },
      { key: "scenario", displayLabel: "Scenario", modelName: "Scenario model", genericAnalysis: { interpretation: "Scenario general" }, alternativeEvaluationAnalysis: { analysis: { interpretation: "Scenario model interpretation" } } },
    ]} />);
    expect(screen.getAllByText("Alternative evaluation")).toHaveLength(2);
    expect(screen.getByText("Base model interpretation")).toBeInTheDocument();
    expect(screen.getByText("Scenario model interpretation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Base" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scenario" })).toBeInTheDocument();
    expect(screen.queryByText("Base model")).not.toBeInTheDocument();
    expect(screen.queryByText("Scenario model")).not.toBeInTheDocument();
  });

  it("renders available stage interpretations in criteria-weighting then alternative-evaluation order", () => {
    render(<InterpretationPanel executions={[{
      key: "base", displayLabel: "Base", modelName: "Alternative model", genericAnalysis: { interpretation: "General" },
      stageAnalyses: {
        criteriaWeighting: { apiModelKey: "criteria-model", analysis: { interpretation: "Criteria interpretation" } },
        alternativeEvaluation: { apiModelKey: "alternative-model", analysis: { interpretation: "Alternative interpretation" } },
      },
    }]} />);
    expect(screen.getByText("Criteria weighting").compareDocumentPosition(screen.getByText("Alternative evaluation")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("criteria-model")).not.toBeInTheDocument();
    expect(screen.queryByText("alternative-model")).not.toBeInTheDocument();
    expect(screen.queryByText("Alternative model")).not.toBeInTheDocument();
    expect(screen.getByText("Criteria interpretation")).toBeInTheDocument();
    expect(screen.getByText("Alternative interpretation")).toBeInTheDocument();
  });

  it("keeps General analysis visible and omits the optional section when model analysis is absent", () => {
    render(<InterpretationPanel executions={[
      { key: "base", displayLabel: "Base", modelName: "Base model", genericAnalysis: { interpretation: "Base general" }, alternativeEvaluationAnalysis: null },
    ]} />);

    expect(screen.getByText("General analysis")).toBeInTheDocument();
    expect(screen.getByText("Base general")).toBeInTheDocument();
    expect(screen.queryByText("Alternative evaluation")).not.toBeInTheDocument();
  });

  it("renders TOPSIS-Sort Model Analysis sections as Markdown", () => {
    render(<InterpretationPanel executions={[{
      key: "base",
      displayLabel: "Base",
      modelName: "TOPSIS-SORT",
      genericAnalysis: { interpretation: "General result" },
      stageAnalyses: {
        alternativeEvaluation: {
          analysis: {
            interpretation: "### Result interpretation\n\nTwo alternatives share a category.\n\n### Criterion weight sensitivity\n\nA tested weight change moved one alternative from Medium to Low.",
          },
        },
      },
    }]} />);

    expect(screen.getByRole("heading", { name: "Result interpretation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Criterion weight sensitivity" })).toBeInTheDocument();
    expect(screen.getByText("Two alternatives share a category.")).toBeInTheDocument();
    expect(screen.getByText("A tested weight change moved one alternative from Medium to Low.")).toBeInTheDocument();
  });
});
