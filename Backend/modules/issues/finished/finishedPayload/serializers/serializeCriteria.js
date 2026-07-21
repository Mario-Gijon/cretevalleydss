import { createInternalError } from "../../../../../utils/common/errors.js";
import { comparePositionId } from "../../../shared/ordering.js";
import {
  cloneSerializable,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";

const isFiniteWeight = (value) =>
  typeof value === "number" && Number.isFinite(value);

const normalizeWeight = (value) => {
  if (isFiniteWeight(value)) return value;
  if (Array.isArray(value) && value.every(isFiniteWeight)) return [...value];
  return null;
};

const sortNodes = (nodes) =>
  [...nodes].sort((left, right) =>
    comparePositionId(left.position, left.id, right.position, right.id)
  );

export const serializeCriteria = ({ criteria, expressionDomains }) => {
  const domainIds = new Set(expressionDomains.map((domain) => String(domain._id)));
  const normalizedNodes = criteria.map((criterion) => ({
    id: toRequiredId(criterion, "criterion"),
    name: criterion.name,
    description: criterion.description ?? null,
    type: criterion.type,
    isLeaf: criterion.isLeaf === true,
    parentId: toNullableId(criterion.parentCriterion),
    position: criterion.position,
    childIds: [],
    expressionDomainId: toNullableId(criterion.expressionDomain),
  }));
  const nodeById = new Map(normalizedNodes.map((node) => [node.id, node]));

  for (const node of normalizedNodes) {
    if (!Number.isInteger(node.position) || node.position < 0) {
      throw createInternalError("Criterion is missing a valid position", {
        field: "criteria.position",
        details: { criterionId: node.id },
      });
    }

    if (node.parentId && !nodeById.has(node.parentId)) {
      throw createInternalError("Criterion parent is missing", {
        field: "criteria.parentCriterion",
        details: { criterionId: node.id, parentId: node.parentId },
      });
    }

    if (node.expressionDomainId && !domainIds.has(node.expressionDomainId)) {
      throw createInternalError("Criterion expression domain is missing", {
        field: "criteria.expressionDomain",
        details: { criterionId: node.id, expressionDomainId: node.expressionDomainId },
      });
    }

    if (node.isLeaf && !node.expressionDomainId) {
      throw createInternalError("Leaf criterion expression domain is missing", {
        field: "criteria.expressionDomain",
        details: { criterionId: node.id },
      });
    }

    if (node.parentId) nodeById.get(node.parentId).childIds.push(node.id);
  }

  const visited = new Set();
  const visiting = new Set();
  const visit = (node) => {
    if (visiting.has(node.id)) {
      throw createInternalError("Criterion hierarchy contains a cycle", {
        field: "criteria.parentCriterion",
        details: { criterionId: node.id },
      });
    }
    if (visited.has(node.id)) return;
    visiting.add(node.id);
    node.childIds.forEach((childId) => visit(nodeById.get(childId)));
    visiting.delete(node.id);
    visited.add(node.id);
  };
  normalizedNodes.forEach(visit);

  for (const node of normalizedNodes) {
    node.childIds = sortNodes(node.childIds.map((id) => nodeById.get(id))).map(
      (child) => child.id
    );
    if (node.isLeaf !== (node.childIds.length === 0)) {
      throw createInternalError("Criterion leaf flag conflicts with hierarchy", {
        field: "criteria.isLeaf",
        details: { criterionId: node.id },
      });
    }
  }

  const nodes = sortNodes(normalizedNodes);
  const rootIds = nodes.filter((node) => !node.parentId).map((node) => node.id);

  return { nodes, rootIds };
};

const readFinalWeightsFromStageResult = ({ stageResult, leafIds }) => {
  const source = stageResult?.result?.standardResult?.weightsByCriterion;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;

  const byCriterionId = {};
  for (const criterionId of leafIds) {
    const value = normalizeWeight(source[criterionId]);
    if (value === null) return null;
    byCriterionId[criterionId] = value;
  }

  return byCriterionId;
};

export const serializeFinalWeights = ({ issue, criteria, phaseResults }) => {
  const leafIds = criteria.nodes.filter((node) => node.isLeaf).map((node) => node.id);
  const latestResult = phaseResults
    .filter((result) => result.stage === "criteriaWeighting")
    .sort((left, right) => right.consensusPhase - left.consensusPhase)[0] || null;
  const stageWeights = readFinalWeightsFromStageResult({
    stageResult: latestResult,
    leafIds,
  });

  if (stageWeights) {
    return {
      source: {
        kind: "criteriaWeightingStageResult",
        stageResultId: toRequiredId(latestResult, "criteria weighting stage result"),
        stage: latestResult.stage,
        phase: latestResult.consensusPhase,
        modelId: toNullableId(issue.criteriaWeightingModel),
      },
      byCriterionId: stageWeights,
    };
  }

  const weights = issue?.modelParameters?.weights;
  const byCriterionId = {};
  if (weights && typeof weights === "object" && !Array.isArray(weights)) {
    for (const criterionId of leafIds) {
      const value = normalizeWeight(weights[criterionId]);
      if (value === null) {
        throw createInternalError("Final criteria weights are incomplete", {
          field: "modelParameters.weights",
          details: { criterionId },
        });
      }
      byCriterionId[criterionId] = value;
    }
  } else if (leafIds.length === 1) {
    byCriterionId[leafIds[0]] = 1;
  }

  return {
    source: {
      kind: Object.keys(byCriterionId).length ? "directModelParameters" : "notRequired",
      stageResultId: null,
      stage: null,
      phase: null,
      modelId: toNullableId(issue.criteriaWeightingModel),
    },
    byCriterionId,
  };
};

export const serializeCriterionTreeForContext = ({ criteria }) => {
  const nodeById = new Map(criteria.nodes.map((node) => [node.id, node]));
  const mapNode = (id) => {
    const node = nodeById.get(id);
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      expressionDomainId: node.expressionDomainId,
      children: node.childIds.map(mapNode),
    };
  };

  return criteria.rootIds.map(mapNode);
};

export const cloneFinalWeights = (finalWeights) => cloneSerializable(finalWeights, null);
