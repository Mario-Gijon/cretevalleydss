import { EVALUATION_STRUCTURES } from "../alternativeEvaluation.constants.js";

import {
  buildDirectResolutionInput,
  getDirectEvaluationPayload,
  saveDirectEvaluationDrafts,
  submitDirectEvaluations,
} from "./direct.operations.js";
import { buildInitialDirectEvaluations } from "./direct.initial.js";

export const directAlternativeEvaluations = Object.freeze({
  key: EVALUATION_STRUCTURES.DIRECT,
  read: getDirectEvaluationPayload,
  saveDraft: saveDirectEvaluationDrafts,
  submit: submitDirectEvaluations,
  buildInitial: buildInitialDirectEvaluations,
  buildResolutionInput: buildDirectResolutionInput,
});
