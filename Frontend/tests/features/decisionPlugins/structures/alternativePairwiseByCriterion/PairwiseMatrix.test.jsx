import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Cell from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/Cell.jsx";
import {
  buildPairwiseMatrixSx,
  pairwiseMatrixSx,
} from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/styles/PairwiseMatrix.styles.js";
import { cellSx } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/styles/Cell.styles.js";
import {
  buildEvaluationMatrixDataGridSx,
  evaluationMatrixInputBoundarySx,
} from "../../../../../src/features/decisionPlugins/evaluations/shared/styles/evaluationMatrixTable.styles.js";
import { renderWithProviders } from "../../../../setup/renderWithProviders.jsx";

const expressionDomain = {
  typeKey: "linguistic2Tuple",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "High", index: 1 },
    ],
  },
};

describe("PairwiseMatrix Cell", () => {
  it("renders only the collective 2-tuple value in read-only mode", () => {
    renderWithProviders(
      <Cell
        expressionDomain={expressionDomain}
        value={{ labelKey: "low", alpha: 0 }}
        collectiveValue={{ labelKey: "high", alpha: 0 }}
        diagonal={false}
        permitEdit={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getAllByText("High (α = 0)")).toHaveLength(1);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("keeps diagonal cells neutral", () => {
    renderWithProviders(
      <Cell diagonal expressionDomain={expressionDomain} permitEdit={false} onChange={vi.fn()} />
    );

    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });
});

describe("PairwiseMatrix layout", () => {
  it("leaves Expression Domain control borders to the plugin implementation", () => {
    expect(cellSx.inputBoundary).toMatchObject(evaluationMatrixInputBoundarySx);
    expect(
      cellSx.inputBoundary[
        "& .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline"
      ]
    ).toEqual({ borderColor: "transparent" });
    expect(
      cellSx.inputBoundary["& .MuiInputBase-input.Mui-disabled, & .MuiSelect-select.Mui-disabled"]
    ).toEqual({ color: "text.secondary", WebkitTextFillColor: "currentColor" });
  });

  it("keeps row and column separators on the shared DataGrid cell geometry", () => {
    const sharedCellStyles = buildEvaluationMatrixDataGridSx({
      palette: {
        common: { white: "#fff" },
        text: { primary: "#fff", disabled: "#999" },
      },
    })["& .MuiDataGrid-cell"];

    expect(sharedCellStyles).toMatchObject({
      boxSizing: "border-box",
      borderRight: "1px solid rgba(255,255,255,0.075)",
      borderBottom: "1px solid rgba(255,255,255,0.075)",
      backgroundClip: "padding-box",
    });
    expect(cellSx.diagonal).not.toHaveProperty("borderBottom");
    expect(cellSx.diagonal).not.toHaveProperty("borderRight");
  });

  it("matches alternative-name cells and the corner to the header background", () => {
    const styles = buildEvaluationMatrixDataGridSx({
      palette: {
        common: { white: "#fff" },
        text: { primary: "#fff", disabled: "#999" },
      },
    });
    const headerBackground = styles["& .MuiDataGrid-columnHeaders"].backgroundColor;

    expect(styles["& .first-column"].backgroundColor).toBe(headerBackground);
    expect(styles["& .MuiDataGrid-row:hover .first-column"].backgroundColor).toBe(headerBackground);
    expect(styles["& .MuiDataGrid-columnHeader"].backgroundColor).toBe(headerBackground);
  });

  it("leaves horizontal scrolling to DataGrid while keeping its root within the available width", () => {
    expect(pairwiseMatrixSx.container).toMatchObject({ width: "100%", minWidth: 0 });
    expect(pairwiseMatrixSx.container).not.toHaveProperty("overflowX");

    const styles = buildPairwiseMatrixSx({
      theme: {},
      buildSharedStyles: () => ({ "& .first-column": { px: 1 } }),
    });

    expect(styles.minWidth).toBe(0);
    expect(styles["& .MuiDataGrid-cell.pairwise-grid-cell, & .MuiDataGrid-cell.diagonal-cell"]).toEqual({
      px: 0,
    });
    expect(styles["& .first-column"]).toEqual({ px: 1 });
  });
});
