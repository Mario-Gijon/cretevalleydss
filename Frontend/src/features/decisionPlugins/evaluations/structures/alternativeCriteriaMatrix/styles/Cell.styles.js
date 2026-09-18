import { evaluationMatrixInputBoundarySx } from "../../../shared/styles/evaluationMatrixTable.styles.js";

export const cellSx = {
  container: { width: "100%", height: "100%", minWidth: 0 },
  input: { flex: 1, minWidth: 0, display: "flex", alignItems: "center" },
  inputBoundary: { width: "100%", minWidth: 0, ...evaluationMatrixInputBoundarySx },
  collective: { ml: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" },
  chip: { ml: 1, fontSize: "0.75rem", height: 20, pointerEvents: "none", flexShrink: 0 },
};
