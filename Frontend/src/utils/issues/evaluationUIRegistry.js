import { EvaluationMatrixDialog } from "../../components/EvaluationMatrixDialog/EvaluationMatrixDialog";
import { EvaluationPairwiseMatrixDialog } from "../../components/EvaluationPairwiseMatrixDialog/EvaluationPairwiseMatrixDialog";

import { ISSUE_EVALUATION_STRUCTURES } from "./evaluationStructure";

export const EVALUATION_UI_REGISTRY = {
  [ISSUE_EVALUATION_STRUCTURES.DIRECT]: {
    dialog: EvaluationMatrixDialog,
  },
  [ISSUE_EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]: {
    dialog: EvaluationPairwiseMatrixDialog,
  },
};