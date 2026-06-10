import { normalizePlotsGraphic } from "./buildFinishedIssueGraphs";

const deepClone = (value) =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const normalizeScenarioRanking = ({ standardResult }) => {
  const fromRankedAlternatives = Array.isArray(standardResult?.rankedAlternatives)
    ? standardResult.rankedAlternatives
    : [];
  if (!fromRankedAlternatives.length) return [];

  return fromRankedAlternatives
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      if (typeof entry.name !== "string" || !entry.name.trim()) return null;
      const score = Number(entry.score);
      if (!Number.isFinite(score)) return null;
      const rank = Number(entry.rank);
      if (!Number.isInteger(rank) || rank <= 0) return null;

      return {
        alternativeId:
          typeof entry.alternativeId === "string" ? entry.alternativeId : null,
        name: entry.name.trim(),
        score,
        rank,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
};

export const applyScenarioToIssueInfo = (baseIssueInfo, scenario) => {
  const out = deepClone(baseIssueInfo || {});
  const scenarioOutputs = scenario?.outputs || {};
  const standardResult = scenarioOutputs?.standardResult || {};
  const modelExecutionOutput = scenarioOutputs?.modelExecution || null;
  const scenarioRawOutput =
    scenarioOutputs?.rawOutput ??
    standardResult?.rawOutput ??
    modelExecutionOutput?.rawOutput ??
    null;
  const scenarioEvaluationStructure =
    scenario?.targetAlternativeEvaluationStructureKey ||
    scenario?.alternativeEvaluationStructureKey ||
    null;
  const normalizedRanking = normalizeScenarioRanking({ standardResult });
  const collectiveEvaluations =
    standardResult?.collectiveEvaluations &&
    typeof standardResult.collectiveEvaluations === "object"
      ? standardResult.collectiveEvaluations
      : null;

  out.summary = {
    ...(out.summary || {}),
    model: scenario?.targetModelName || out?.summary?.model,
    modelName: scenario?.targetModelName || out?.summary?.modelName,
    targetModelName: scenario?.targetModelName,
    alternativeEvaluationStructureKey:
      scenarioEvaluationStructure || out?.summary?.alternativeEvaluationStructureKey,
    modelParameters:
      scenario?.config?.normalizedModelParameters ||
      scenario?.config?.modelParameters ||
      out?.summary?.modelParameters,
  };

  out.modelParams = { ...(out.modelParams || {}) };
  out.modelParams.base = {
    ...(out.modelParams.base || {}),
    modelName: scenario?.targetModelName || out.modelParams.base?.modelName,
    alternativeEvaluationStructureKey:
      scenarioEvaluationStructure ||
      out.modelParams.base?.alternativeEvaluationStructureKey,
    paramsSaved:
      scenario?.config?.modelParameters || out.modelParams.base?.paramsSaved,
    paramsResolved:
      scenario?.config?.normalizedModelParameters ||
      out.modelParams.base?.paramsResolved,
  };

  out.alternativesRankings = [{ phase: 1, rankedAlternatives: normalizedRanking }];
  out.consensus = [];
  out.consensusHistory = [];
  out.consensusRounds = [];
  out.consensusDetails = {
    modelExecution: modelExecutionOutput,
    rankedAlternatives: normalizedRanking,
    plotsGraphic: standardResult?.plotsGraphic || {},
  };
  out.modelExecution =
    modelExecutionOutput ||
    (scenarioRawOutput !== null && scenarioRawOutput !== undefined
      ? { rawOutput: scenarioRawOutput }
      : null);
  out.selectedScenario = {
    config: scenario?.config || null,
    outputs: scenarioOutputs,
  };

  const scatterPlot = standardResult?.plotsGraphic;
  const normalizedPlotsGraphic = normalizePlotsGraphic(scatterPlot);
  if (normalizedPlotsGraphic) {
    out.analyticalGraphs = {
      ...(out.analyticalGraphs || {}),
      plotsGraphic: scatterPlot,
      ...(normalizedPlotsGraphic.isValid ? { scatterPlot: [scatterPlot] } : {}),
    };
  }

  if (collectiveEvaluations && out?.expertsRatings && typeof out.expertsRatings === "object") {
    for (const key of Object.keys(out.expertsRatings)) {
      if (out.expertsRatings[key]) {
        out.expertsRatings[key].collectiveEvaluations = collectiveEvaluations;
      }
    }
  }

  return out;
};
