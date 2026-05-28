import { orderDocsByIdList } from "../issue.ordering.js";
import {
  buildIssueCriteriaTree,
} from "../issue.criteriaTree.js";
import {
  buildExpressionDomainConfigFromLeafCriteriaOrThrow,
} from "../expressionDomains/issueDomainConfig.js";

export const buildActiveCriteriaView = ({ issue, issueCriteriaDocs }) => {
  const { criteriaTree, orderedLeafCriteria } = buildIssueCriteriaTree(
    issueCriteriaDocs,
    issue
  );
  const orderedLeafCriteriaWithDomain = orderDocsByIdList(
    issueCriteriaDocs.filter((criterion) => criterion.isLeaf === true),
    issue.leafCriteriaOrder
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
