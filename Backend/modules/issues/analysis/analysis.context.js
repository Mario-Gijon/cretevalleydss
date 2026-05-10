import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { Evaluation } from "../../../models/Evaluations.js";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { Participation } from "../../../models/Participations.js";

import { buildIssueCriteriaTree } from "../issue.criteriaTree.js";
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
  orderDocsByIdList,
} from "../issue.ordering.js";
import { normalizeEvaluationValueForInputOrThrow } from "../expressionDomains/expressionDomain.transforms.js";

import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { buildConsensusHistoryFromDocs } from "../consensus/index.js";

const CONTEXT_VERSION = "1.0";

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toIsoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const selectLatestRoundFromHistory = (history) => {
  const safeHistory = Array.isArray(history) ? history : [];
  if (!safeHistory.length) {
    return null;
  }

  return safeHistory.reduce((latest, current) => {
    const latestPhase = Number(latest?.phase) || 0;
    const currentPhase = Number(current?.phase) || 0;
    return currentPhase > latestPhase ? current : latest;
  }, safeHistory[0]);
};

const buildScoresByAlternative = (rankedWithScores = []) => {
  const scoresByAlternative = {};

  for (const row of rankedWithScores) {
    const name = normalizeNonEmptyString(row?.name);
    const score = toNumberOrNull(row?.score);
    if (!name || score === null) continue;
    scoresByAlternative[name] = score;
  }

  return scoresByAlternative;
};

const mapCriteriaTreeToContextShape = (node) => ({
  id: node.id,
  name: node.name,
  type: node.type,
  isLeaf: node.isLeaf,
  parentId: node.parentId || null,
  children: node.children.map(mapCriteriaTreeToContextShape),
});

const buildFinalResultFromRound = ({ latestRound, latestConsensusDoc, warnings }) => {
  const consensusLike = latestRound || latestConsensusDoc || null;

  if (!consensusLike) {
    warnings.push({
      code: "MISSING_FINAL_RESULT",
      message: "No consensus/result round was found for this issue.",
    });

    return {
      ranking: [],
      rankedWithScores: [],
      scoresByAlternative: {},
      collectiveEvaluations: {},
      collectiveEvaluationsLocalized: {},
      collectiveEvaluationsLocalizedByExpert: {},
      rawOutput: {},
      modelExecution: {},
    };
  }

  const rankedWithScores =
    (Array.isArray(consensusLike.rankedWithScores) && consensusLike.rankedWithScores) ||
    (Array.isArray(latestConsensusDoc?.details?.rankedAlternatives)
      ? latestConsensusDoc.details.rankedAlternatives
      : []);

  const ranking =
    (Array.isArray(consensusLike.rankedAlternatives) && consensusLike.rankedAlternatives) ||
    rankedWithScores
      .map((row) => normalizeNonEmptyString(row?.name))
      .filter(Boolean);

  const collectiveEvaluations =
    consensusLike.collectiveEvaluations || latestConsensusDoc?.collectiveEvaluations || {};

  const modelExecution =
    consensusLike.modelExecution || latestConsensusDoc?.details?.modelExecution || {};

  const rawOutput = modelExecution?.rawOutput || {};

  return {
    ranking,
    rankedWithScores,
    scoresByAlternative: buildScoresByAlternative(rankedWithScores),
    collectiveEvaluations,
    collectiveEvaluationsLocalized: {},
    collectiveEvaluationsLocalizedByExpert: {},
    rawOutput,
    modelExecution,
  };
};

const buildScoresByAlternativeFromMap = (scoresByAlternative) => {
  if (!scoresByAlternative || typeof scoresByAlternative !== "object") {
    return {};
  }

  const normalized = {};
  for (const [name, score] of Object.entries(scoresByAlternative)) {
    const normalizedName = normalizeNonEmptyString(name);
    const normalizedScore = toNumberOrNull(score);
    if (!normalizedName || normalizedScore === null) continue;
    normalized[normalizedName] = normalizedScore;
  }

  return normalized;
};

const buildRankingFromRawScenarioOutput = ({ rawOutput, alternatives }) => {
  const rankingIndexes = Array.isArray(rawOutput?.collective_ranking)
    ? rawOutput.collective_ranking
    : [];
  const collectiveScores = Array.isArray(rawOutput?.collective_scores)
    ? rawOutput.collective_scores
    : [];

  if (!rankingIndexes.length || !Array.isArray(alternatives) || !alternatives.length) {
    return {
      ranking: [],
      rankedWithScores: [],
      scoresByAlternative: {},
    };
  }

  const ranking = [];
  const rankedWithScores = [];
  const scoresByAlternative = {};

  for (const rankingIndex of rankingIndexes) {
    const index = Number(rankingIndex);
    if (!Number.isInteger(index) || index < 0 || index >= alternatives.length) {
      continue;
    }

    const alternativeName = normalizeNonEmptyString(alternatives[index]?.name);
    if (!alternativeName) continue;

    ranking.push(alternativeName);
    const score = toNumberOrNull(collectiveScores[index]);
    rankedWithScores.push({
      name: alternativeName,
      score,
    });
    if (score !== null) {
      scoresByAlternative[alternativeName] = score;
    }
  }

  return {
    ranking,
    rankedWithScores,
    scoresByAlternative,
  };
};

const normalizeScenarioResultOrThrow = ({ scenarioDoc, alternatives }) => {
  const details = scenarioDoc?.outputs?.details || {};
  const outputs = scenarioDoc?.outputs || {};
  const rawOutput =
    outputs?.rawResults ||
    details?.modelExecution?.rawOutput ||
    {};

  const rankedWithScoresFromDetails = Array.isArray(details?.rankedWithScores)
    ? details.rankedWithScores
    : [];
  const rankedAlternativesFromDetails = Array.isArray(details?.rankedAlternatives)
    ? details.rankedAlternatives
    : [];
  const rankedWithScoresFromOutputs = Array.isArray(outputs?.rankedWithScores)
    ? outputs.rankedWithScores
    : [];
  const rankedWithScoresFromResult = Array.isArray(scenarioDoc?.result?.rankedWithScores)
    ? scenarioDoc.result.rankedWithScores
    : [];

  let rankedWithScores =
    rankedWithScoresFromDetails.length
      ? rankedWithScoresFromDetails
      : rankedWithScoresFromOutputs.length
        ? rankedWithScoresFromOutputs
        : rankedWithScoresFromResult.length
          ? rankedWithScoresFromResult
          : [];

  let ranking = [];

  if (rankedWithScores.length) {
    ranking = rankedWithScores
      .map((row) => normalizeNonEmptyString(row?.name))
      .filter(Boolean);
  } else if (rankedAlternativesFromDetails.length) {
    const hasObjectRows = rankedAlternativesFromDetails.every(
      (row) => row && typeof row === "object" && normalizeNonEmptyString(row?.name)
    );
    if (hasObjectRows) {
      rankedWithScores = rankedAlternativesFromDetails;
      ranking = rankedAlternativesFromDetails
        .map((row) => normalizeNonEmptyString(row?.name))
        .filter(Boolean);
    } else {
      ranking = rankedAlternativesFromDetails
        .map((name) => normalizeNonEmptyString(name))
        .filter(Boolean);
      rankedWithScores = ranking.map((name) => ({ name, score: null }));
    }
  } else {
    const rankingFromOutputs = Array.isArray(outputs?.ranking)
      ? outputs.ranking
      : Array.isArray(scenarioDoc?.result?.ranking)
        ? scenarioDoc.result.ranking
        : Array.isArray(details?.ranking)
          ? details.ranking
          : [];
    ranking = rankingFromOutputs
      .map((name) => normalizeNonEmptyString(name))
      .filter(Boolean);
    if (ranking.length) {
      rankedWithScores = ranking.map((name) => ({ name, score: null }));
    }
  }

  let scoresByAlternative = buildScoresByAlternative(rankedWithScores);
  if (!Object.keys(scoresByAlternative).length) {
    scoresByAlternative = buildScoresByAlternativeFromMap(
      details?.scoresByAlternative ||
      outputs?.scoresByAlternative ||
      scenarioDoc?.result?.scoresByAlternative
    );
  }

  if (!ranking.length) {
    const fallback = buildRankingFromRawScenarioOutput({
      rawOutput,
      alternatives,
    });
    ranking = fallback.ranking;
    rankedWithScores = fallback.rankedWithScores;
    scoresByAlternative = fallback.scoresByAlternative;
  }

  if (!ranking.length) {
    throw createBadRequestError("Scenario result does not contain ranking output.", {
      field: "scenarioId",
      details: {
        scenarioId: toIdString(scenarioDoc?._id),
      },
    });
  }

  return {
    ranking,
    rankedWithScores,
    scoresByAlternative,
    collectiveEvaluations: outputs?.collectiveEvaluations || {},
    collectiveEvaluationsLocalized: {},
    collectiveEvaluationsLocalizedByExpert: {},
    rawOutput: rawOutput && typeof rawOutput === "object" ? rawOutput : {},
    modelExecution:
      details?.modelExecution ||
      (rawOutput && Object.keys(rawOutput).length ? { rawOutput } : {}),
  };
};

const getSubmittedValueForPhase = (evaluation, phaseNumber, isConsensus) => {
  if (isConsensus) {
    const historyEntry = evaluation.history?.find(
      (entry) => Number(entry?.phase) === Number(phaseNumber) && hasValue(entry?.value)
    );

    if (historyEntry) {
      return historyEntry.value;
    }

    if (
      evaluation.timestamp &&
      Number(evaluation.consensusPhase ?? 1) === Number(phaseNumber) &&
      hasValue(evaluation.value)
    ) {
      return evaluation.value;
    }

    return undefined;
  }

  if (Number(phaseNumber) !== 1) return undefined;
  if (!evaluation.timestamp) return undefined;

  return hasValue(evaluation.value) ? evaluation.value : undefined;
};

const serializeDomainSnapshot = (domainSnapshot) => {
  if (!domainSnapshot || typeof domainSnapshot !== "object") {
    return null;
  }

  return {
    id: toIdString(domainSnapshot._id),
    name: domainSnapshot.name || null,
    type: domainSnapshot.type || null,
    numericRange: domainSnapshot.numericRange || null,
    linguisticLabels: Array.isArray(domainSnapshot.linguisticLabels)
      ? domainSnapshot.linguisticLabels
      : [],
  };
};

const buildDirectEvaluationsContext = ({
  evaluations,
  phaseUsed,
  issue,
  alternatives,
  criteria,
  warnings,
}) => {
  const rawByExpert = {};
  const canonicalByExpert = {};
  const localizedByExpert = {};
  const expressionDomainsByCell = {};

  const alternativeNameById = new Map(
    alternatives.map((alternative) => [toIdString(alternative._id), alternative.name])
  );
  const criterionNameById = new Map(
    criteria.map((criterion) => [toIdString(criterion._id), criterion.name])
  );

  let canonicalUnavailable = false;
  let missingDomains = false;

  for (const evaluation of evaluations) {
    const expertEmail = normalizeNonEmptyString(evaluation?.expert?.email);
    if (!expertEmail) continue;

    const alternativeName = alternativeNameById.get(toIdString(evaluation?.alternative));
    const criterionName = criterionNameById.get(toIdString(evaluation?.criterion));
    if (!alternativeName || !criterionName) continue;

    const value = getSubmittedValueForPhase(
      evaluation,
      phaseUsed,
      Boolean(issue?.isConsensus)
    );

    if (value === undefined) continue;

    rawByExpert[expertEmail] = rawByExpert[expertEmail] || {};
    rawByExpert[expertEmail][alternativeName] =
      rawByExpert[expertEmail][alternativeName] || {};

    const domainSnapshot = serializeDomainSnapshot(evaluation.expressionDomain);
    rawByExpert[expertEmail][alternativeName][criterionName] = {
      value,
      expressionDomain: domainSnapshot,
    };

    expressionDomainsByCell[expertEmail] = expressionDomainsByCell[expertEmail] || {};
    expressionDomainsByCell[expertEmail][alternativeName] =
      expressionDomainsByCell[expertEmail][alternativeName] || {};
    expressionDomainsByCell[expertEmail][alternativeName][criterionName] = domainSnapshot;

    localizedByExpert[expertEmail] = localizedByExpert[expertEmail] || {};
    localizedByExpert[expertEmail][alternativeName] =
      localizedByExpert[expertEmail][alternativeName] || {};
    localizedByExpert[expertEmail][alternativeName][criterionName] = {
      value,
    };

    canonicalByExpert[expertEmail] = canonicalByExpert[expertEmail] || {};
    canonicalByExpert[expertEmail][alternativeName] =
      canonicalByExpert[expertEmail][alternativeName] || {};

    if (!domainSnapshot) {
      missingDomains = true;
      canonicalUnavailable = true;
      continue;
    }

    try {
      const canonicalValue = normalizeEvaluationValueForInputOrThrow({
        value,
        domainSnapshot: evaluation.expressionDomain,
        inputKind: issue?.inputKind,
        context: {
          issueId: toIdString(issue?._id),
          expertId: toIdString(evaluation?.expert?._id),
          alternativeId: toIdString(evaluation?.alternative),
          criterionId: toIdString(evaluation?.criterion),
        },
      });

      canonicalByExpert[expertEmail][alternativeName][criterionName] = {
        value: canonicalValue,
      };
    } catch (_error) {
      canonicalUnavailable = true;
    }
  }

  if (missingDomains) {
    warnings.push({
      code: "MISSING_EXPRESSION_DOMAINS",
      message:
        "Some evaluation cells are missing expression-domain snapshots; canonical values may be partial.",
    });
  }

  if (canonicalUnavailable) {
    warnings.push({
      code: "CANONICAL_EXPERT_VALUES_UNAVAILABLE",
      message:
        "Canonical expert values could not be fully reconstructed for all direct-evaluation cells.",
    });
  }

  return {
    rawByExpert,
    canonicalByExpert,
    localizedByExpert,
    expressionDomainsByCell,
  };
};

const buildPairwiseEvaluationsContext = ({
  evaluations,
  phaseUsed,
  issue,
  alternatives,
  criteria,
  warnings,
}) => {
  const rawByExpert = {};
  const canonicalByExpert = {};
  const localizedByExpert = {};
  const expressionDomainsByCell = {};

  const alternativeNameById = new Map(
    alternatives.map((alternative) => [toIdString(alternative._id), alternative.name])
  );
  const criterionNameById = new Map(
    criteria.map((criterion) => [toIdString(criterion._id), criterion.name])
  );

  let missingDomains = false;
  let canonicalUnavailable = false;

  for (const evaluation of evaluations) {
    const expertEmail = normalizeNonEmptyString(evaluation?.expert?.email);
    if (!expertEmail) continue;

    const criterionName = criterionNameById.get(toIdString(evaluation?.criterion));
    const alternativeName = alternativeNameById.get(toIdString(evaluation?.alternative));
    const comparedAlternativeName = alternativeNameById.get(
      toIdString(evaluation?.comparedAlternative)
    );

    if (!criterionName || !alternativeName || !comparedAlternativeName) continue;

    const value = getSubmittedValueForPhase(
      evaluation,
      phaseUsed,
      Boolean(issue?.isConsensus)
    );

    if (value === undefined) continue;

    const cellKey = `${alternativeName}::${comparedAlternativeName}`;
    const domainSnapshot = serializeDomainSnapshot(evaluation.expressionDomain);

    rawByExpert[expertEmail] = rawByExpert[expertEmail] || {};
    rawByExpert[expertEmail][criterionName] = rawByExpert[expertEmail][criterionName] || {};
    rawByExpert[expertEmail][criterionName][cellKey] = {
      value,
      alternative: alternativeName,
      comparedAlternative: comparedAlternativeName,
      expressionDomain: domainSnapshot,
    };

    localizedByExpert[expertEmail] = localizedByExpert[expertEmail] || {};
    localizedByExpert[expertEmail][criterionName] =
      localizedByExpert[expertEmail][criterionName] || {};
    localizedByExpert[expertEmail][criterionName][cellKey] = {
      value,
    };

    expressionDomainsByCell[expertEmail] = expressionDomainsByCell[expertEmail] || {};
    expressionDomainsByCell[expertEmail][criterionName] =
      expressionDomainsByCell[expertEmail][criterionName] || {};
    expressionDomainsByCell[expertEmail][criterionName][cellKey] = domainSnapshot;

    canonicalByExpert[expertEmail] = canonicalByExpert[expertEmail] || {};
    canonicalByExpert[expertEmail][criterionName] =
      canonicalByExpert[expertEmail][criterionName] || {};

    if (!domainSnapshot) {
      missingDomains = true;
      canonicalUnavailable = true;
      continue;
    }

    try {
      const canonicalValue = normalizeEvaluationValueForInputOrThrow({
        value,
        domainSnapshot: evaluation.expressionDomain,
        inputKind: issue?.inputKind,
        context: {
          issueId: toIdString(issue?._id),
          expertId: toIdString(evaluation?.expert?._id),
          alternativeId: toIdString(evaluation?.alternative),
          criterionId: toIdString(evaluation?.criterion),
          comparedAlternativeId: toIdString(evaluation?.comparedAlternative),
        },
      });

      canonicalByExpert[expertEmail][criterionName][cellKey] = {
        value: canonicalValue,
        alternative: alternativeName,
        comparedAlternative: comparedAlternativeName,
      };
    } catch (_error) {
      canonicalUnavailable = true;
    }
  }

  if (missingDomains) {
    warnings.push({
      code: "MISSING_EXPRESSION_DOMAINS",
      message:
        "Some pairwise evaluation cells are missing expression-domain snapshots; canonical values may be partial.",
    });
  }

  if (canonicalUnavailable) {
    warnings.push({
      code: "CANONICAL_EXPERT_VALUES_UNAVAILABLE",
      message:
        "Canonical expert values could not be fully reconstructed for pairwise evaluations.",
    });
  }

  warnings.push({
    code: "PAIRWISE_DETAILED_ANALYSIS_LIMITED",
    message:
      "Pairwise context is included in v1, but detailed pairwise diagnostics may be limited without dedicated matrices analysis.",
  });

  return {
    rawByExpert,
    canonicalByExpert,
    localizedByExpert,
    expressionDomainsByCell,
  };
};

const buildScenariosContext = (scenarioDocs, warnings) => {
  if (!Array.isArray(scenarioDocs) || scenarioDocs.length === 0) {
    warnings.push({
      code: "NO_SCENARIOS_AVAILABLE",
      message: "No scenario runs were found for this issue.",
    });
    return [];
  }

  return scenarioDocs.map((scenario) => ({
    id: toIdString(scenario._id),
    name: scenario.name || "",
    status: scenario.status || null,
    targetModel: {
      id: toIdString(scenario.targetModel),
      name: scenario.targetModelName || null,
      apiModelKey: scenario.targetApiModelKey || null,
      modelFamilyKey: scenario.targetModelFamilyKey || null,
      modelVersion: scenario.targetModelVersion || null,
      versionLabel: scenario.targetVersionLabel || null,
      inputKind: scenario.targetInputKind || null,
      outputKind: scenario.targetOutputKind || null,
      evaluationStructure: scenario.targetEvaluationStructure || null,
      lifecycleKind: scenario.targetLifecycleKind || null,
      apiEndpoint: scenario.targetApiEndpoint || null,
    },
    config: scenario.config || {},
    inputs: scenario.inputs || {},
    outputs: scenario.outputs || {},
    createdAt: toIsoOrNull(scenario.createdAt),
  }));
};

const buildExpertsContext = (participations) =>
  (participations || []).map((participation) => ({
    id: toIdString(participation?.expert?._id),
    email: participation?.expert?.email || null,
    name: participation?.expert?.name || null,
  }));

const ensureIssueCanBeAnalyzedOrThrow = ({ issue }) => {
  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (issue.active) {
    throw createBadRequestError(
      "Results analysis is only available for resolved issues.",
      {
        field: "issueId",
      }
    );
  }
};

const assertFinishedIssueVisibilityOrThrow = ({ issueId, userId, visibleIssueIds }) => {
  const issueIdString = toIdString(issueId);

  const visibleSet = new Set((visibleIssueIds || []).map((id) => toIdString(id)));
  if (!visibleSet.has(issueIdString)) {
    throw createForbiddenError("Not authorized to access this finished issue", {
      field: "issueId",
      details: {
        issueId: issueIdString,
        userId,
      },
    });
  }
};

/**
 * Carga y valida acceso a un issue para análisis de resultados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario solicitante.
 * @param {string[]} params.visibleFinishedIssueIds Ids finalizados visibles para el usuario.
 * @returns {Promise<Object>} Issue autorizado y resuelto.
 */
export const getAuthorizedResolvedIssueForAnalysisOrThrow = async ({
  issueId,
  userId,
  visibleFinishedIssueIds,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  assertFinishedIssueVisibilityOrThrow({
    issueId,
    userId,
    visibleIssueIds: visibleFinishedIssueIds,
  });

  const issue = await Issue.findById(issueId).select("-__v").lean();
  ensureIssueCanBeAnalyzedOrThrow({ issue });

  return issue;
};

export const getAuthorizedScenarioForAnalysisOrThrow = async ({
  issueId,
  scenarioId,
  userId,
  visibleFinishedIssueIds,
}) => {
  const issue = await getAuthorizedResolvedIssueForAnalysisOrThrow({
    issueId,
    userId,
    visibleFinishedIssueIds,
  });

  if (!scenarioId || !isValidObjectIdLike(scenarioId)) {
    throw createBadRequestError("Valid scenario id is required", {
      field: "scenarioId",
    });
  }

  const scenario = await IssueScenario.findById(scenarioId)
    .select(
      "_id issue name status targetModel targetModelName targetApiModelKey targetApiEndpoint targetInputKind targetOutputKind targetEvaluationStructure targetLifecycleKind targetModelFamilyKey targetModelVersion targetVersionLabel config inputs outputs"
    )
    .lean();

  if (!scenario) {
    throw createNotFoundError("Scenario not found", {
      field: "scenarioId",
    });
  }

  if (toIdString(scenario.issue) !== toIdString(issue._id)) {
    throw createBadRequestError("Scenario does not belong to the requested issue.", {
      field: "scenarioId",
      details: {
        scenarioId: toIdString(scenario._id),
        issueId: toIdString(issue._id),
      },
    });
  }

  return { issue, scenario };
};

/**
 * Construye el AnalysisContext para un issue finalizado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario solicitante.
 * @param {string[]} params.visibleFinishedIssueIds Ids finalizados visibles para el usuario.
 * @returns {Promise<Object>}
 */
export const buildIssueResultsAnalysisContext = async ({
  issueId,
  userId,
  visibleFinishedIssueIds,
}) => {
  const issue = await getAuthorizedResolvedIssueForAnalysisOrThrow({
    issueId,
    userId,
    visibleFinishedIssueIds,
  });

  await ensureIssueOrdersDb({ issueId: issue._id });

  const [
    alternatives,
    leafCriteria,
    allCriteria,
    participations,
    evaluationDocs,
    latestConsensusDoc,
    consensusHistoryDocs,
    scenarioDocs,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name description",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type isLeaf parentCriterion",
      lean: true,
    }),
    Criterion.find({ issue: issue._id })
      .select("_id name type isLeaf parentCriterion")
      .lean(),
    Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    })
      .populate("expert", "email name")
      .lean(),
    Evaluation.find({ issue: issue._id })
      .select(
        "expert alternative comparedAlternative criterion value history consensusPhase timestamp expressionDomain"
      )
      .populate("expert", "email name")
      .populate("expressionDomain", "name type numericRange linguisticLabels")
      .lean(),
    Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }).lean(),
    Consensus.find({ issue: issue._id }).sort({ phase: 1 }).lean(),
    IssueScenario.find({ issue: issue._id })
      .sort({ createdAt: -1 })
      .select("_id name status createdAt targetModel targetModelName targetApiModelKey targetApiEndpoint targetInputKind targetOutputKind targetEvaluationStructure targetLifecycleKind targetModelFamilyKey targetModelVersion targetVersionLabel config inputs outputs")
      .lean(),
  ]);

  const warnings = [];

  const orderedCriteriaForTree = orderDocsByIdList(allCriteria || [], issue.leafCriteriaOrder, {
    getId: (criterion) => toIdString(criterion._id),
    getName: (criterion) => criterion?.name,
  });

  const { criteriaTree } = buildIssueCriteriaTree(orderedCriteriaForTree, issue);

  const resolvedConsensusHistory = buildConsensusHistoryFromDocs(
    consensusHistoryDocs
  );
  const latestRound = selectLatestRoundFromHistory(resolvedConsensusHistory);
  const phaseFromRound = Number(latestRound?.phase);
  const phaseFromConsensus = Number(latestConsensusDoc?.phase);
  const phaseUsed = Number.isInteger(phaseFromRound) && phaseFromRound > 0
    ? phaseFromRound
    : Number.isInteger(phaseFromConsensus) && phaseFromConsensus > 0
      ? phaseFromConsensus
      : 1;

  const result = buildFinalResultFromRound({
    latestRound,
    latestConsensusDoc,
    warnings,
  });

  if (!Array.isArray(result.ranking) || result.ranking.length === 0) {
    warnings.push({
      code: "MISSING_RANKING_DATA",
      message: "Final ranking data is missing in stored consensus results.",
    });
  }

  if (!result.scoresByAlternative || Object.keys(result.scoresByAlternative).length === 0) {
    warnings.push({
      code: "MISSING_SCORE_DATA",
      message: "Score data is missing in stored consensus results.",
    });
  }

  let evaluationsContext = {
    rawByExpert: {},
    canonicalByExpert: {},
    localizedByExpert: {},
    expressionDomainsByCell: {},
  };

  if (issue.evaluationStructure === "direct") {
    evaluationsContext = buildDirectEvaluationsContext({
      evaluations: evaluationDocs,
      phaseUsed,
      issue,
      alternatives,
      criteria: leafCriteria,
      warnings,
    });
  } else if (issue.evaluationStructure === "pairwiseAlternatives") {
    evaluationsContext = buildPairwiseEvaluationsContext({
      evaluations: evaluationDocs,
      phaseUsed,
      issue,
      alternatives,
      criteria: leafCriteria,
      warnings,
    });
  } else {
    warnings.push({
      code: "UNSUPPORTED_EVALUATION_STRUCTURE_FOR_DETAILED_ANALYSIS",
      message: `Evaluation structure '${issue.evaluationStructure || "unknown"}' is not supported for detailed context generation.`,
    });
  }

  const analysisContext = {
    contextVersion: CONTEXT_VERSION,
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      description: issue.description,
      createdAt: toIsoOrNull(issue.createdAt),
      closedAt: toIsoOrNull(issue.closureDate || issue.updatedAt),
      isConsensus: Boolean(issue.isConsensus),
      consensusPhase: Number(issue.consensusPhase || 1),
      consensusThreshold: issue.consensusThreshold ?? null,
      consensusMaxPhases: issue.consensusMaxPhases ?? null,
    },
    model: {
      issueModelId: toIdString(issue.model),
      apiModelKey: issue.apiModelKey || null,
      apiEndpoint: issue.apiEndpoint || null,
      evaluationStructure: issue.evaluationStructure || null,
      inputKind: issue.inputKind || null,
      outputKind: issue.outputKind || null,
      lifecycleKind: issue.lifecycleKind || null,
      modelFamilyKey: issue.modelFamilyKey || null,
      modelVersion: issue.modelVersion || null,
      versionLabel: issue.versionLabel || null,
      modelParameters: issue.modelParameters || {},
    },
    problem: {
      alternatives: alternatives.map((alternative) => ({
        id: toIdString(alternative._id),
        name: alternative.name,
        description: alternative.description || null,
      })),
      criteriaTree: criteriaTree.map(mapCriteriaTreeToContextShape),
      leafCriteria: leafCriteria.map((criterion, index) => ({
        id: toIdString(criterion._id),
        name: criterion.name,
        type: criterion.type,
        weight: Array.isArray(issue?.modelParameters?.weights)
          ? toNumberOrNull(issue.modelParameters.weights[index])
          : null,
      })),
      weights: Array.isArray(issue?.modelParameters?.weights)
        ? issue.modelParameters.weights
        : [],
    },
    experts: buildExpertsContext(participations),
    evaluations: {
      phaseUsed,
      rawByExpert: evaluationsContext.rawByExpert,
      canonicalByExpert: evaluationsContext.canonicalByExpert,
      localizedByExpert: evaluationsContext.localizedByExpert,
      expressionDomainsByCell: evaluationsContext.expressionDomainsByCell,
    },
    result,
    consensus: {
      history: resolvedConsensusHistory,
      latest: latestRound || latestConsensusDoc || {},
      phaseSource: "issue.consensusPhase",
      threshold: issue.consensusThreshold ?? null,
      maxPhases: issue.consensusMaxPhases ?? null,
      finalLevel:
        latestRound?.consensusLevel ?? latestConsensusDoc?.level ?? null,
      docs: consensusHistoryDocs || [],
    },
    scenarios: buildScenariosContext(scenarioDocs, warnings),
    warnings,
  };

  return analysisContext;
};

export const buildScenarioResultsAnalysisContext = async ({
  issueId,
  scenarioId,
  userId,
  visibleFinishedIssueIds,
}) => {
  const { issue, scenario } = await getAuthorizedScenarioForAnalysisOrThrow({
    issueId,
    scenarioId,
    userId,
    visibleFinishedIssueIds,
  });

  await ensureIssueOrdersDb({ issueId: issue._id });

  const [alternatives, leafCriteria, allCriteria, participations, evaluationDocs, latestConsensusDoc, consensusHistoryDocs, scenarioDocs] =
    await Promise.all([
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name description",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name type isLeaf parentCriterion",
        lean: true,
      }),
      Criterion.find({ issue: issue._id })
        .select("_id name type isLeaf parentCriterion")
        .lean(),
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      })
        .populate("expert", "email name")
        .lean(),
      Evaluation.find({ issue: issue._id })
        .select(
          "expert alternative comparedAlternative criterion value history consensusPhase timestamp expressionDomain"
        )
        .populate("expert", "email name")
        .populate("expressionDomain", "name type numericRange linguisticLabels")
        .lean(),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }).lean(),
      Consensus.find({ issue: issue._id }).sort({ phase: 1 }).lean(),
      IssueScenario.find({ issue: issue._id })
        .sort({ createdAt: -1 })
        .select("_id name status createdAt targetModel targetModelName targetApiModelKey targetApiEndpoint targetInputKind targetOutputKind targetEvaluationStructure targetLifecycleKind targetModelFamilyKey targetModelVersion targetVersionLabel config inputs outputs")
        .lean(),
    ]);

  const warnings = [];

  const orderedCriteriaForTree = orderDocsByIdList(allCriteria || [], issue.leafCriteriaOrder, {
    getId: (criterion) => toIdString(criterion._id),
    getName: (criterion) => criterion?.name,
  });

  const { criteriaTree } = buildIssueCriteriaTree(orderedCriteriaForTree, issue);

  const phaseUsed = Number.isInteger(Number(scenario?.inputs?.consensusPhaseUsed))
    ? Number(scenario.inputs.consensusPhaseUsed)
    : 1;

  const result = normalizeScenarioResultOrThrow({
    scenarioDoc: scenario,
    alternatives,
  });

  let evaluationsContext = {
    rawByExpert: {},
    canonicalByExpert: {},
    localizedByExpert: {},
    expressionDomainsByCell: {},
  };

  if (issue.evaluationStructure === "direct") {
    evaluationsContext = buildDirectEvaluationsContext({
      evaluations: evaluationDocs,
      phaseUsed,
      issue: {
        ...issue,
        inputKind: scenario?.targetInputKind || issue?.inputKind,
      },
      alternatives,
      criteria: leafCriteria,
      warnings,
    });
  } else if (issue.evaluationStructure === "pairwiseAlternatives") {
    evaluationsContext = buildPairwiseEvaluationsContext({
      evaluations: evaluationDocs,
      phaseUsed,
      issue: {
        ...issue,
        inputKind: scenario?.targetInputKind || issue?.inputKind,
      },
      alternatives,
      criteria: leafCriteria,
      warnings,
    });
  } else {
    warnings.push({
      code: "UNSUPPORTED_EVALUATION_STRUCTURE_FOR_DETAILED_ANALYSIS",
      message: `Evaluation structure '${issue.evaluationStructure || "unknown"}' is not supported for detailed context generation.`,
    });
  }

  const scenarioParams =
    scenario?.config?.normalizedModelParameters ||
    scenario?.config?.modelParameters ||
    scenario?.normalizedModelParameters ||
    scenario?.modelParameters ||
    scenario?.paramOverrides ||
    {};

  const analysisContext = {
    contextVersion: CONTEXT_VERSION,
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      description: issue.description,
      createdAt: toIsoOrNull(issue.createdAt),
      closedAt: toIsoOrNull(issue.closureDate || issue.updatedAt),
      isConsensus: Boolean(issue.isConsensus),
      consensusPhase: Number(issue.consensusPhase || 1),
      consensusThreshold: issue.consensusThreshold ?? null,
      consensusMaxPhases: issue.consensusMaxPhases ?? null,
      scenarioId: toIdString(scenario._id),
      scenarioName: scenario?.name || null,
    },
    model: {
      issueModelId: toIdString(scenario?.targetModel),
      apiModelKey: scenario?.targetApiModelKey || null,
      apiEndpoint: scenario?.targetApiEndpoint || null,
      evaluationStructure: scenario?.targetEvaluationStructure || issue.evaluationStructure || null,
      inputKind: scenario?.targetInputKind || null,
      outputKind: scenario?.targetOutputKind || null,
      lifecycleKind: scenario?.targetLifecycleKind || null,
      modelFamilyKey: scenario?.targetModelFamilyKey || null,
      modelVersion: scenario?.targetModelVersion || null,
      versionLabel: scenario?.targetVersionLabel || null,
      modelParameters: scenarioParams,
      displayName: scenario?.targetModelName || null,
    },
    problem: {
      alternatives: alternatives.map((alternative) => ({
        id: toIdString(alternative._id),
        name: alternative.name,
        description: alternative.description || null,
      })),
      criteriaTree: criteriaTree.map(mapCriteriaTreeToContextShape),
      leafCriteria: leafCriteria.map((criterion, index) => ({
        id: toIdString(criterion._id),
        name: criterion.name,
        type: criterion.type,
        weight: Array.isArray(scenarioParams?.weights)
          ? toNumberOrNull(scenarioParams.weights[index])
          : null,
      })),
      weights: Array.isArray(scenarioParams?.weights) ? scenarioParams.weights : [],
    },
    experts: buildExpertsContext(participations),
    evaluations: {
      phaseUsed,
      rawByExpert: evaluationsContext.rawByExpert,
      canonicalByExpert: evaluationsContext.canonicalByExpert,
      localizedByExpert: evaluationsContext.localizedByExpert,
      expressionDomainsByCell: evaluationsContext.expressionDomainsByCell,
    },
    result,
    consensus: {
      history: buildConsensusHistoryFromDocs(consensusHistoryDocs),
      latest: latestConsensusDoc || {},
      phaseSource: "scenario.inputs.consensusPhaseUsed",
      threshold: issue.consensusThreshold ?? null,
      maxPhases: issue.consensusMaxPhases ?? null,
      finalLevel: latestConsensusDoc?.level ?? null,
      docs: consensusHistoryDocs || [],
    },
    scenarios: buildScenariosContext(scenarioDocs, warnings),
    warnings,
  };

  return analysisContext;
};
