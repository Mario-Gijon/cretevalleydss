import { extractLeafCriteria } from "../logic/extractIssueEvaluationLeafCriteria";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const toNonEmptyStringOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const buildNameMap = (items = []) =>
  items.reduce((accumulator, item) => {
    const name = toNonEmptyStringOrNull(item?.name);
    if (name) {
      accumulator[name] = item;
    }
    return accumulator;
  }, {});

const normalizeNamedItem = (item) => {
  if (typeof item === "string") {
    const name = toNonEmptyStringOrNull(item);
    return name ? { id: null, name } : null;
  }

  if (!isPlainObject(item)) {
    return null;
  }

  const name = toNonEmptyStringOrNull(item?.name);
  if (!name) {
    return null;
  }

  return {
    ...item,
    name,
    id: toNonEmptyStringOrNull(item?.id ?? item?._id),
  };
};

const resolveLeafItems = ({ criteriaTree, leafCriteria }) => {
  if (Array.isArray(leafCriteria)) {
    return leafCriteria.map(normalizeNamedItem).filter(Boolean);
  }

  return extractLeafCriteria(Array.isArray(criteriaTree) ? criteriaTree : [])
    .map(normalizeNamedItem)
    .filter(Boolean);
};

const buildDomainMap = (leafItems = []) =>
  leafItems.reduce((accumulator, criterion) => {
    const criterionName = toNonEmptyStringOrNull(criterion?.name);
    if (!criterionName) {
      return accumulator;
    }

    accumulator[criterionName] = isPlainObject(criterion?.expressionDomain)
      ? criterion.expressionDomain
      : null;
    return accumulator;
  }, {});

export const buildEvaluationContext = ({
  issue = null,
  stage = null,
  structure = null,
  alternatives = null,
  criteriaTree = null,
  leafCriteria = null,
}) => {
  const alternativeItems = Array.isArray(alternatives)
    ? alternatives.map(normalizeNamedItem).filter(Boolean)
    : [];
  const tree = Array.isArray(criteriaTree) ? criteriaTree : [];
  const leafItems = resolveLeafItems({
    criteriaTree: tree,
    leafCriteria,
  });

  return {
    issue: {
      id: toNonEmptyStringOrNull(issue?.id ?? issue?._id),
      name: toNonEmptyStringOrNull(issue?.name),
      currentStage: toNonEmptyStringOrNull(issue?.currentStage),
      consensusPhase: Number.isInteger(issue?.consensusPhase)
        ? issue.consensusPhase
        : null,
      isConsensus: issue?.isConsensus === true,
    },
    stage: toNonEmptyStringOrNull(stage),
    structure: {
      key: toNonEmptyStringOrNull(structure?.key),
      label: toNonEmptyStringOrNull(structure?.label),
    },
    alternatives: {
      items: alternativeItems,
      names: alternativeItems
        .map((alternative) => toNonEmptyStringOrNull(alternative?.name))
        .filter(Boolean),
      byName: buildNameMap(alternativeItems),
    },
    criteria: {
      tree,
      leafItems,
      leafNames: leafItems
        .map((criterion) => toNonEmptyStringOrNull(criterion?.name))
        .filter(Boolean),
      leafByName: buildNameMap(leafItems),
    },
    domains: {
      byCriterionName: buildDomainMap(leafItems),
    },
  };
};
