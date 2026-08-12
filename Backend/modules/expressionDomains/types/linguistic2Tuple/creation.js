import { createBadRequestError } from "../../../../utils/common/errors.js";
import { assertPlainDefinitionOrThrow } from "../../shared/validation.js";
import { normalizeOrderedLinguisticLabelsOrThrow } from "../shared/orderedLinguisticLabels.js";

export const normalizeLinguistic2TupleCreationDefinition = (definition) => {
  const safeDefinition = assertPlainDefinitionOrThrow(definition);
  const labels = safeDefinition.labels;

  if (!Array.isArray(labels) || labels.length < 3) {
    throw createBadRequestError(
      "definition.labels must contain at least three labels.",
      { field: "definition.labels" }
    );
  }

  if (labels.length % 2 === 0) {
    throw createBadRequestError(
      "definition.labels must contain an odd number of labels.",
      { field: "definition.labels" }
    );
  }

  const normalizedLabels = normalizeOrderedLinguisticLabelsOrThrow(labels);

  return {
    labelCount: normalizedLabels.length,
    labels: normalizedLabels,
  };
};
