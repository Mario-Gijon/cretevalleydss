import { extractLeafCriteria } from "./extractIssueEvaluationLeafCriteria";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const toNonEmptyStringOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const buildIdMap = (items = []) =>
  items.reduce((accumulator, item) => {
    if (item?.id) {
      accumulator[item.id] = item;
    }
    return accumulator;
  }, {});

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

const buildDomainMaps = (leafItems = []) =>
  leafItems.reduce(
    (accumulator, criterion) => {
      if (criterion?.id) {
        accumulator.byCriterionId[criterion.id] = isPlainObject(
          criterion?.expressionDomain
        )
          ? criterion.expressionDomain
          : null;
      }

      const criterionName = toNonEmptyStringOrNull(criterion?.name);
      if (criterionName) {
        accumulator.byCriterionName[criterionName] = isPlainObject(
          criterion?.expressionDomain
        )
          ? criterion.expressionDomain
          : null;
      }

      return accumulator;
    },
    {
      byCriterionId: {},
      byCriterionName: {},
    }
  );

export const buildEvaluationContext = ({
  issue = null,
  stage = null,
  structure = null,
  model = null,
  parameters = null,
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
  const domains = buildDomainMaps(leafItems);
  const consensusPhase = Number.isInteger(issue?.consensusPhase)
    ? issue.consensusPhase
    : null;

  return {
    issue: {
      id: toNonEmptyStringOrNull(issue?.id ?? issue?._id),
      name: toNonEmptyStringOrNull(issue?.name),
      currentStage: toNonEmptyStringOrNull(issue?.currentStage),
      consensusPhase,
      isConsensus: issue?.isConsensus === true,
    },
    structure: {
      key: toNonEmptyStringOrNull(structure?.key),
      stage: toNonEmptyStringOrNull(stage ?? structure?.stage),
    },
    model: {
      id: toNonEmptyStringOrNull(model?.id ?? model?._id),
      name: toNonEmptyStringOrNull(model?.name ?? model?.displayName),
      apiModelKey: toNonEmptyStringOrNull(model?.apiModelKey),
    },
    parameters: {
      modelParameters:
        isPlainObject(parameters?.modelParameters) ? parameters.modelParameters : {},
      criteriaWeightingParameters: isPlainObject(
        parameters?.criteriaWeightingParameters
      )
        ? parameters.criteriaWeightingParameters
        : {},
    },
    alternatives: {
      items: alternativeItems,
      names: alternativeItems
        .map((alternative) => toNonEmptyStringOrNull(alternative?.name))
        .filter(Boolean),
      byId: buildIdMap(alternativeItems),
      byName: buildNameMap(alternativeItems),
    },
    criteria: {
      tree,
      leafItems,
      leafNames: leafItems
        .map((criterion) => toNonEmptyStringOrNull(criterion?.name))
        .filter(Boolean),
      leafById: buildIdMap(leafItems),
      leafByName: buildNameMap(leafItems),
    },
    domains,
    consensus: {
      phase: consensusPhase,
      maxPhases: null,
      threshold: null,
      currentCollectiveEvaluations: {},
      previousCollectiveEvaluations: {},
    },
  };
};
