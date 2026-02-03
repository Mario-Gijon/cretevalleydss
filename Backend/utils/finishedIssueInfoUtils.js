// Importa el modelo de usuario desde el archivo correspondiente.
import { Issue } from '../models/Issues.js';
import { Alternative } from '../models/Alternatives.js';
import { Criterion } from '../models/Criteria.js';
import { Participation } from '../models/Participations.js';
import { Evaluation } from '../models/Evaluations.js';
import { Consensus } from '../models/Consensus.js';
import { buildCriterionTree } from './buildCriteriaTree.js';

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

// Función que determina si un experto está activo en una fase dada
function isExpertActiveInPhase(expertId, phaseNumber, exitRecord, expertEvaluations) {
  // Obtener todas las fases de salida ordenadas ascendentemente
  const exitPhases = (exitRecord?.history ?? [])
    .map(h => h.phase)
    .filter(p => p != null)
    .sort((a, b) => a - b);

  // Obtener todas las fases de entrada según evaluaciones
  const entryPhasesSet = new Set();
  for (const ev of expertEvaluations) {
    for (const h of ev.history) {
      if (h.phase != null) {
        entryPhasesSet.add(h.phase);
      }
    }
  }
  const entryPhases = Array.from(entryPhasesSet).sort((a, b) => a - b);

  if (entryPhases.length === 0) {
    // Sin entradas, no activo
    return false;
  }

  // Para cada intervalo de entrada y salida, ver si la faseNumber está dentro
  // Si no hay salida después de una entrada, se considera activo desde esa entrada en adelante

  for (let i = 0; i < entryPhases.length; i++) {
    const start = entryPhases[i];
    // Buscar la siguiente salida que sea mayor o igual a start
    const nextExit = exitPhases.find(phase => phase >= start);

    // Si no hay salida posterior a esta entrada, intervalo abierto [start, +∞)
    if (nextExit === undefined) {
      if (phaseNumber >= start) return true;
    } else {
      // Intervalo cerrado [start, nextExit)
      if (phaseNumber >= start && phaseNumber < nextExit) return true;
    }
  }

  return false; // No está activo en esta fase
}

export const createExpertsPairwiseRatingsSection = async (issueId) => {
  const consensusData = {};

  const [consensusPhases, allEvaluations] = await Promise.all([
    Consensus.find({ issue: issueId }),
    Evaluation.find({ issue: issueId }).populate('expert')
  ]);

  // Obtener mapas para criterios y alternativas
  const criteria = await Criterion.find({ issue: issueId });
  const alternatives = await Alternative.find({ issue: issueId });

  const criterionMap = new Map(criteria.map(c => [c._id.toString(), c.name]));
  const alternativeMap = new Map(alternatives.map(a => [a._id.toString(), a.name]));

  // Agrupar evaluaciones por experto para optimizar
  const evaluationsByExpert = new Map();

  for (const evalDoc of allEvaluations) {
    const expertId = evalDoc.expert._id.toString();
    if (!evaluationsByExpert.has(expertId)) {
      evaluationsByExpert.set(expertId, []);
    }
    evaluationsByExpert.get(expertId).push(evalDoc);
  }

  for (const phase of consensusPhases) {
    const phaseNumber = phase.phase;
    const expertEvaluations = {};

    // Para cada experto que tiene evaluaciones
    for (const [expertId, evals] of evaluationsByExpert.entries()) {
      // Filtrar evaluaciones que tengan historia en la fase actual
      const evalsInPhase = evals.filter(ev =>
        ev.history.some(h => h.phase === phaseNumber)
      );

      if (evalsInPhase.length === 0) continue; // No participó en esta fase

      const expertEmail = evalsInPhase[0].expert.email; // Todos con mismo experto

      expertEvaluations[expertEmail] = {};

      for (const valu of evalsInPhase) {
        const relevantHistory = valu.history.find(entry => entry.phase === phaseNumber);
        if (!relevantHistory) continue;

        const criterionName = criterionMap.get(valu.criterion.toString());
        const altName = alternativeMap.get(valu.alternative.toString());
        const compAltName = valu.comparedAlternative ? alternativeMap.get(valu.comparedAlternative.toString()) : null;
        const val = relevantHistory.value;

        if (!expertEvaluations[expertEmail][criterionName]) {
          expertEvaluations[expertEmail][criterionName] = [];
        }

        let altEval = expertEvaluations[expertEmail][criterionName].find(entry => entry.id === altName);
        if (!altEval) {
          altEval = { id: altName };
          expertEvaluations[expertEmail][criterionName].push(altEval);
        }

        if (compAltName) {
          altEval[compAltName] = val;
        }

        // Comparación consigo mismo
        if (!altEval[altName]) {
          altEval[altName] = 0.5;
        }
      }
    }

    consensusData[phaseNumber] = {
      collectiveEvaluations: Object.keys(phase.collectiveEvaluations).length !== 0 ? phase.collectiveEvaluations : null,
      expertEvaluations
    };
  }

  return consensusData;
};

export const createExpertsRatingsSection = async (issueId) => {
  const consensusData = {};

  const [consensusPhases, allEvaluations] = await Promise.all([
    Consensus.find({ issue: issueId }),
    Evaluation.find({ issue: issueId }).populate("expert"),
  ]);

  // Mapas para nombres de criterios y alternativas
  const criteria = await Criterion.find({ issue: issueId });
  const alternatives = await Alternative.find({ issue: issueId });

  const criterionMap = new Map(criteria.map((c) => [c._id.toString(), c.name]));
  const alternativeMap = new Map(alternatives.map((a) => [a._id.toString(), a.name]));

  // Agrupar evaluaciones por experto
  const evaluationsByExpert = new Map();

  for (const evalDoc of allEvaluations) {
    const expertId = evalDoc.expert._id.toString();
    if (!evaluationsByExpert.has(expertId)) {
      evaluationsByExpert.set(expertId, []);
    }
    evaluationsByExpert.get(expertId).push(evalDoc);
  }

  for (const phase of consensusPhases) {
    const phaseNumber = phase.phase;
    const expertEvaluations = {};

    for (const [expertId, evals] of evaluationsByExpert.entries()) {
      // Filtrar evaluaciones que correspondan a esta fase
      const evalsInPhase = evals.filter((ev) => {
        if (!ev.history || ev.history.length === 0) return true; // No hay history -> tomar valor directo
        return ev.history.some((h) => h.phase === phaseNumber);
      });

      if (evalsInPhase.length === 0) continue;

      const expertEmail = evalsInPhase[0].expert.email;
      let rows = {};

      for (const alt of alternatives) {

        let col = {}

        for (const criterion of criteria) {
          const evaluation = evalsInPhase.find(
            (ev) =>
              ev.criterion.toString() === criterion._id.toString() &&
              ev.alternative.toString() === alt._id.toString()
          );

          if (evaluation) {
            let value;
            if (evaluation.history && evaluation.history.length > 0) {
              const relevantHistory = evaluation.history.find(
                (entry) => entry.phase === phaseNumber
              );
              value = relevantHistory?.value ?? evaluation.value;
            } else {
              value = evaluation.value; // No hay history
            }

            /* if (value !== undefined) row[criterion.name] = value; */
            if (value !== undefined) col[criterion.name] = value;
          }
        }

        rows[alt.name] = col
      }

      expertEvaluations[expertEmail] = rows;
    }

    consensusData[phaseNumber] = {
      collectiveEvaluations: Object.keys(phase.collectiveEvaluations).length !== 0 ? phase.collectiveEvaluations : null,
      expertEvaluations,
    };

  }


  return consensusData;
};




export const createAnalyticalGraphsSection = async (issueId) => {
  const consensusDocs = await Consensus.find({ issue: issueId })
    .sort({ phase: 1 })
    .lean();

  // Solo docs que realmente tengan plotsGraphic
  const scatterPlot = consensusDocs
    .filter(doc => doc.details && doc.details.plotsGraphic)
    .map(doc => ({
      phase: doc.phase,
      expert_points: doc.details.plotsGraphic.expert_points,
      collective_point: doc.details.plotsGraphic.collective_point,
    }));

  const consensusLevelLineChart = {
    labels: consensusDocs.map(doc => `${doc.phase}`),
    data: consensusDocs.map(doc => doc.level ?? 0) // para no petar si es null
  };

  return { scatterPlot, consensusLevelLineChart };
};






