import { orderCriteriaDocsByTreePosition } from "../shared/ordering.js";
import {
  buildIssueCriteriaTree,
} from "../shared/criteriaTree.js";
import {
  buildExpressionDomainConfigFromLeafCriteriaOrThrow,
} from "../../expressionDomains/buildIssueDomainConfig.js";

export const buildActiveCriteriaView = ({ issue, issueCriteriaDocs }) => {
  const { criteriaTree, orderedLeafCriteria } = buildIssueCriteriaTree(
    issueCriteriaDocs
  );
  const orderedLeafCriteriaWithDomain = orderCriteriaDocsByTreePosition(
    issueCriteriaDocs,
    { issueId: issue._id }
  );
  const expressionDomainConfig =
    buildExpressionDomainConfigFromLeafCriteriaOrThrow({
      leafCriteria: orderedLeafCriteriaWithDomain,
      field: "expressionDomain",
    });

  return {
    criteriaTree,
    orderedLeafCriteria,
    expressionDomainConfig,
  };
};
