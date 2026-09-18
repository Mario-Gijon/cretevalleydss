import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Cell from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/Cell.jsx";
import {
  buildPairwiseMatrixSx,
  pairwiseMatrixSx,
} from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/styles/PairwiseMatrix.styles.js";
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
  it("leaves horizontal scrolling to DataGrid while preserving the matrix minimum width", () => {
    expect(pairwiseMatrixSx.container).toMatchObject({ width: "100%", minWidth: 0 });
    expect(pairwiseMatrixSx.container).not.toHaveProperty("overflowX");

    const styles = buildPairwiseMatrixSx({
      theme: {},
      alternativeCount: 6,
      buildSharedStyles: () => ({}),
    });

    expect(styles.minWidth).toBe(
      Math.max(
        500,
        6 * EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH + ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH
      )
    );
  });
});
