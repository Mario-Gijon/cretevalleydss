import { IssueModel } from "../../../models/IssueModels.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Criterion } from "../../../models/Criteria.js";
import { Participation } from "../../../models/Participations.js";
import { buildIssueCriteriaTree } from "../issue.criteriaTree.js";
import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../evaluations/evaluation.constants.js";
import { toIdString } from "../../../utils/common/ids.js";
import {
  createInternalError,
  createBadRequestError,
} from "../../../utils/common/errors.js";
import {
  buildDefaultsResolved,
  mergeParamsResolved,
} from "../scenarios/scenario.params.js";
import { buildScenarioCompatibilityMetadata } from "../scenarios/scenario.compatibility.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const mapCriteriaTreeToSummaryShape = (node) => ({
  _id: node.id,
  name: node.name,
  type: node.type,
  isLeaf: node.isLeaf,
  parentCriterion: node.parentId,
  children: node.children.map(mapCriteriaTreeToSummaryShape),
});

const attachWeightsToTree = (node, weightMap) => {
  if (node.isLeaf) {
    return {
      ...node,
      weight: weightMap[node.name],
    };
  }

  return {
    ...node,
    children: node.children.map((child) => attachWeightsToTree(child, weightMap)),
  };
};

const buildMatrixCellKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

const buildPairKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const ensureModelOrThrow = async ({ issue }) => {
  const populatedModel = issue?.model;

  if (
    populatedModel &&
    typeof populatedModel === "object" &&
    populatedModel !== null &&
    (populatedModel.name || populatedModel.parameters)
  ) {
    return populatedModel;
  }

  const modelId = issue?.model?._id || issue?.model;
  const loadedModel = await IssueModel.findById(modelId).lean();

  if (!loadedModel) {
    throw createInternalError("Finished issue model not found", {
      field: "model",
      details: {
        issueId: toIdString(issue?._id),
        modelId: toIdString(modelId),
      },
    });
  }

  return loadedModel;
};

const normalizeRankingEntry = ({ entry, scoresByAlternative }) => {
  if (typeof entry === "string" && entry.trim()) {
    return {
      name: entry,
      score: isPlainObject(scoresByAlternative)
        ? scoresByAlternative[entry] ?? null
        : null,
    };
  }

  if (!isPlainObject(entry)) {
    return null;
  }

  const name =
    typeof entry.name === "string" && entry.name.trim()
      ? entry.name
      : typeof entry.alternative === "string" && entry.alternative.trim()
      ? entry.alternative
      : null;

  if (!name) {
    return null;
  }

  const score = entry.score ?? entry.value ?? entry.weightedScore ?? null;

  return {
    name,
    score,
  };
};

const buildRankingPayloadOrThrow = ({ stageResult }) => {
  const computedPayload = isPlainObject(stageResult?.computedPayload)
    ? stageResult.computedPayload
    : null;

  if (!computedPayload) {
    throw createInternalError("IssueStageResult computedPayload is required", {
      field: "computedPayload",
      details: {
        issueId: toIdString(stageResult?.issue),
        stage: stageResult?.stage,
        consensusPhase: stageResult?.consensusPhase,
      },
    });
  }

  if (!Array.isArray(computedPayload.ranking)) {
    throw createInternalError("IssueStageResult computedPayload.ranking is required", {
      field: "computedPayload.ranking",
      details: {
        issueId: toIdString(stageResult?.issue),
        stage: stageResult?.stage,
        consensusPhase: stageResult?.consensusPhase,
      },
    });
  }

  const rankedWithScoresSource = Array.isArray(computedPayload.rankedWithScores)
    ? computedPayload.rankedWithScores
    : [];

  const rankingSource =
    rankedWithScoresSource.length > 0
      ? rankedWithScoresSource
      : computedPayload.ranking;

  const ranking = rankingSource
    .map((entry) =>
      normalizeRankingEntry({
        entry,
        scoresByAlternative: computedPayload.scoresByAlternative,
      })
    )
    .filter(Boolean);

  if (ranking.length === 0) {
    throw createInternalError("IssueStageResult ranking output is empty", {
      field: "computedPayload.ranking",
      details: {
        issueId: toIdString(stageResult?.issue),
        stage: stageResult?.stage,
        consensusPhase: stageResult?.consensusPhase,
      },
    });
  }

  return ranking;
};

const getCollectiveMatrixCandidate = ({ stageResult }) => {
  const collectiveFromPayload = stageResult?.collectivePayload?.collectiveMatrix;
  if (Array.isArray(collectiveFromPayload)) {
    return collectiveFromPayload;
  }

  const matrixUsed = stageResult?.computedPayload?.matrixUsed;
  if (Array.isArray(matrixUsed?.collectiveMatrix)) {
    return matrixUsed.collectiveMatrix;
  }

  if (Array.isArray(matrixUsed?.collective_matrix)) {
    return matrixUsed.collective_matrix;
  }

  const rawOutput = stageResult?.rawOutput;
  if (Array.isArray(rawOutput?.collective_matrix)) {
    return rawOutput.collective_matrix;
  }

  if (Array.isArray(rawOutput?.matrix_used?.collective_matrix)) {
    return rawOutput.matrix_used.collective_matrix;
  }

  return null;
};

const buildCollectiveMatrixEvaluations = ({
  stageResult,
  alternativeNames,
  criterionNames,
}) => {
  const collectiveMatrix = getCollectiveMatrixCandidate({ stageResult });

  if (!Array.isArray(collectiveMatrix) || collectiveMatrix.length === 0) {
    return {};
  }

  const collectiveEvaluations = {};

  for (
    let alternativeIndex = 0;
    alternativeIndex < alternativeNames.length;
    alternativeIndex += 1
  ) {
    const alternativeName = alternativeNames[alternativeIndex];
    const row = collectiveMatrix[alternativeIndex];

    if (!Array.isArray(row)) {
      continue;
    }

    collectiveEvaluations[alternativeName] = {};

    for (
      let criterionIndex = 0;
      criterionIndex < criterionNames.length;
      criterionIndex += 1
    ) {
      const criterionName = criterionNames[criterionIndex];
      collectiveEvaluations[alternativeName][criterionName] =
        row[criterionIndex] ?? "";
    }
  }

  return collectiveEvaluations;
};

const buildExpertAlternativeRatingsOrThrow = ({
  evaluations,
  alternativeNames,
  criterionNames,
  issueId,
  phase,
}) => {
  const expertEvaluations = {};

  for (const evaluation of evaluations) {
    const expertId = toIdString(evaluation?.expert?._id || evaluation?.expert);
    const expertEmailRaw = evaluation?.expert?.email;
    const expertEmail =
      typeof expertEmailRaw === "string" && expertEmailRaw.trim()
        ? expertEmailRaw.trim()
        : `expert_${expertId || "unknown"}`;

    const cells = evaluation?.payload?.cells;
    if (!isPlainObject(cells)) {
      throw createInternalError("IssueEvaluation payload.cells is required", {
        field: "payload.cells",
        details: {
          issueId: toIdString(issueId),
          phase,
          expert: expertEmail,
        },
      });
    }

    const rows = {};

    for (const alternativeName of alternativeNames) {
      rows[alternativeName] = {};

      for (const criterionName of criterionNames) {
        const cellKey = buildMatrixCellKey(alternativeName, criterionName);
        const cell = cells[cellKey];

        if (!isPlainObject(cell)) {
          throw createInternalError("IssueEvaluation cell is required for finished ratings", {
            field: "payload.cells",
            details: {
              issueId: toIdString(issueId),
              phase,
              expert: expertEmail,
              cellKey,
            },
          });
        }

        const value = cell.value;
        if (value === "" || value === null || value === undefined) {
          throw createInternalError("IssueEvaluation cell value is required for finished ratings", {
            field: "payload.cells",
            details: {
              issueId: toIdString(issueId),
              phase,
              expert: expertEmail,
              cellKey,
            },
          });
        }

        rows[alternativeName][criterionName] = value;
      }
    }

    expertEvaluations[expertEmail] = rows;
  }

  return expertEvaluations;
};

const buildPairwiseRowsForCriterionOrThrow = ({
  criterionComparisons,
  criterionName,
  alternativeNames,
  issueId,
  phase,
  expert,
}) => {
  if (!isPlainObject(criterionComparisons)) {
    throw createInternalError(
      "Pairwise criterion comparisons are required for finished ratings",
      {
        field: "payload.comparisonsByCriterion",
        details: {
          issueId: toIdString(issueId),
          phase,
          criterionName,
          expert,
        },
      }
    );
  }

  const rows = [];

  for (const rowAlternative of alternativeNames) {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      const pairKey = buildPairKey(rowAlternative, colAlternative);
      const cell = criterionComparisons[pairKey];

      if (!isPlainObject(cell)) {
        throw createInternalError(
          "Pairwise comparison cell is required for finished ratings",
          {
            field: "payload.comparisonsByCriterion",
            details: {
              issueId: toIdString(issueId),
              phase,
              criterionName,
              expert,
              pairKey,
            },
          }
        );
      }

      if (cell.value === "" || cell.value === null || cell.value === undefined) {
        throw createInternalError(
          "Pairwise comparison value is required for finished ratings",
          {
            field: "payload.comparisonsByCriterion",
            details: {
              issueId: toIdString(issueId),
              phase,
              criterionName,
              expert,
              pairKey,
            },
          }
        );
      }

      row[colAlternative] = {
        value: cell.value,
        expressionDomain: cell.expressionDomain ?? null,
      };
    }

    rows.push(row);
  }

  return rows;
};

const buildExpertPairwiseRatingsOrThrow = ({
  evaluations,
  alternativeNames,
  criterionNames,
  issueId,
  phase,
}) => {
  const expertEvaluations = {};

  for (const evaluation of evaluations) {
    const expertId = toIdString(evaluation?.expert?._id || evaluation?.expert);
    const expertEmailRaw = evaluation?.expert?.email;
    const expertEmail =
      typeof expertEmailRaw === "string" && expertEmailRaw.trim()
        ? expertEmailRaw.trim()
        : `expert_${expertId || "unknown"}`;

    const comparisonsByCriterion = evaluation?.payload?.comparisonsByCriterion;
    if (!isPlainObject(comparisonsByCriterion)) {
      throw createInternalError(
        "IssueEvaluation payload.comparisonsByCriterion is required",
        {
          field: "payload.comparisonsByCriterion",
          details: {
            issueId: toIdString(issueId),
            phase,
            expert: expertEmail,
          },
        }
      );
    }

    const expertCriteriaMatrices = {};

    for (const criterionName of criterionNames) {
      expertCriteriaMatrices[criterionName] = buildPairwiseRowsForCriterionOrThrow({
        criterionComparisons: comparisonsByCriterion[criterionName],
        criterionName,
        alternativeNames,
        issueId,
        phase,
        expert: expertEmail,
      });
    }

    expertEvaluations[expertEmail] = expertCriteriaMatrices;
  }

  return expertEvaluations;
};

const resolveCollectivePairwiseSource = (stageResult) => {
  if (isPlainObject(stageResult?.collectivePayload?.collectiveEvaluations)) {
    return stageResult.collectivePayload.collectiveEvaluations;
  }

  if (isPlainObject(stageResult?.computedPayload?.matrixUsed?.collectiveEvaluations)) {
    return stageResult.computedPayload.matrixUsed.collectiveEvaluations;
  }

  if (isPlainObject(stageResult?.rawOutput?.collective_evaluations)) {
    return stageResult.rawOutput.collective_evaluations;
  }

  return null;
};

const buildCollectivePairwiseEvaluations = ({
  stageResult,
  alternativeNames,
  criterionNames,
}) => {
  const source = resolveCollectivePairwiseSource(stageResult);
  if (!isPlainObject(source)) {
    return null;
  }

  const collectiveEvaluations = {};

  for (const criterionName of criterionNames) {
    const matrix = source[criterionName];
    if (!Array.isArray(matrix)) {
      continue;
    }

    const rows = [];

    for (let rowIndex = 0; rowIndex < alternativeNames.length; rowIndex += 1) {
      const rowAlternative = alternativeNames[rowIndex];
      const sourceRow = matrix[rowIndex];

      if (!Array.isArray(sourceRow)) {
        continue;
      }

      const row = { id: rowAlternative };

      for (let colIndex = 0; colIndex < alternativeNames.length; colIndex += 1) {
        const colAlternative = alternativeNames[colIndex];

        if (rowAlternative === colAlternative) {
          row[colAlternative] = {
            value: "Neutral",
            expressionDomain: null,
            isNeutralFallback: true,
          };
          continue;
        }

        row[colAlternative] = {
          value: sourceRow[colIndex] ?? "",
          expressionDomain: null,
        };
      }

      rows.push(row);
    }

    collectiveEvaluations[criterionName] = rows;
  }

  return Object.keys(collectiveEvaluations).length > 0
    ? collectiveEvaluations
    : null;
};

const buildParticipationsSummary = ({ participations, completedEvaluations }) => {
  const completedExpertEmails = new Set(
    completedEvaluations
      .map((evaluation) => evaluation?.expert?.email)
      .filter((email) => typeof email === "string" && email.trim())
  );

  const participated = [...completedExpertEmails].sort((left, right) =>
    left.localeCompare(right)
  );

  const notAccepted = participations
    .filter((participation) => participation?.invitationStatus === "declined")
    .map((participation) => participation?.expert?.email)
    .filter((email) => typeof email === "string" && email.trim())
    .sort((left, right) => left.localeCompare(right));

  return {
    participated,
    notAccepted,
  };
};

const buildSummarySection = ({
  issue,
  model,
  criteria,
  orderedLeafCriteria,
  alternatives,
  experts,
  consensusInfo,
}) => {
  const { criteriaTree } = buildIssueCriteriaTree(criteria, issue);
  const weights = Array.isArray(issue?.modelParameters?.weights)
    ? issue.modelParameters.weights
    : [];

  const weightMap = orderedLeafCriteria.reduce((accumulator, criterion, index) => {
    accumulator[criterion.name] = weights[index];
    return accumulator;
  }, {});

  return {
    name: issue.name,
    admin: issue?.admin?.email || null,
    description: issue.description,
    model: model?.name || null,
    criteria: criteriaTree
      .map(mapCriteriaTreeToSummaryShape)
      .map((node) => attachWeightsToTree(node, weightMap)),
    alternatives: alternatives.map((alternative) => alternative.name),
    creationDate: issue.creationDate,
    closureDate: issue.closureDate,
    alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    criteriaWeightingAggregationMode: issue.criteriaWeightingAggregationMode,
    isConsensus: issue?.isConsensus === true,
    consensusInfo,
    experts,
  };
};

const buildModelExecutionPayload = (stageResult) => {
  const modelExecution = isPlainObject(stageResult?.modelExecution)
    ? stageResult.modelExecution
    : {};

  return {
    ...modelExecution,
    rawOutput: stageResult?.rawOutput ?? {},
  };
};

const enrichPlotsGraphicWithExpertLabels = ({
  plotsGraphic,
  evaluations,
}) => {
  if (!isPlainObject(plotsGraphic)) {
    return plotsGraphic;
  }

  const expertPoints = Array.isArray(plotsGraphic.expert_points)
    ? plotsGraphic.expert_points
    : [];

  const expertLabels = (Array.isArray(evaluations) ? evaluations : [])
    .map((evaluation) => {
      const email = evaluation?.expert?.email;
      if (typeof email === "string" && email.trim()) {
        return email.trim();
      }

      const name = evaluation?.expert?.name;
      if (typeof name === "string" && name.trim()) {
        return name.trim();
      }

      const expertId = toIdString(evaluation?.expert?._id || evaluation?.expert);
      return expertId ? `expert_${expertId}` : null;
    })
    .filter(Boolean);

  const expertPointsByEmail = {};
  const matchedLength = Math.min(expertPoints.length, expertLabels.length);

  for (let index = 0; index < matchedLength; index += 1) {
    const label = expertLabels[index];
    const point = expertPoints[index];
    if (!label || !Array.isArray(point) || point.length !== 2) {
      continue;
    }
    expertPointsByEmail[label] = point;
  }

  return {
    ...plotsGraphic,
    expert_labels: expertLabels,
    expert_points_by_email: expertPointsByEmail,
  };
};

const buildAvailableModelsPayload = ({
  issue,
  allModels,
  issueAlternativeEvaluationStructureKey,
  issueDomainSnapshots,
  leafCount,
}) => {
  return allModels.map((modelDoc) => {
    const metadata = buildScenarioCompatibilityMetadata({
      issue,
      targetModel: modelDoc,
      issueDomainSnapshots,
    });

    return {
      id: toIdString(modelDoc._id),
      name: modelDoc.name,
      alternativeEvaluationStructureKey:
        modelDoc.alternativeEvaluationStructureKey || null,
      criteriaWeightingStructureKey:
        modelDoc.criteriaWeightingStructureKey || null,
      supportsConsensus: modelDoc.supportsConsensus === true,
      isMultiCriteria: modelDoc.isMultiCriteria,
      smallDescription: modelDoc.smallDescription,
      moreInfoUrl: modelDoc.moreInfoUrl,
      parameters: modelDoc.parameters,
      defaultsResolved: buildDefaultsResolved({
        modelDoc,
        leafCount,
      }),
      scenarioCompatibility: {
        compatible: metadata.compatible,
        reasons: metadata.reasons,
        structureMatches: metadata.structureMatches,
        domainsMatch: metadata.domainsMatch,
        consensusModeMatches: metadata.consensusModeMatches,
        sameModel: metadata.sameModel,
      },
      compatibility: {
        alternativeEvaluationStructure:
          modelDoc.alternativeEvaluationStructureKey ===
          issueAlternativeEvaluationStructureKey,
        domain: metadata.domainsMatch,
      },
    };
  });
};

const normalizeConsensusPhaseOrThrow = ({ value, issueId, stage }) => {
  if (!Number.isInteger(value) || value < 1) {
    throw createInternalError("IssueStageResult has invalid consensusPhase", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issueId),
        stage,
        consensusPhase: value ?? null,
      },
    });
  }

  return value;
};

const validateAcceptedEvaluationCoverageOrThrow = ({
  acceptedParticipations,
  completedEvaluations,
  issue,
  phase,
}) => {
  if (acceptedParticipations.length === 0) {
    throw createBadRequestError("Finished issue has no accepted experts", {
      field: "participations",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (completedEvaluations.length !== acceptedParticipations.length) {
    throw createInternalError(
      "Completed alternative evaluations are missing for the finished issue stage",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue?._id),
          phase,
          expected: acceptedParticipations.length,
          received: completedEvaluations.length,
        },
      }
    );
  }

  const acceptedByExpertId = new Set(
    acceptedParticipations.map((participation) =>
      toIdString(participation?.expert?._id || participation?.expert)
    )
  );

  const receivedByExpertId = new Set(
    completedEvaluations.map((evaluation) =>
      toIdString(evaluation?.expert?._id || evaluation?.expert)
    )
  );

  for (const expertId of acceptedByExpertId) {
    if (!receivedByExpertId.has(expertId)) {
      throw createInternalError(
        "Completed alternative evaluations are missing for one or more experts",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue?._id),
            phase,
            expertId,
          },
        }
      );
    }
  }
};

const buildConsensusRoundPayloadOrThrow = ({ stageResult, threshold }) => {
  const phase = normalizeConsensusPhaseOrThrow({
    value: stageResult?.consensusPhase,
    issueId: stageResult?.issue,
    stage: stageResult?.stage,
  });

  if (!isPlainObject(stageResult?.computedPayload)) {
    throw createInternalError("IssueStageResult computedPayload is required", {
      field: "computedPayload",
      details: {
        issueId: toIdString(stageResult?.issue),
        phase,
      },
    });
  }

  if (
    typeof stageResult?.consensusMeasure !== "number" ||
    !Number.isFinite(stageResult.consensusMeasure)
  ) {
    throw createInternalError("IssueStageResult consensusMeasure must be finite", {
      field: "consensusMeasure",
      details: {
        issueId: toIdString(stageResult?.issue),
        phase,
      },
    });
  }

  const ranking = buildRankingPayloadOrThrow({ stageResult });
  const lifecycle = isPlainObject(stageResult?.computedPayload?.consensusLifecycle)
    ? stageResult.computedPayload.consensusLifecycle
    : {};

  const consensusReached =
    lifecycle?.consensusReached === true ||
    (Number.isFinite(threshold) && stageResult.consensusMeasure >= threshold);
  const maxPhasesReached = lifecycle?.maxPhasesReached === true;
  const finalizationReason = lifecycle?.finalizationReason || null;

  return {
    phase,
    consensusMeasure: stageResult.consensusMeasure,
    threshold,
    consensusReached,
    maxPhasesReached,
    finalizationReason,
    modelExecution: buildModelExecutionPayload(stageResult),
    computedPayload: stageResult.computedPayload || {},
    collectivePayload: stageResult.collectivePayload || {},
    rawOutput: stageResult.rawOutput || {},
    ranking,
  };
};

const buildConsensusInfo = ({ issue, consensusRounds }) => {
  const consensusReachedRound = consensusRounds.find(
    (round) => round.finalizationReason === "consensusReached"
  );
  const lastRound = consensusRounds[consensusRounds.length - 1] || null;

  return {
    threshold: issue.consensusThreshold ?? null,
    maxPhases: issue.consensusMaxPhases ?? null,
    currentPhase: issue.consensusPhase ?? null,
    consensusReachedPhase: consensusReachedRound?.phase ?? null,
    finalizationReason: lastRound?.finalizationReason || null,
    finalConsensusMeasure: lastRound?.consensusMeasure ?? null,
  };
};

const buildNonConsensusMatrixFinishedPayload = async ({ issue }) => {
  const latestAlternativeResult = await IssueStageResult.findOne({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: -1 })
    .lean();

  if (!latestAlternativeResult) {
    throw createInternalError(
      "Finished issue requires an alternative evaluation stage result",
      {
        field: "stageResult",
        details: {
          issueId: toIdString(issue?._id),
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      }
    );
  }

  const phase = normalizeConsensusPhaseOrThrow({
    value: latestAlternativeResult?.consensusPhase,
    issueId: issue?._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  });

  const [
    completedAlternativeEvaluations,
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
    allModels,
    issueDomainSnapshots,
  ] = await Promise.all([
    IssueEvaluation.find({
      issue: issue._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: phase,
      completed: true,
    })
      .populate("expert", "email name")
      .lean(),
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
    Criterion.find({ issue: issue._id }).lean(),
    Participation.find({ issue: issue._id })
      .populate("expert", "email name")
      .lean(),
    IssueModel.find({
      isIssueModel: true,
      $or: [
        { manifestSync: { $exists: false } },
        { "manifestSync.isStale": { $exists: false } },
        { "manifestSync.isStale": false },
      ],
    })
      .select(
        "_id name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus isMultiCriteria smallDescription moreInfoUrl parameters supportedDomains"
      )
      .lean(),
    IssueExpressionDomain.find({ issue: issue._id })
      .select("_id name type numericRange membershipFunction")
      .lean(),
  ]);

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  if (alternatives.length === 0) {
    throw createInternalError("Finished issue alternatives are required", {
      field: "alternatives",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (orderedLeafCriteria.length === 0) {
    throw createInternalError("Finished issue leaf criteria are required", {
      field: "criteria",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  validateAcceptedEvaluationCoverageOrThrow({
    acceptedParticipations,
    completedEvaluations: completedAlternativeEvaluations,
    issue,
    phase,
  });

  const model = await ensureModelOrThrow({ issue });

  const leafCount = orderedLeafCriteria.length;
  const leafCriteria = orderedLeafCriteria.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
  }));

  const ranking = buildRankingPayloadOrThrow({
    stageResult: latestAlternativeResult,
  });

  const alternativeNames = alternatives.map((alternative) => alternative.name);
  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);

  const expertEvaluations = buildExpertAlternativeRatingsOrThrow({
    evaluations: completedAlternativeEvaluations,
    alternativeNames,
    criterionNames,
    issueId: issue._id,
    phase,
  });

  const collectiveEvaluations = buildCollectiveMatrixEvaluations({
    stageResult: latestAlternativeResult,
    alternativeNames,
    criterionNames,
  });
  const collectiveEvaluationsPayload =
    Object.keys(collectiveEvaluations).length > 0
      ? collectiveEvaluations
      : null;

  const experts = buildParticipationsSummary({
    participations,
    completedEvaluations: completedAlternativeEvaluations,
  });

  const summary = buildSummarySection({
    issue,
    model,
    criteria,
    orderedLeafCriteria,
    alternatives,
    experts,
    consensusInfo: null,
  });

  const baseDefaultsResolved = buildDefaultsResolved({
    modelDoc: model,
    leafCount,
  });

  const baseParamsSaved = issue.modelParameters || {};
  const baseParamsResolved = mergeParamsResolved({
    defaultsResolved: baseDefaultsResolved,
    savedParams: baseParamsSaved,
  });
  const domainType = null;
  const availableModels = buildAvailableModelsPayload({
    issue,
    allModels,
    issueAlternativeEvaluationStructureKey:
      issue.alternativeEvaluationStructureKey,
    issueDomainSnapshots,
    leafCount,
  });

  const modelExecution = buildModelExecutionPayload(latestAlternativeResult);
  const enrichedLatestPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
    plotsGraphic: latestAlternativeResult?.computedPayload?.plotsGraphic || {},
    evaluations: completedAlternativeEvaluations,
  });

  const consensusDetails = {
    modelExecution,
    rawOutput: latestAlternativeResult?.rawOutput || {},
    rankedAlternatives: ranking,
    plotsGraphic: enrichedLatestPlotsGraphic,
    scoresByAlternative:
      latestAlternativeResult?.computedPayload?.scoresByAlternative || {},
    consensusMeasure: latestAlternativeResult?.consensusMeasure ?? null,
  };

  return {
    summary,
    alternativesRankings: [
      {
        phase,
        ranking,
      },
    ],
    expertsRatings: {
      [phase]: {
        collectiveEvaluations: collectiveEvaluationsPayload,
        expertEvaluations,
      },
    },
    analyticalGraphs:
      isPlainObject(enrichedLatestPlotsGraphic) &&
      Object.keys(enrichedLatestPlotsGraphic).length > 0
        ? {
            plotsGraphic: enrichedLatestPlotsGraphic,
          }
        : null,
    consensusDetails,
    modelExecution,
    consensus: [],
    consensusHistory: [],
    consensusRounds: [],
    scenarios: [],
    modelParams: {
      leafCriteria,
      domainType,
      base: {
        modelId: toIdString(model._id),
        modelName: model.name,
        alternativeEvaluationStructureKey:
          issue.alternativeEvaluationStructureKey,
        criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
        supportsConsensus: issue.supportsConsensus === true,
        parameters: model.parameters,
        paramsSaved: baseParamsSaved,
        paramsResolved: baseParamsResolved,
      },
      availableModels,
    },
  };
};

const buildConsensusPairwiseFinishedPayload = async ({ issue }) => {
  const alternativeStageResults = await IssueStageResult.find({
    issue: issue._id,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  })
    .sort({ consensusPhase: 1 })
    .lean();

  if (!Array.isArray(alternativeStageResults) || alternativeStageResults.length === 0) {
    throw createInternalError(
      "Finished consensus issue requires alternative evaluation stage results",
      {
        field: "stageResults",
        details: {
          issueId: toIdString(issue?._id),
          stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        },
      }
    );
  }

  const phaseList = alternativeStageResults.map((stageResult) =>
    normalizeConsensusPhaseOrThrow({
      value: stageResult?.consensusPhase,
      issueId: issue?._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    })
  );

  const [
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
    allCompletedAlternativeEvaluations,
    allModels,
    issueDomainSnapshots,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
    Criterion.find({ issue: issue._id }).lean(),
    Participation.find({ issue: issue._id })
      .populate("expert", "email name")
      .lean(),
    IssueEvaluation.find({
      issue: issue._id,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      consensusPhase: { $in: phaseList },
      completed: true,
    })
      .populate("expert", "email name")
      .lean(),
    IssueModel.find({
      isIssueModel: true,
      $or: [
        { manifestSync: { $exists: false } },
        { "manifestSync.isStale": { $exists: false } },
        { "manifestSync.isStale": false },
      ],
    })
      .select(
        "_id name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus isMultiCriteria smallDescription moreInfoUrl parameters supportedDomains"
      )
      .lean(),
    IssueExpressionDomain.find({ issue: issue._id })
      .select("_id name type numericRange membershipFunction")
      .lean(),
  ]);

  if (alternatives.length === 0) {
    throw createInternalError("Finished issue alternatives are required", {
      field: "alternatives",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (orderedLeafCriteria.length === 0) {
    throw createInternalError("Finished issue leaf criteria are required", {
      field: "criteria",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  const completedByPhase = allCompletedAlternativeEvaluations.reduce(
    (accumulator, evaluation) => {
      const phase = Number(evaluation?.consensusPhase);
      if (!Number.isInteger(phase) || phase < 1) {
        return accumulator;
      }

      if (!accumulator.has(phase)) {
        accumulator.set(phase, []);
      }

      accumulator.get(phase).push(evaluation);
      return accumulator;
    },
    new Map()
  );

  const model = await ensureModelOrThrow({ issue });
  const leafCount = orderedLeafCriteria.length;
  const leafCriteria = orderedLeafCriteria.map((criterion) => ({
    id: toIdString(criterion._id),
    name: criterion.name,
    type: criterion.type,
  }));
  const alternativeNames = alternatives.map((alternative) => alternative.name);
  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);

  const experts = buildParticipationsSummary({
    participations,
    completedEvaluations: allCompletedAlternativeEvaluations,
  });

  const consensusRounds = [];
  const alternativesRankings = [];
  const expertsRatings = {};

  for (const stageResult of alternativeStageResults) {
    const phase = Number(stageResult.consensusPhase);
    const phaseEvaluations = completedByPhase.get(phase) || [];

    if (phaseEvaluations.length === 0) {
      throw createInternalError(
        "Completed alternative evaluations are missing for a consensus phase",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue?._id),
            phase,
          },
        }
      );
    }

    validateAcceptedEvaluationCoverageOrThrow({
      acceptedParticipations,
      completedEvaluations: phaseEvaluations,
      issue,
      phase,
    });

    const enrichedPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
      plotsGraphic: stageResult?.computedPayload?.plotsGraphic || {},
      evaluations: phaseEvaluations,
    });

    const round = buildConsensusRoundPayloadOrThrow({
      stageResult,
      threshold: issue.consensusThreshold,
    });
    round.computedPayload = {
      ...(round.computedPayload || {}),
      plotsGraphic: enrichedPlotsGraphic,
    };

    const expertEvaluations = buildExpertPairwiseRatingsOrThrow({
      evaluations: phaseEvaluations,
      alternativeNames,
      criterionNames,
      issueId: issue._id,
      phase,
    });

    const collectiveEvaluations = buildCollectivePairwiseEvaluations({
      stageResult,
      alternativeNames,
      criterionNames,
    });

    expertsRatings[phase] = {
      consensusMeasure: round.consensusMeasure,
      collectiveEvaluations,
      collectiveEvaluationsLocalizedByExpert: null,
      expertEvaluations,
    };

    alternativesRankings.push({
      phase,
      ranking: round.ranking,
    });

    consensusRounds.push(round);
  }

  const summary = buildSummarySection({
    issue,
    model,
    criteria,
    orderedLeafCriteria,
    alternatives,
    experts,
    consensusInfo: buildConsensusInfo({
      issue,
      consensusRounds,
    }),
  });

  const baseDefaultsResolved = buildDefaultsResolved({
    modelDoc: model,
    leafCount,
  });

  const baseParamsSaved = issue.modelParameters || {};
  const baseParamsResolved = mergeParamsResolved({
    defaultsResolved: baseDefaultsResolved,
    savedParams: baseParamsSaved,
  });
  const availableModels = buildAvailableModelsPayload({
    issue,
    allModels,
    issueAlternativeEvaluationStructureKey:
      issue.alternativeEvaluationStructureKey,
    issueDomainSnapshots,
    leafCount,
  });

  const latestRound = consensusRounds[consensusRounds.length - 1];
  const latestRanking =
    alternativesRankings[alternativesRankings.length - 1]?.ranking || [];

  const modelExecution = latestRound?.modelExecution || {
    rawOutput: latestRound?.rawOutput || {},
  };

  const scatterPlotByPhase = Array(issue.consensusPhase || 0).fill(null);
  for (const stageResult of alternativeStageResults) {
    const phase = Number(stageResult.consensusPhase);
    const phaseEvaluations = completedByPhase.get(phase) || [];
    const plotsGraphic = enrichPlotsGraphicWithExpertLabels({
      plotsGraphic: stageResult?.computedPayload?.plotsGraphic || {},
      evaluations: phaseEvaluations,
    });
    if (
      Number.isInteger(phase) &&
      phase > 0 &&
      isPlainObject(plotsGraphic) &&
      Object.keys(plotsGraphic).length > 0
    ) {
      scatterPlotByPhase[phase - 1] = plotsGraphic;
    }
  }

  const hasScatterData = scatterPlotByPhase.some(
    (entry) => isPlainObject(entry) && Object.keys(entry).length > 0
  );

  const consensusLineSeries = consensusRounds.map((round) => ({
    phase: round.phase,
    consensusMeasure: round.consensusMeasure,
    threshold: issue.consensusThreshold ?? null,
  }));

  const latestPhaseEvaluations =
    completedByPhase.get(Number(latestRound?.phase)) || [];
  const latestRoundPlotsGraphic = enrichPlotsGraphicWithExpertLabels({
    plotsGraphic: latestRound?.computedPayload?.plotsGraphic || {},
    evaluations: latestPhaseEvaluations,
  });

  return {
    summary,
    alternativesRankings,
    expertsRatings,
    analyticalGraphs: {
      ...(hasScatterData ? { scatterPlot: scatterPlotByPhase } : {}),
      consensusLevelLineChart: {
        labels: consensusLineSeries.map((entry) => `Round ${entry.phase}`),
        data: consensusLineSeries.map((entry) => entry.consensusMeasure),
        threshold: issue.consensusThreshold ?? null,
        series: consensusLineSeries,
      },
    },
    consensusDetails: {
      modelExecution,
      rawOutput: latestRound?.rawOutput || {},
      rankedAlternatives: latestRanking,
      plotsGraphic: latestRoundPlotsGraphic,
      scoresByAlternative:
        latestRound?.computedPayload?.scoresByAlternative || {},
      consensusMeasure: latestRound?.consensusMeasure ?? null,
    },
    modelExecution,
    consensus: consensusRounds,
    consensusHistory: consensusRounds,
    consensusRounds,
    scenarios: [],
    modelParams: {
      leafCriteria,
      domainType: null,
      base: {
        modelId: toIdString(model._id),
        modelName: model.name,
        alternativeEvaluationStructureKey:
          issue.alternativeEvaluationStructureKey,
        criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
        supportsConsensus: issue.supportsConsensus === true,
        parameters: model.parameters,
        paramsSaved: baseParamsSaved,
        paramsResolved: baseParamsResolved,
      },
      availableModels,
    },
  };
};

const isFinishedIssue = (issue) =>
  issue?.currentStage === "finished" && issue?.active === false;

export const supportsPluginFinishedIssuePayload = (issue) => {
  if (!isFinishedIssue(issue)) {
    return false;
  }

  const structureKey = issue?.alternativeEvaluationStructureKey;

  const isMatrixNonConsensus =
    structureKey === EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX &&
    issue?.isConsensus !== true;

  const isPairwiseConsensus =
    structureKey ===
      EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION &&
    issue?.isConsensus === true;

  return isMatrixNonConsensus || isPairwiseConsensus;
};

export const buildPluginFinishedIssuePayload = async ({ issue }) => {
  if (!isFinishedIssue(issue)) {
    throw createBadRequestError(
      "Plugin finished payload is only supported for finished inactive issues",
      {
        field: "currentStage",
      }
    );
  }

  const structureKey = issue?.alternativeEvaluationStructureKey;

  if (
    structureKey === EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX &&
    issue?.isConsensus !== true
  ) {
    return buildNonConsensusMatrixFinishedPayload({ issue });
  }

  if (
    structureKey ===
      EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION &&
    issue?.isConsensus === true
  ) {
    return buildConsensusPairwiseFinishedPayload({ issue });
  }

  throw createBadRequestError(
    "Unsupported plugin finished issue structure for this phase",
    {
      field: "alternativeEvaluationStructureKey",
      details: {
        alternativeEvaluationStructureKey: structureKey || null,
        isConsensus: issue?.isConsensus === true,
      },
    }
  );
};
