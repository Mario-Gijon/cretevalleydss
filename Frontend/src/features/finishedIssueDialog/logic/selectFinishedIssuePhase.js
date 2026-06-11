import { extractLeafCriteria } from "../../issueEvaluation/logic/extractIssueEvaluationLeafCriteria";

const countLeafCriteria = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;

  let count = 0;
  const stack = [...nodes];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      count += 1;
    } else {
      stack.push(...children);
    }
  }

  return count;
};

const getLastPhaseFromRounds = (rounds = []) => {
  const phases = rounds
    .map((round) => Number(round?.phase))
    .filter((phase) => Number.isInteger(phase) && phase > 0);

  if (phases.length === 0) return null;
  return Math.max(...phases);
};

export const getLeafCriteriaCountFromIssue = (source) => {
  if (Array.isArray(source?.modelParams?.leafCriteria)) {
    return source.modelParams.leafCriteria.length;
  }

  if (Array.isArray(source?.modelParams?.base?.leafCriteria)) {
    return source.modelParams.base.leafCriteria.length;
  }

  if (Array.isArray(source?.summary?.criteria)) {
    return countLeafCriteria(source.summary.criteria);
  }

  if (Array.isArray(source?.criteria)) {
    return countLeafCriteria(source.criteria);
  }

  return 0;
};

export const hasSingleLeafCriterion = (source) =>
  getLeafCriteriaCountFromIssue(source) === 1;

export const getLastPhaseIndex = (issueInfo) => {
  const historyPhase = getLastPhaseFromRounds(
    Array.isArray(issueInfo?.consensusHistory) ? issueInfo.consensusHistory : []
  );
  if (historyPhase) return historyPhase - 1;

  const roundsPhase = getLastPhaseFromRounds(
    Array.isArray(issueInfo?.consensusRounds) ? issueInfo.consensusRounds : []
  );
  if (roundsPhase) return roundsPhase - 1;

  const consensusPhase = getLastPhaseFromRounds(
    Array.isArray(issueInfo?.consensus) ? issueInfo.consensus : []
  );
  if (consensusPhase) return consensusPhase - 1;

  const keys = Object.keys(issueInfo?.expertsRatings || {})
    .map((key) => parseInt(key, 10))
    .filter((key) => !Number.isNaN(key));

  const last = Math.max(...keys, 0) - 1;
  return Math.max(0, last);
};

export const getRoundsCount = (issueInfo) => {
  const historyPhase = getLastPhaseFromRounds(
    Array.isArray(issueInfo?.consensusHistory) ? issueInfo.consensusHistory : []
  );
  if (historyPhase) return historyPhase;

  const roundsPhase = getLastPhaseFromRounds(
    Array.isArray(issueInfo?.consensusRounds) ? issueInfo.consensusRounds : []
  );
  if (roundsPhase) return roundsPhase;

  const consensusPhase = getLastPhaseFromRounds(
    Array.isArray(issueInfo?.consensus) ? issueInfo.consensus : []
  );
  if (consensusPhase) return consensusPhase;

  const fromConsensus = issueInfo?.summary?.consensusInfo?.consensusReachedPhase;
  if (typeof fromConsensus === "number" && fromConsensus > 0) return fromConsensus;

  const keys = Object.keys(issueInfo?.expertsRatings || {})
    .map((key) => parseInt(key, 10))
    .filter((key) => !Number.isNaN(key));

  const derived = Math.max(...keys, 0);
  if (derived > 0) return derived;

  const rankings = issueInfo?.alternativesRankings;
  if (Array.isArray(rankings) && rankings.length) return rankings.length;

  return 0;
};

export const getLeafCriteriaNamesFallback = (summaryCriteria) => {
  try {
    const leaf = extractLeafCriteria(summaryCriteria || []);
    return leaf.map((criterion) => criterion?.name).filter(Boolean);
  } catch {
    return [];
  }
};
