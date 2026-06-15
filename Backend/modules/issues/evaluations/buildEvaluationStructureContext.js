import { Criterion } from "../../../models/Criteria.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import {
  EVALUATION_STAGES,
} from "../../decisionPlugins/evaluations/evaluationStages.js";
import { getEvaluationStructureOrThrow } from "../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { buildCriteriaTreeFromDocs } from "../shared/criteriaTree.js";
import {
  compareNameId,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../shared/ordering.js";
import { serializeIssueExpressionDomainSnapshot } from "./evaluationStructureData.js";

const hasUsableSerializedExpressionDomain = (expressionDomain) =>
  Boolean(
    expressionDomain &&
      typeof expressionDomain === "object" &&
      !Array.isArray(expressionDomain) &&
      typeof expressionDomain.type === "string" &&
      expressionDomain.type.trim()
  );

const isObjectCriterion = (criterion) =>
  Boolean(
    criterion &&
      typeof criterion === "object" &&
      !Array.isArray(criterion)
  );

const cloneSerializable = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const normalizePositiveIntegerOrNull = (value) =>
  Number.isInteger(value) && value > 0 ? value : null;

const normalizeNonNegativeIntegerOrNull = (value) =>
  Number.isInteger(value) && value >= 0 ? value : null;

const normalizeFiniteNumberOrNull = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const resolveStructureForIssueStageOrNull = ({ issue, stage, structure }) => {
  if (structure && typeof structure === "object") {
    return structure;
  }

  const normalizedStage =
    stage ||
    (Object.values(EVALUATION_STAGES).includes(issue?.currentStage)
      ? issue.currentStage
      : null);

  if (!normalizedStage) {
    return null;
  }

  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue?.criteriaWeightingStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue?.alternativeEvaluationStructureKey,
  };
  const structureKey = structureKeyByStage[normalizedStage];

  if (!structureKey) {
    return null;
  }

  return getEvaluationStructureOrThrow(structureKey);
};

const normalizeProvidedLeafCriteriaOrThrow = async ({ leafCriteria }) => {
  if (!Array.isArray(leafCriteria)) {
    return leafCriteria;
  }

  const objectCriteria = leafCriteria.filter(isObjectCriterion);

  if (objectCriteria.length === 0) {
    return leafCriteria;
  }

  const criteriaNeedingCriterionLookup = objectCriteria.filter(
    (criterion) =>
      !hasUsableSerializedExpressionDomain(criterion.expressionDomain) &&
      !toIdString(criterion.expressionDomain)
  );

  const criteriaMissingResolutionSource = criteriaNeedingCriterionLookup.filter(
    (criterion) => !toIdString(criterion?._id)
  );

  if (criteriaMissingResolutionSource.length > 0) {
    throw createBadRequestError(
      "Each leaf criterion must have an expression domain snapshot",
      {
        field: "expressionDomain",
        details: {
          missingCriteria: criteriaMissingResolutionSource.map((criterion) =>
            String(criterion?.name || "")
          ),
        },
      }
    );
  }

  const criterionIds = Array.from(
    new Set(
      criteriaNeedingCriterionLookup
        .map((criterion) => toIdString(criterion?._id))
        .filter(Boolean)
    )
  );

  const criteriaFromDb =
    criterionIds.length > 0
      ? await Criterion.find({
          _id: { $in: criterionIds },
        })
          .select("_id expressionDomain")
          .lean()
      : [];

  const criterionById = new Map(
    criteriaFromDb
      .map((criterion) => [toIdString(criterion?._id), criterion])
      .filter(([criterionId]) => Boolean(criterionId))
  );

  const missingCriterionIds = criterionIds.filter(
    (criterionId) => !criterionById.has(criterionId)
  );

  if (missingCriterionIds.length > 0) {
    throw createBadRequestError(
      "Leaf criteria are missing required criterion records to resolve expression domains",
      {
        field: "leafCriteria",
        details: {
          missingCriterionIds,
        },
      }
    );
  }

  const snapshotIds = Array.from(
    new Set(
      objectCriteria
        .map((criterion) => {
          if (hasUsableSerializedExpressionDomain(criterion.expressionDomain)) {
            return null;
          }

          const directSnapshotId = toIdString(criterion?.expressionDomain);
          if (directSnapshotId) {
            return directSnapshotId;
          }

          const criterionId = toIdString(criterion?._id);
          const dbCriterion = criterionById.get(criterionId);

          if (hasUsableSerializedExpressionDomain(dbCriterion?.expressionDomain)) {
            return null;
          }

          return toIdString(dbCriterion?.expressionDomain);
        })
        .filter(Boolean)
    )
  );

  const snapshots =
    snapshotIds.length > 0
      ? await IssueExpressionDomain.find({
          _id: { $in: snapshotIds },
        })
          .select(
            "_id name type numericRange linguisticLabels membershipFunction valueCount valuesMode"
          )
          .lean()
      : [];

  const snapshotById = new Map(
    snapshots
      .map((snapshot) => [toIdString(snapshot?._id), snapshot])
      .filter(([snapshotId]) => Boolean(snapshotId))
  );

  return leafCriteria.map((criterion) => {
    if (!isObjectCriterion(criterion)) {
      return criterion;
    }

    if (hasUsableSerializedExpressionDomain(criterion.expressionDomain)) {
      return criterion;
    }

    const criterionId = toIdString(criterion?._id);
    const dbCriterion = criterionById.get(criterionId);
    const fallbackExpressionDomain = dbCriterion?.expressionDomain;

    if (hasUsableSerializedExpressionDomain(fallbackExpressionDomain)) {
      return {
        ...criterion,
        expressionDomain: fallbackExpressionDomain,
      };
    }

    const snapshotId =
      toIdString(criterion.expressionDomain) ||
      toIdString(fallbackExpressionDomain);
    const snapshot = snapshotById.get(snapshotId);
    const serialized = serializeIssueExpressionDomainSnapshot(snapshot);

    if (!serialized || !serialized.type) {
      throw createBadRequestError(
        `Expression domain snapshot is missing or invalid for criterion '${String(criterion?.name || "")}'`,
        {
          field: "expressionDomain",
          details: {
            criterionId: criterionId || null,
            expressionDomainId: snapshotId || null,
          },
        }
      );
    }

    return {
      ...criterion,
      expressionDomain: serialized,
    };
  });
};

const serializeAlternativeItemsOrThrow = async ({ issue, alternatives }) => {
  const sourceAlternatives = Array.isArray(alternatives)
    ? alternatives
    : await getOrderedAlternativesDb({
        issueId: issue?._id || issue?.id,
        issueDoc: issue?._id ? issue : null,
        select: "_id name",
        lean: true,
      });

  if (!Array.isArray(sourceAlternatives) || sourceAlternatives.length === 0) {
    throw createBadRequestError("Issue has no alternatives", {
      field: "alternatives",
    });
  }

  return sourceAlternatives.map((alternative) => ({
    id: toIdString(alternative?._id || alternative?.id) || null,
    name: typeof alternative?.name === "string" ? alternative.name.trim() : "",
  }));
};

const serializeLeafCriterionItemsOrThrow = async ({ issue, leafCriteria }) => {
  const sourceLeafCriteria = Array.isArray(leafCriteria)
    ? leafCriteria
    : await getOrderedLeafCriteriaDb({
        issueId: issue?._id || issue?.id,
        issueDoc: issue?._id ? issue : null,
        select: "_id name type isLeaf parentCriterion expressionDomain",
        lean: true,
      });

  const resolvedLeafCriteria = await normalizeProvidedLeafCriteriaOrThrow({
    leafCriteria: sourceLeafCriteria,
  });

  if (!Array.isArray(resolvedLeafCriteria) || resolvedLeafCriteria.length === 0) {
    throw createBadRequestError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }

  return resolvedLeafCriteria.map((criterion) => ({
    id: toIdString(criterion?._id || criterion?.id) || null,
    name:
      typeof criterion === "string"
        ? criterion.trim()
        : typeof criterion?.name === "string"
          ? criterion.name.trim()
          : "",
    type:
      typeof criterion === "string"
        ? null
        : typeof criterion?.type === "string"
          ? criterion.type
          : null,
    isLeaf: true,
    parentId:
      typeof criterion === "string"
        ? null
        : toIdString(criterion?.parentCriterion) || null,
    expressionDomain:
      typeof criterion === "string"
        ? null
        : hasUsableSerializedExpressionDomain(criterion?.expressionDomain)
          ? cloneSerializable(criterion.expressionDomain, null)
          : null,
  }));
};

const serializeCriteriaTree = ({ criteriaDocs, leafItems }) => {
  if (!Array.isArray(criteriaDocs) || criteriaDocs.length === 0) {
    return [];
  }

  const leafItemById = new Map(
    leafItems
      .filter((criterion) => Boolean(criterion?.id))
      .map((criterion) => [criterion.id, criterion])
  );

  return buildCriteriaTreeFromDocs({
    criteriaDocs,
    mapNode: (criterion) => {
      const criterionId = toIdString(criterion?._id || criterion?.id) || null;
      const leafItem = criterionId ? leafItemById.get(criterionId) : null;

      return {
        id: criterionId,
        name: typeof criterion?.name === "string" ? criterion.name.trim() : "",
        type: typeof criterion?.type === "string" ? criterion.type : null,
        isLeaf: criterion?.isLeaf === true,
        parentId: toIdString(criterion?.parentCriterion) || null,
        expressionDomain: leafItem
          ? cloneSerializable(leafItem.expressionDomain, null)
          : null,
        children: [],
      };
    },
    sortChildren: (left, right) =>
      compareNameId(left.name, left.id || "", right.name, right.id || ""),
  });
};

const loadCriteriaTreeDocs = async ({ issue, criteria }) => {
  if (Array.isArray(criteria) && criteria.length > 0) {
    return criteria;
  }

  return Criterion.find({
    issue: issue?._id || issue?.id,
  })
    .select("_id name type isLeaf parentCriterion expressionDomain")
    .lean();
};

const serializeByIdMap = (items) =>
  items.reduce((accumulator, item) => {
    if (item?.id) {
      accumulator[item.id] = item;
    }
    return accumulator;
  }, {});

const serializeByNameMap = (items) =>
  items.reduce((accumulator, item) => {
    if (item?.name) {
      accumulator[item.name] = item;
    }
    return accumulator;
  }, {});

const loadModelSummary = async ({ issue }) => {
  const issueModel = issue?.model;
  const issueModelId =
    issueModel && typeof issueModel === "object"
      ? toIdString(issueModel?._id || issueModel?.id) || null
      : toIdString(issueModel) || null;

  const loadedModel =
    issueModel &&
    typeof issueModel === "object" &&
    typeof issueModel?.name === "string"
      ? issueModel
      : issueModelId
        ? await IssueModel.findById(issueModelId)
            .select("_id name apiModelKey modelFamilyKey versionLabel")
            .lean()
        : null;

  return {
    id: issueModelId,
    name:
      typeof loadedModel?.name === "string"
        ? loadedModel.name
        : null,
    apiModelKey:
      typeof issue?.apiModelKey === "string"
        ? issue.apiModelKey
        : typeof loadedModel?.apiModelKey === "string"
          ? loadedModel.apiModelKey
          : null,
    modelFamilyKey:
      typeof issue?.modelFamilyKey === "string"
        ? issue.modelFamilyKey
        : typeof loadedModel?.modelFamilyKey === "string"
          ? loadedModel.modelFamilyKey
          : null,
    versionLabel:
      typeof issue?.versionLabel === "string"
        ? issue.versionLabel
        : typeof loadedModel?.versionLabel === "string"
          ? loadedModel.versionLabel
          : null,
  };
};

const loadPreviousCollectiveEvaluations = async ({
  issue,
  stage,
  consensusPhase,
}) => {
  if (stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return {};
  }

  if (!Number.isInteger(consensusPhase) || consensusPhase <= 0) {
    return {};
  }

  const previousStageResult = await IssueStageResult.findOne({
    issue: issue?._id || issue?.id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    consensusPhase: consensusPhase - 1,
  }).lean();

  return isPlainObject(previousStageResult?.collectiveEvaluations)
    ? cloneSerializable(previousStageResult.collectiveEvaluations, {})
    : {};
};

export const buildEvaluationStructureContext = async ({
  issue,
  structure = null,
  stage = null,
  consensusPhase = null,
  alternatives = null,
  leafCriteria = null,
  criteria = null,
  collectiveEvaluations = null,
}) => {
  const resolvedStructure = resolveStructureForIssueStageOrNull({
    issue,
    stage,
    structure,
  });
  const resolvedStage = resolvedStructure?.stage || stage || null;
  const resolvedConsensusPhase =
    normalizeNonNegativeIntegerOrNull(consensusPhase) ??
    normalizeNonNegativeIntegerOrNull(issue?.consensusPhase);

  const [alternativeItems, leafItems, criteriaDocs, model] = await Promise.all([
    serializeAlternativeItemsOrThrow({ issue, alternatives }),
    serializeLeafCriterionItemsOrThrow({ issue, leafCriteria }),
    loadCriteriaTreeDocs({ issue, criteria }),
    loadModelSummary({ issue }),
  ]);

  const criteriaTree = serializeCriteriaTree({
    criteriaDocs,
    leafItems,
  });
  const leafNames = leafItems.map((criterion) => criterion.name);
  const currentCollectiveEvaluations = isPlainObject(collectiveEvaluations)
    ? cloneSerializable(collectiveEvaluations, {})
    : {};
  const previousCollectiveEvaluations =
    await loadPreviousCollectiveEvaluations({
      issue,
      stage: resolvedStage,
      consensusPhase: resolvedConsensusPhase,
    });

  return {
    issue: {
      id: toIdString(issue?._id || issue?.id) || null,
      name: typeof issue?.name === "string" ? issue.name : null,
      currentStage:
        typeof issue?.currentStage === "string" ? issue.currentStage : null,
      consensusPhase: resolvedConsensusPhase,
      isConsensus: issue?.isConsensus === true,
      consensusThreshold: normalizeFiniteNumberOrNull(issue?.consensusThreshold),
      consensusMaxPhases: normalizePositiveIntegerOrNull(issue?.consensusMaxPhases),
    },
    structure: {
      key: typeof resolvedStructure?.key === "string" ? resolvedStructure.key : null,
      stage: typeof resolvedStage === "string" ? resolvedStage : null,
    },
    model,
    parameters: {
      modelParameters: cloneSerializable(issue?.modelParameters, {}),
      criteriaWeightingParameters: cloneSerializable(
        issue?.criteriaWeightingParameters,
        {}
      ),
    },
    alternatives: {
      items: alternativeItems,
      names: alternativeItems.map((alternative) => alternative.name),
      byId: serializeByIdMap(alternativeItems),
      byName: serializeByNameMap(alternativeItems),
    },
    criteria: {
      tree: criteriaTree,
      leafItems,
      leafNames,
      leafById: serializeByIdMap(leafItems),
      leafByName: serializeByNameMap(leafItems),
    },
    domains: {
      byCriterionId: leafItems.reduce((accumulator, criterion) => {
        if (criterion.id) {
          accumulator[criterion.id] = cloneSerializable(
            criterion.expressionDomain,
            null
          );
        }
        return accumulator;
      }, {}),
      byCriterionName: leafItems.reduce((accumulator, criterion) => {
        if (criterion.name) {
          accumulator[criterion.name] = cloneSerializable(
            criterion.expressionDomain,
            null
          );
        }
        return accumulator;
      }, {}),
    },
    consensus: {
      phase: resolvedConsensusPhase,
      maxPhases: normalizePositiveIntegerOrNull(issue?.consensusMaxPhases),
      threshold: normalizeFiniteNumberOrNull(issue?.consensusThreshold),
      currentCollectiveEvaluations,
      previousCollectiveEvaluations,
    },
  };
};
