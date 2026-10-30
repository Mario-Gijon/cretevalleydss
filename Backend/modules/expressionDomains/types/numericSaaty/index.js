import { normalizeExpressionDomainNameOrThrow } from "../../shared/validation.js";
import { createBadRequestError } from "../../../../utils/common/errors.js";
import {
  AHP_SAATY_SCALE_KEY,
  AHP_SAATY_SCALE_NAME,
} from "./saatyScale.js";
import { validateNumericSaatyEvaluation } from "./evaluation.js";

export const numericSaaty = Object.freeze({
  key: "numericSaaty",
  label: "AHP Saaty Scale",
  description: "The 17 fixed values of Saaty's fundamental 1–9 scale.",
  family: "numeric",

  validateCreation(payload = {}) {
    const name = normalizeExpressionDomainNameOrThrow(payload?.name);
    if (
      name !== AHP_SAATY_SCALE_NAME ||
      payload?.definition?.scale !== AHP_SAATY_SCALE_KEY ||
      Object.keys(payload?.definition ?? {}).length !== 1
    ) {
      throw createBadRequestError("AHP Saaty Scale is a predefined global domain.", {
        field: "typeKey",
      });
    }
    return {
      name: AHP_SAATY_SCALE_NAME,
      typeKey: "numericSaaty",
      definition: { scale: AHP_SAATY_SCALE_KEY },
    };
  },

  validateEvaluation: validateNumericSaatyEvaluation,
});
