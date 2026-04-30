import {
  buildDirectResolutionInput,
  getDirectEvaluationPayload,
  saveDirectEvaluationDrafts,
  submitDirectEvaluations,
} from "./direct.operations.js";
import { buildInitialDirectEvaluations } from "./direct.initial.js";
import { buildDirectResolutionData } from "./direct.resolutionData.js";

export const directAlternativeEvaluations = Object.freeze({
  read: getDirectEvaluationPayload,
  saveDraft: saveDirectEvaluationDrafts,
  submit: submitDirectEvaluations,
  buildInitial: buildInitialDirectEvaluations,
  buildResolutionInput: buildDirectResolutionInput,
  buildResolutionData: buildDirectResolutionData,
});
