import { Issue } from "../../models/Issues.js";
import { Alternative } from "../../models/Alternatives.js";
import { Criterion } from "../../models/Criteria.js";
import { Participation } from "../../models/Participations.js";
import { Evaluation } from "../../models/Evaluations.js";
import { Consensus } from "../../models/Consensus.js";
import { buildIssueCriteriaTree } from "../../modules/issues/issue.active.js";

const getPhaseParticipantsSet = (phaseDoc) => {
  const matrices = phaseDoc?.details?.matrices;

  if (matrices && typeof matrices === "object") {
    return new Set(Object.keys(matrices));
  }

  return null;
};

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const getSubmittedValueForPhase = (evaluation, phaseNumber, isConsensus) => {
  if (isConsensus) {
    const historyEntry = evaluation.history?.find(
      (entry) => entry.phase === phaseNumber && hasValue(entry.value)
    );

    if (historyEntry) {
      return historyEntry.value;
    }

    if (
      evaluation.timestamp &&
      (evaluation.consensusPhase ?? 1) === phaseNumber &&
      hasValue(evaluation.value)
    ) {
      return evaluation.value;
    }

    return undefined;
  }

  if (phaseNumber !== 1) return undefined;
  if (!evaluation.timestamp) return undefined;

  return hasValue(evaluation.value) ? evaluation.value : undefined;
};

const buildWeightMap = (leafCriteria, weights) => {
  const weightMap = {};

  leafCriteria.forEach((criterion, index) => {
    weightMap[criterion.name] = weights[index] ?? null;
  });

  return weightMap;
};

const mapCriteriaTreeToSummaryShape = (node) => ({
  _id: node.id,
  name: node.name,
  type: node.type,
  isLeaf: Boolean(node.isLeaf),
  parentCriterion: node.parentId || null,
  children: (node.children || []).map(mapCriteriaTreeToSummaryShape),
});

const attachWeightsToTree = (node, weightMap) => {
  if (node.isLeaf) {
    return {
      ...node,
      weight: weightMap[node.name] ?? null,
    };
  }

  return {
    ...node,
    children: node.children?.map((child) => attachWeightsToTree(child, weightMap)) ?? [],
  };
};

const groupEvaluationsByExpert = (evaluations) => {
  const evaluationsByExpert = new Map();

  for (const evaluation of evaluations) {
    const expertId = evaluation.expert?._id?.toString();
    if (!expertId) continue;

    if (!evaluationsByExpert.has(expertId)) {
      evaluationsByExpert.set(expertId, []);
    }

    evaluationsByExpert.get(expertId).push(evaluation);
  }

  return evaluationsByExpert;
};

/**
 * Crea la sección resumen de un issue finalizado.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<Object>}
 */
export const createSummarySection = async (issueId) => {
  const issue = await Issue.findById(issueId).populate("admin").populate("model");

  const [alternatives, criteria, participations, consensusPhases] =
    await Promise.all([
      Alternative.find({ issue: issueId }),
      Criterion.find({ issue: issueId }),
      Participation.find({ issue: issueId }).populate("expert"),
      Consensus.find({ issue: issueId }).sort({ phase: 1 }),
    ]);

  const participated = participations
    .filter(
      (participation) =>
        participation.invitationStatus === "accepted" &&
        participation.evaluationCompleted
    )
    .map((participation) => participation.expert.email)
    .sort();

  const notAccepted = participations
    .filter((participation) => participation.invitationStatus === "declined")
    .map((participation) => participation.expert.email)
    .sort();

  const lastConsensus = consensusPhases[consensusPhases.length - 1];

  const { criteriaTree, orderedLeafNodes } = buildIssueCriteriaTree(
    criteria,
    issue
  );

  const weights = issue.modelParameters?.weights || [];

  const weightMap = orderedLeafNodes.reduce((acc, node, index) => {
    acc[node.name] = weights[index] ?? null;
    return acc;
  }, {});

  return {
    name: issue.name,
    admin: issue.admin.email,
    description: issue.description,
    model: issue.model.name,
    criteria: criteriaTree
      .map(mapCriteriaTreeToSummaryShape)
      .map((node) => attachWeightsToTree(node, weightMap)),
    alternatives: alternatives.map((alternative) => alternative.name).sort(),
    creationDate: issue.creationDate ?? null,
    closureDate: issue.closureDate ?? null,
    isPairwise: issue.model.isPairwise,
    consensusInfo: issue.isConsensus
      ? {
          maximumPhases: issue.consensusMaxPhases,
          threshold: issue.consensusThreshold,
          consensusReached: lastConsensus?.level ?? null,
          consensusReachedPhase: lastConsensus?.phase ?? 1,
        }
      : null,
    experts: {
      participated,
      notAccepted,
    },
  };
};

/**
 * Crea la sección de rankings de alternativas por fase.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<Array<Object>>}
 */
export const createAlternativesRankingsSection = async (issueId) => {
  const consensusData = await Consensus.find({ issue: issueId }).sort({ phase: 1 });

  const rankingsByPhase = consensusData.reduce((accumulator, consensus) => {
    const { phase, details } = consensus;

    if (!accumulator[phase]) {
      accumulator[phase] = {
        phase,
        ranking: details.rankedAlternatives,
      };
    }

    return accumulator;
  }, {});

  return Object.values(rankingsByPhase);
};

/**
 * Crea la sección de evaluaciones pairwise por experto y fase.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<Object>}
 */
export const createExpertsPairwiseRatingsSection = async (issueId) => {
  const consensusData = {};

  const issue = await Issue.findById(issueId).lean();
  const isConsensus = Boolean(issue?.isConsensus);

  const [consensusPhasesRaw, allEvaluations, criteria, alternatives] = await Promise.all([
    Consensus.find({ issue: issueId }).sort({ phase: 1 }).lean(),
    Evaluation.find({ issue: issueId }).populate("expert"),
    Criterion.find({ issue: issueId }).lean(),
    Alternative.find({ issue: issueId }).lean(),
  ]);

  const consensusPhases = consensusPhasesRaw.length
    ? consensusPhasesRaw
    : [{ phase: 1, collectiveEvaluations: {}, details: {} }];

  const criterionMap = new Map(criteria.map((criterion) => [criterion._id.toString(), criterion.name]));
  const alternativeMap = new Map(
    alternatives.map((alternative) => [alternative._id.toString(), alternative.name])
  );

  const evaluationsByExpert = groupEvaluationsByExpert(allEvaluations);

  for (const phaseDoc of consensusPhases) {
    const participants = getPhaseParticipantsSet(phaseDoc);
    const hasFilter = participants && participants.size > 0;
    const phaseNumber = phaseDoc.phase;
    const expertEvaluations = {};

    for (const [, evaluations] of evaluationsByExpert.entries()) {
      const expertEmail = evaluations?.[0]?.expert?.email;
      if (!expertEmail) continue;
      if (hasFilter && !participants.has(expertEmail)) continue;

      const evaluationsInPhase = evaluations.filter(
        (evaluation) => getSubmittedValueForPhase(evaluation, phaseNumber, isConsensus) !== undefined
      );

      if (evaluationsInPhase.length === 0) continue;

      expertEvaluations[expertEmail] = {};

      for (const evaluation of evaluationsInPhase) {
        const criterionName = criterionMap.get(evaluation.criterion.toString());
        const alternativeName = alternativeMap.get(evaluation.alternative.toString());
        const comparedAlternativeName = evaluation.comparedAlternative
          ? alternativeMap.get(evaluation.comparedAlternative.toString())
          : null;

        const value = getSubmittedValueForPhase(evaluation, phaseNumber, isConsensus);

        if (value === undefined || value === null || value === "") continue;
        if (!criterionName || !alternativeName || !comparedAlternativeName) continue;

        if (!expertEvaluations[expertEmail][criterionName]) {
          expertEvaluations[expertEmail][criterionName] = [];
        }

        let alternativeEvaluation = expertEvaluations[expertEmail][criterionName].find(
          (entry) => entry.id === alternativeName
        );

        if (!alternativeEvaluation) {
          alternativeEvaluation = { id: alternativeName };
          expertEvaluations[expertEmail][criterionName].push(alternativeEvaluation);
        }

        alternativeEvaluation[comparedAlternativeName] = value;

        if (alternativeEvaluation[alternativeName] === undefined) {
          alternativeEvaluation[alternativeName] = 0.5;
        }
      }
    }

    const collectiveEvaluations = phaseDoc?.collectiveEvaluations;

    consensusData[phaseNumber] = {
      collectiveEvaluations:
        collectiveEvaluations && Object.keys(collectiveEvaluations).length
          ? collectiveEvaluations
          : null,
      expertEvaluations,
    };
  }

  return consensusData;
};

/**
 * Crea la sección de evaluaciones estándar por experto y fase.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<Object>}
 */
export const createExpertsRatingsSection = async (issueId) => {
  const consensusData = {};

  const issue = await Issue.findById(issueId).lean();
  const isConsensus = Boolean(issue?.isConsensus);

  const [consensusPhasesRaw, allEvaluations, criteria, alternatives] = await Promise.all([
    Consensus.find({ issue: issueId }).sort({ phase: 1 }).lean(),
    Evaluation.find({ issue: issueId }).populate("expert"),
    Criterion.find({ issue: issueId }).lean(),
    Alternative.find({ issue: issueId }).lean(),
  ]);

  const consensusPhases = consensusPhasesRaw.length
    ? consensusPhasesRaw
    : [{ phase: 1, collectiveEvaluations: {}, details: {} }];

  const evaluationsByExpert = groupEvaluationsByExpert(allEvaluations);

  for (const phaseDoc of consensusPhases) {
    const participants = getPhaseParticipantsSet(phaseDoc);
    const hasFilter = participants && participants.size > 0;
    const phaseNumber = phaseDoc.phase;
    const expertEvaluations = {};

    for (const [, evaluations] of evaluationsByExpert.entries()) {
      const expertEmail = evaluations?.[0]?.expert?.email;
      if (!expertEmail) continue;
      if (hasFilter && !participants.has(expertEmail)) continue;

      const evaluationsInPhase = evaluations.filter(
        (evaluation) => getSubmittedValueForPhase(evaluation, phaseNumber, isConsensus) !== undefined
      );

      if (evaluationsInPhase.length === 0) continue;

      const rows = {};
      let hasAnyValue = false;

      for (const alternative of alternatives) {
        const criteriaValues = {};

        for (const criterion of criteria) {
          const evaluation = evaluationsInPhase.find(
            (item) =>
              item.criterion?.toString() === criterion._id.toString() &&
              item.alternative?.toString() === alternative._id.toString()
          );

          if (!evaluation) continue;

          const value = getSubmittedValueForPhase(evaluation, phaseNumber, isConsensus);
          if (value === undefined) continue;

          criteriaValues[criterion.name] = value;
          hasAnyValue = true;
        }

        if (Object.keys(criteriaValues).length) {
          rows[alternative.name] = criteriaValues;
        }
      }

      if (!hasAnyValue) continue;

      expertEvaluations[expertEmail] = rows;
    }

    const collectiveEvaluations = phaseDoc?.collectiveEvaluations;

    consensusData[phaseNumber] = {
      collectiveEvaluations:
        collectiveEvaluations && Object.keys(collectiveEvaluations).length
          ? collectiveEvaluations
          : null,
      expertEvaluations,
    };
  }

  return consensusData;
};

/**
 * Crea la sección de gráficos analíticos de un issue finalizado.
 *
 * @param {string|Object} issueId Id del issue.
 * @param {boolean} isConsensus Indica si el issue usa consenso.
 * @returns {Promise<Object|null>}
 */
export const createAnalyticalGraphsSection = async (issueId, isConsensus) => {
  const consensusDocs = await Consensus.find({ issue: issueId }).sort({ phase: 1 }).lean();

  const scatterPlot = consensusDocs
    .filter((doc) => doc?.details?.plotsGraphic?.expert_points)
    .map((doc) => ({
      phase: doc.phase,
      expert_points: doc.details.plotsGraphic.expert_points,
      collective_point: doc.details.plotsGraphic.collective_point,
    }));

  const result = {};

  if (scatterPlot.length > 0) {
    result.scatterPlot = scatterPlot;
  }

  if (isConsensus && consensusDocs.length > 1) {
    result.consensusLevelLineChart = {
      labels: consensusDocs.map((doc) => `${doc.phase}`),
      data: consensusDocs.map((doc) => doc.level ?? 0),
    };
  }

  return Object.keys(result).length > 0 ? result : null;
};