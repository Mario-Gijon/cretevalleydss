import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CriteriaPreferenceOrderView from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/CriteriaPreferenceOrderView.jsx";
import { buildInitialEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/buildInitialEvaluation.js";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const decisionContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
    { id: "delivery", name: "Delivery" },
  ],
};

const renderView = ({
  evaluation = { criterionOrder: [] },
  setEvaluation = vi.fn(),
  readOnly = false,
  context = decisionContext,
} = {}) =>
  renderWithProviders(
    <CriteriaPreferenceOrderView
      decisionContext={context}
      evaluation={evaluation}
      setEvaluation={setEvaluation}
      collectiveEvaluation={null}
      readOnly={readOnly}
    />
  );

describe("CriteriaPreferenceOrderView", () => {
  it("initializes with no inferred preference", () => {
    expect(buildInitialEvaluation({ decisionContext })).toEqual({
      criterionOrder: [],
    });
  });

  it("renders an empty draft with every criterion available and unranked", () => {
    renderView();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No criteria have been ranked yet."
    );
    expect(screen.getByRole("button", { name: "Add Cost to ranking" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Quality to ranking" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Delivery to ranking" })).toBeInTheDocument();
  });

  it("adds criteria as canonical ids in user-defined order", () => {
    const setEvaluation = vi.fn();
    const { rerender } = renderView({ setEvaluation });

    fireEvent.click(screen.getByRole("button", { name: "Add Delivery to ranking" }));
    expect(setEvaluation).toHaveBeenLastCalledWith({ criterionOrder: ["delivery"] });

    rerender(
      <CriteriaPreferenceOrderView
        decisionContext={decisionContext}
        evaluation={{ criterionOrder: ["delivery"] }}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Cost to ranking" }));

    expect(setEvaluation).toHaveBeenLastCalledWith({
      criterionOrder: ["delivery", "cost"],
    });
  });

  it("moves ranked criteria by swapping adjacent array positions", () => {
    const setEvaluation = vi.fn();
    renderView({
      evaluation: { criterionOrder: ["cost", "quality", "delivery"] },
      setEvaluation,
    });

    fireEvent.click(screen.getByRole("button", { name: "Move Quality up" }));
    expect(setEvaluation).toHaveBeenLastCalledWith({
      criterionOrder: ["quality", "cost", "delivery"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Move Quality down" }));
    expect(setEvaluation).toHaveBeenLastCalledWith({
      criterionOrder: ["cost", "delivery", "quality"],
    });
  });

  it("removes only the selected criterion and makes it available again", () => {
    const setEvaluation = vi.fn();
    const { rerender } = renderView({
      evaluation: { criterionOrder: ["cost", "quality"] },
      setEvaluation,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Cost from ranking" })
    );

    expect(setEvaluation).toHaveBeenLastCalledWith({ criterionOrder: ["quality"] });
    rerender(
      <CriteriaPreferenceOrderView
        decisionContext={decisionContext}
        evaluation={{ criterionOrder: ["quality"] }}
        setEvaluation={setEvaluation}
        collectiveEvaluation={null}
        readOnly={false}
      />
    );
    expect(screen.getByRole("button", { name: "Add Cost to ranking" })).toBeInTheDocument();
  });

  it("derives ranks from order and never emits presentation ranks or names", () => {
    const setEvaluation = vi.fn();
    renderView({
      evaluation: { criterionOrder: ["delivery", "cost"] },
      setEvaluation,
    });

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Most important")).toBeInTheDocument();
    expect(screen.getByText("Least important")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move Cost up" }));

    expect(setEvaluation).toHaveBeenLastCalledWith({
      criterionOrder: ["cost", "delivery"],
    });
    expect(setEvaluation.mock.calls.at(-1)[0]).not.toHaveProperty("ranks");
    expect(JSON.stringify(setEvaluation.mock.calls.at(-1)[0])).not.toContain("Cost");
  });

  it("prevents every editing action in read-only mode", () => {
    const setEvaluation = vi.fn();
    renderView({
      evaluation: { criterionOrder: ["cost", "quality"] },
      setEvaluation,
      readOnly: true,
    });

    expect(screen.queryByRole("button", { name: /Add .* to ranking/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove .* from ranking/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move .* (up|down)/ })).not.toBeInTheDocument();
    expect(setEvaluation).not.toHaveBeenCalled();
  });

  it.each([
    [null, "Evaluation payload is invalid."],
    [{ criterionOrder: ["cost", "cost"] }, 'duplicate criterion ID "cost"'],
    [{ criterionOrder: ["unknown"] }, 'unknown criterion ID "unknown"'],
  ])("renders an error alert for malformed evaluation %#", (evaluation, message) => {
    renderView({ evaluation });
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("renders an error alert for malformed leaf criteria", () => {
    renderView({
      context: { leafCriteria: [{ id: "cost", name: "Cost" }, { id: " cost " }] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Criteria preference order context is invalid."
    );
  });

  it("renders a complete ranking with no editable unranked criteria", () => {
    renderView({
      evaluation: { criterionOrder: ["quality", "delivery", "cost"] },
    });

    expect(screen.getByText("All current criteria are ranked.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add .* to ranking/ })).not.toBeInTheDocument();
  });
});
