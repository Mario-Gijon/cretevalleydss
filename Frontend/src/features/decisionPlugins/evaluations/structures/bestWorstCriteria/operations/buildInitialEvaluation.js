import { buildEmptyPayload } from "./buildEmptyPayload";
import { resolveCriteria } from "./resolveCriteria";

export const buildInitialEvaluation = ({ decisionContext }) => {
  const criteria = resolveCriteria({ decisionContext });

  return buildEmptyPayload({ criteria });
};
