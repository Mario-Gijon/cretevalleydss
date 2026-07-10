import { createBadRequestError } from "../../../../utils/common/errors.js";
import {
  assertPlainDefinitionOrThrow,
  normalizeFiniteNumberOrThrow,
} from "../../shared/validation.js";

const assertCreationRangeOrThrow = (min, max) => {
  if (min >= max) {
    throw createBadRequestError("definition.min must be less than definition.max.", {
      field: "definition",
    });
  }
};

export const normalizeNumericContinuousCreationDefinition = (definition) => {
  const safeDefinition = assertPlainDefinitionOrThrow(definition);
  const min = normalizeFiniteNumberOrThrow(safeDefinition.min, {
    message: "definition.min must be a finite number.",
    field: "definition.min",
  });
  const max = normalizeFiniteNumberOrThrow(safeDefinition.max, {
    message: "definition.max must be a finite number.",
    field: "definition.max",
  });

  assertCreationRangeOrThrow(min, max);

  return {
    min,
    max,
    step: null,
  };
};
