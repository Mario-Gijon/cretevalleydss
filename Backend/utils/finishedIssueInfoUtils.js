// Importa el modelo de usuario desde el archivo correspondiente.
import { Issue } from '../models/Issues.js';
import { Alternative } from '../models/Alternatives.js';
import { Criterion } from '../models/Criteria.js';
import { Participation } from '../models/Participations.js';
import { Evaluation } from '../models/Evaluations.js';
import { Consensus } from '../models/Consensus.js';
import { buildCriterionTree } from './buildCriteriaTree.js';

const getPhaseParticipantsSet = (phaseDoc) => {
  const m = phaseDoc?.details?.matrices;
  if (m && typeof m === "object") {
    return new Set(Object.keys(m)); // emails
  }
  return null; // legacy / no data -> no filtramos
};

const hasValue = (v) => v !== undefined && v !== null && v !== "";

const getSubmittedValueForPhase = (ev, phaseNumber, isConsensus) => {
  if (isConsensus) {
    const h = ev.history?.find((x) => x.phase === phaseNumber && hasValue(x.value));
    if (h) return h.value;

    // ✅ compat (solo si lo marcas como enviado con timestamp)
    if (ev.timestamp && (ev.consensusPhase ?? 1) === phaseNumber && hasValue(ev.value)) {
      return ev.value;
    }
    return undefined;
  }

  // no-consenso: SOLO cuenta si se envió (timestamp != null)
  if (phaseNumber !== 1) return undefined;
  if (!ev.timestamp) return undefined;
  return hasValue(ev.value) ? ev.value : undefined;
};

export const createSummarySection = async (issueId) => {
  const issue = await Issue.findById(issueId)
    .populate("admin")
    .populate("model");

  const [alternatives, criteria, participations, consensusPhases] =
    await Promise.all([
      Alternative.find({ issue: issueId }),
      Criterion.find({ issue: issueId }),
      Participation.find({ issue: issueId }).populate("expert"),
      Consensus.find({ issue: issueId }).sort({ phase: 1 }), // Ordenar para encontrar la última
    ]);

  const participated = participations
    .filter(p => p.invitationStatus === "accepted" && p.evaluationCompleted)
    .map(p => p.expert.email).sort();

  const notAccepted = participations
    .filter(p => p.invitationStatus === "declined")
    .map(p => p.expert.email).sort();

  const lastConsensus = consensusPhases[consensusPhases.length - 1];

  // --- MAPEO DE PESOS DE CRITERIOS ---
  const leafCriteria = await Criterion.find({ issue: issueId, isLeaf: true }).sort({ name: 1 });
  const weights = issue.modelParameters?.weights || [];

  const weightMap = {};
  leafCriteria.forEach((c, idx) => {
    weightMap[c.name] = weights[idx] ?? null;
  });

  const attachWeights = (node) => {
    if (node.isLeaf) {
      return { ...node, weight: weightMap[node.name] ?? null };
    }
    return {
      ...node,
      children: node.children?.map(attachWeights) ?? []
    };
  };


  return {
    name: issue.name,
    admin: issue.admin.email,
    description: issue.description,
    model: issue.model.name,
    /* criteria: criteria.map(c => ({ name: c.name, type: c.type, isLeaf: c.isLeaf })).sort(), */
    criteria: buildCriterionTree(criteria, issue._id).map(attachWeights),
    alternatives: alternatives.map(a => a.name).sort(),
    creationDate: issue.creationDate ?? null,
    closureDate: issue.closureDate ?? null,
    isPairwise: issue.model.isPairwise,
    consensusInfo: issue.isConsensus ? {
      maximumPhases: issue.consensusMaxPhases,
      threshold: issue.consensusThreshold,
      consensusReached: lastConsensus?.level ?? null,
      consensusReachedPhase: lastConsensus?.phase ?? 1,
    } : null,
    experts: {
      participated,
      notAccepted,
    }
  };
};

export const createAlternativesRankingsSection = async (issueId) => {

  // Suponiendo que tienes un modelo de Consensus en Mongoose
  const consensusData = await Consensus.find({ issue: issueId }).sort({ phase: 1 });

  // Organizar los rankings por fase
  const rankingsArray = consensusData.reduce((acc, consensus) => {
    const { phase, details } = consensus;

    // Si la fase no existe en el acumulador, la creamos
    if (!acc[phase]) {
      acc[phase] = {
        phase: phase,
        ranking: details.rankedAlternatives
      };
    }
    return acc;
  }, {});

  // Convertimos el objeto a un array de fases y rankings
  return Object.values(rankingsArray);
};


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

  const criterionMap = new Map(criteria.map((c) => [c._id.toString(), c.name]));
  const alternativeMap = new Map(alternatives.map((a) => [a._id.toString(), a.name]));

  // Agrupar por experto
  const evaluationsByExpert = new Map();
  for (const ev of allEvaluations) {
    const expertId = ev.expert?._id?.toString();
    if (!expertId) continue;
    if (!evaluationsByExpert.has(expertId)) evaluationsByExpert.set(expertId, []);
    evaluationsByExpert.get(expertId).push(ev);
  }

  for (const phaseDoc of consensusPhases) {
    const participants = getPhaseParticipantsSet(phaseDoc);
    const hasFilter = participants && participants.size > 0;
    const phaseNumber = phaseDoc.phase;
    const expertEvaluations = {};

    for (const [, evals] of evaluationsByExpert.entries()) {
      const expertEmail = evals?.[0]?.expert?.email;
      if (!expertEmail) continue;

      if (hasFilter && !participants.has(expertEmail)) continue; // ✅ filtro por matrices

      const evalsInPhase = evals.filter((ev) =>
        getSubmittedValueForPhase(ev, phaseNumber, isConsensus) !== undefined
      );
      if (evalsInPhase.length === 0) continue;

      expertEvaluations[expertEmail] = {};

      for (const ev of evalsInPhase) {
        const criterionName = criterionMap.get(ev.criterion.toString());
        const altName = alternativeMap.get(ev.alternative.toString());
        const compAltName = ev.comparedAlternative ? alternativeMap.get(ev.comparedAlternative.toString()) : null;

        const val = getSubmittedValueForPhase(ev, phaseNumber, isConsensus);
        if (val === undefined || val === null || val === "") continue;
        if (!criterionName || !altName || !compAltName) continue;

        if (!expertEvaluations[expertEmail][criterionName]) {
          expertEvaluations[expertEmail][criterionName] = [];
        }

        let altEval = expertEvaluations[expertEmail][criterionName].find((entry) => entry.id === altName);
        if (!altEval) {
          altEval = { id: altName };
          expertEvaluations[expertEmail][criterionName].push(altEval);
        }

        altEval[compAltName] = val;

        // diagonal (si la quieres fija)
        if (altEval[altName] === undefined) altEval[altName] = 0.5;
      }
    }

    const ce = phaseDoc?.collectiveEvaluations;
    consensusData[phaseNumber] = {
      collectiveEvaluations: ce && Object.keys(ce).length ? ce : null,
      expertEvaluations,
    };
  }

  return consensusData;
};

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

  // Agrupar evaluaciones por experto
  const evaluationsByExpert = new Map();
  for (const ev of allEvaluations) {
    const expertId = ev.expert?._id?.toString();
    if (!expertId) continue;
    if (!evaluationsByExpert.has(expertId)) evaluationsByExpert.set(expertId, []);
    evaluationsByExpert.get(expertId).push(ev);
  }

  for (const phaseDoc of consensusPhases) {
    const participants = getPhaseParticipantsSet(phaseDoc);
    const hasFilter = participants && participants.size > 0;

    const phaseNumber = phaseDoc.phase;
    const expertEvaluations = {};

    for (const [, evals] of evaluationsByExpert.entries()) {
      const expertEmail = evals?.[0]?.expert?.email;
      if (!expertEmail) continue;

      if (hasFilter && !participants.has(expertEmail)) continue; // ✅ expulsado/no participante en esa fase

      const evalsInPhase = evals.filter((ev) =>
        getSubmittedValueForPhase(ev, phaseNumber, isConsensus) !== undefined
      );
      if (evalsInPhase.length === 0) continue;

      const rows = {};
      let anyValue = false;

      for (const alt of alternatives) {
        const col = {};

        for (const criterion of criteria) {
          const ev = evalsInPhase.find(
            (x) =>
              x.criterion?.toString() === criterion._id.toString() &&
              x.alternative?.toString() === alt._id.toString()
          );
          if (!ev) continue;

          const value = getSubmittedValueForPhase(ev, phaseNumber, isConsensus);
          if (value === undefined) continue;

          col[criterion.name] = value;
          anyValue = true;
        }

        if (Object.keys(col).length) rows[alt.name] = col;
      }

      if (!anyValue) continue;

      expertEvaluations[expertEmail] = rows;
    }

    const ce = phaseDoc?.collectiveEvaluations;
    consensusData[phaseNumber] = {
      collectiveEvaluations: ce && Object.keys(ce).length ? ce : null,
      expertEvaluations,
    };
  }

  return consensusData;
};



export const createAnalyticalGraphsSection = async (issueId, isConsensus) => {
  const consensusDocs = await Consensus.find({ issue: issueId })
    .sort({ phase: 1 })
    .lean();

  // scatterPlot: solo si hay plotsGraphic
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

  // consensus line: solo si es consenso y hay > 1 fase
  if (isConsensus && consensusDocs.length > 1) {
    result.consensusLevelLineChart = {
      labels: consensusDocs.map((doc) => `${doc.phase}`),
      data: consensusDocs.map((doc) => doc.level ?? 0),
    };
  }

  // Si no hay nada, devolver null
  return Object.keys(result).length > 0 ? result : null;
};






