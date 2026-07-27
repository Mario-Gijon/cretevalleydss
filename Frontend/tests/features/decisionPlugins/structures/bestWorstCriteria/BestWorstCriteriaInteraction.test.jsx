import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BestWorstCriteriaView from "../../../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/BestWorstCriteriaView.jsx";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "quality", name: "Quality" },
    { id: "cost", name: "Cost" },
    { id: "delivery", name: "Delivery" },
  ],
};
const evaluation = {
  bestCriterionId: "quality",
  worstCriterionId: "cost",
  bestToOthers: { quality: 1, cost: 5, delivery: 3 },
  othersToWorst: { quality: 5, cost: 1, delivery: 3 },
};
const emptyEvaluation = {
  bestCriterionId: "",
  worstCriterionId: "",
  bestToOthers: { quality: "", cost: "", delivery: "" },
  othersToWorst: { quality: "", cost: "", delivery: "" },
};

const chooseOption = (selectorName, optionName) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: selectorName }));
  fireEvent.click(screen.getByRole("option", { name: optionName }));
};

describe("BestWorstCriteriaView interaction", () => {
  it("selects best and worst criteria with fresh vectors", () => {
    const setEvaluation = vi.fn();
    renderWithProviders(
      <BestWorstCriteriaView
        decisionContext={decisionContext}
        evaluation={emptyEvaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        loading={false}
      />
    );

    chooseOption("Best criterion", "Quality");
    expect(setEvaluation).toHaveBeenLastCalledWith({
      bestCriterionId: "quality",
      worstCriterionId: "",
      bestToOthers: { quality: 1, cost: "", delivery: "" },
      othersToWorst: { quality: "", cost: "", delivery: "" },
    });

    chooseOption("Worst criterion", "Cost");
    expect(setEvaluation).toHaveBeenLastCalledWith({
      bestCriterionId: "",
      worstCriterionId: "cost",
      bestToOthers: { quality: "", cost: "", delivery: "" },
      othersToWorst: { quality: "", cost: 1, delivery: "" },
    });
  });

  it("resets a changed selection and prevents choosing the opposite criterion", () => {
    const setEvaluation = vi.fn();
    renderWithProviders(
      <BestWorstCriteriaView
        decisionContext={decisionContext}
        evaluation={evaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        loading={false}
      />
    );

    chooseOption("Best criterion", "Delivery");
    expect(setEvaluation).toHaveBeenCalledWith({
      ...evaluation,
      bestCriterionId: "delivery",
      bestToOthers: { quality: "", cost: "", delivery: 1 },
    });

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Best criterion" }));
    expect(
      screen.queryByRole("option", { name: "Cost" })
    ).not.toBeInTheDocument();
  });

  it("clears a selection and updates valid comparisons", () => {
    const setEvaluation = vi.fn();
    renderWithProviders(
      <BestWorstCriteriaView
        decisionContext={decisionContext}
        evaluation={evaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
        loading={false}
      />
    );

    fireEvent.change(screen.getAllByRole("spinbutton")[0], {
      target: { value: "7" },
    });
    expect(setEvaluation).toHaveBeenLastCalledWith({
      ...evaluation,
      bestToOthers: { quality: 1, cost: 7, delivery: 3 },
    });

    chooseOption("Best criterion", "Select criterion");
    expect(setEvaluation).toHaveBeenLastCalledWith({
      ...evaluation,
      bestCriterionId: "",
      bestToOthers: { quality: "", cost: "", delivery: "" },
    });
  });

  it("allows the only criterion in both selectors", () => {
    renderWithProviders(
      <BestWorstCriteriaView
        decisionContext={{
          leafCriteria: [{ id: "only", name: "Only criterion" }],
        }}
        evaluation={{
          bestCriterionId: "only",
          worstCriterionId: "only",
          bestToOthers: { only: 1 },
          othersToWorst: { only: 1 },
        }}
        setEvaluation={vi.fn()}
        collectiveEvaluation={null}
        readOnly={false}
        loading={false}
      />
    );

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  });
});
