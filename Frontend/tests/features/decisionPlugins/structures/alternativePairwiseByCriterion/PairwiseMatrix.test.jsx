import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Cell from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/Cell.jsx";
import {
  buildPairwiseMatrixSx,
  pairwiseMatrixSx,
} from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/styles/PairwiseMatrix.styles.js";
import { cellSx } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/styles/Cell.styles.js";
import { buildEvaluationMatrixDataGridSx } from "../../../../../src/features/decisionPlugins/evaluations/shared/styles/evaluationMatrixTable.styles.js";
import {
  ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
  EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
} from "../../../../../src/features/decisionPlugins/evaluations/shared/evaluationMatrixSizing.js";
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
  it("keeps inner evaluation outlines transparent with restrained editable feedback", () => {
    expect(cellSx.inputBoundary["& .MuiOutlinedInput-notchedOutline"]).toEqual({
      borderColor: "transparent",
    });
    expect(
      cellSx.inputBoundary["& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline"]
    ).toEqual({ borderColor: "rgba(103, 221, 218, 0.35)" });
    expect(
      cellSx.inputBoundary["& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline"]
    ).toEqual({ borderColor: "rgba(103, 221, 218, 0.65)" });
    expect(
      cellSx.inputBoundary[
        "& .MuiOutlinedInput-root.Mui-disabled:hover .MuiOutlinedInput-notchedOutline"
      ]
    ).toEqual({ borderColor: "transparent" });
  });

  it("keeps row and column separators on the shared DataGrid cell geometry", () => {
    const sharedCellStyles = buildEvaluationMatrixDataGridSx({
      palette: { common: { white: "#fff" } },
      text: { primary: "#fff", disabled: "#999" },
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

  it("leaves horizontal scrolling to DataGrid while preserving the matrix minimum width", () => {
    expect(pairwiseMatrixSx.container).toMatchObject({ width: "100%", minWidth: 0 });
    expect(pairwiseMatrixSx.container).not.toHaveProperty("overflowX");

    const styles = buildPairwiseMatrixSx({
      theme: {},
      alternativeCount: 6,
      buildSharedStyles: () => ({ "& .first-column": { px: 1 } }),
    });

    expect(styles.minWidth).toBe(
      Math.max(
        500,
        6 * EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH + ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH
      )
    );
    expect(styles["& .MuiDataGrid-cell.pairwise-grid-cell, & .MuiDataGrid-cell.diagonal-cell"]).toEqual({
      px: 0,
    });
    expect(styles["& .first-column"]).toEqual({ px: 1 });
  });
});
