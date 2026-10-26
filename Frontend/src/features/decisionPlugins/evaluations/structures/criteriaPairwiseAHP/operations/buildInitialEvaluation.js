import { resolveCriteria } from "./resolveCriteria";

export const buildInitialEvaluation = ({ decisionContext }) => {
  resolveCriteria({ decisionContext });
  return { comparisons: [] };
};
