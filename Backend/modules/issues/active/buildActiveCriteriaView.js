import { orderDocsByIdList } from "../shared/ordering.js";
import {
  buildIssueCriteriaTree,
} from "../shared/criteriaTree.js";
import {
  buildExpressionDomainConfigFromLeafCriteriaOrThrow,
} from "../../expressionDomains/buildIssueDomainConfig.js";

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
