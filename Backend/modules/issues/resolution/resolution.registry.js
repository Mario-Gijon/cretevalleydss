import { EVALUATION_STRUCTURES } from "../issue.evaluationStructure.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

import { resolveDirectIssue } from "./resolvers/direct.resolver.js";
import { resolvePairwiseIssue } from "./resolvers/pairwiseAlternatives.resolver.js";

const RESOLUTION_RESOLVERS_BY_EVALUATION_STRUCTURE = Object.freeze({
  [EVALUATION_STRUCTURES.DIRECT]: resolveDirectIssue,
  [EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]: resolvePairwiseIssue,
});

export const getResolutionResolverOrThrow = (evaluationStructure) => {
  const resolver =
    RESOLUTION_RESOLVERS_BY_EVALUATION_STRUCTURE[evaluationStructure];

  if (!resolver) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${String(evaluationStructure)}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "evaluationStructure",
      }
    );
  }

  return resolver;
};
