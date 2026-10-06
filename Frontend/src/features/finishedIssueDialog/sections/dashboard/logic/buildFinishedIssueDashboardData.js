import { buildOverviewData } from "../../overview/logic/buildFinishedIssueOverviewData.js";
import { normalizeFinishedIssueRanking } from "../../../shared/logic/normalizeFinishedIssueRanking.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const buildFindings = (ranking) => {
  if (!ranking.length) return [];

  const first = ranking[0];
  const last = ranking.at(-1);
  const rankedCount = ranking.length;
  const rankedNoun = rankedCount === 1 ? "alternative" : "alternatives";
  const winnerContext = rankedCount === 1 ? "as the only alternative" : `among the ${rankedCount} alternatives`;
  const findings = [{
    kind: "winner",
    title: "Recommended alternative",
    headline: first.name,
    text: first.formattedScore === "—"
      ? `${first.name} is the top-ranked option ${winnerContext}.`
      : `${first.name} is the top-ranked option ${winnerContext}, with a final score of ${first.formattedScore}.`,
  }];

  const overviewItems = [];
  if (ranking.length > 1 && Number.isFinite(first.score) && Number.isFinite(ranking[1].score)) {
    const leaderGap = first.score - ranking[1].score;
    const absoluteGapText = `The gap between the top two alternatives is ${Math.abs(leaderGap).toFixed(4)}`;
    const scoresAreOrderedDescending = ranking.every((entry, index) => (
      Number.isFinite(entry.score) && (index === 0 || ranking[index - 1].score >= entry.score)
    ));
    const observedRange = first.score - last.score;
    const canContextualizeGap = ranking.length >= 3 &&
      Number.isFinite(last.score) &&
      scoresAreOrderedDescending &&
      observedRange > 0;

    if (canContextualizeGap) {
      const gapSharePercent = (leaderGap / observedRange) * 100;
      overviewItems.push(`${absoluteGapText}, representing ${gapSharePercent.toFixed(1)}% of the total spread between the highest and lowest scores.`);
    } else {
      overviewItems.push(`${absoluteGapText}.`);
    }
  }

  if (ranking.every((entry) => Number.isFinite(entry.score))) {
    const lowest = ranking.reduce((current, entry) => entry.score < current.score ? entry : current);
    const highest = ranking.reduce((current, entry) => entry.score > current.score ? entry : current);
    overviewItems.push(`Final scores range from ${lowest.formattedScore} to ${highest.formattedScore} across ${rankedCount} ${rankedNoun}.`);
  }

  if (overviewItems.length) {
    findings.push({ kind: "overview", title: "Performance overview", items: overviewItems });
  }

  if (ranking.length > 1) {
    findings.push({
      kind: "last",
      title: "Lower-ranked alternative",
      headline: last.name,
      text: last.formattedScore === "—"
        ? `${last.name} is the lowest-ranked of the ${rankedCount} ${rankedNoun}.`
        : `${last.name} is the lowest-ranked of the ${rankedCount} ${rankedNoun}, with a final score of ${last.formattedScore}.`,
    });
  }

  return findings;
};

export const buildDashboardData = ({ payload, selectedExecution }) => {
  const canonicalPayload = payload || {};
  const overview = buildOverviewData(canonicalPayload);
  const execution = selectedExecution || {};
  const rankedAlternatives = execution.standardizedOutput?.rankedAlternatives;
  const ranking = normalizeFinishedIssueRanking(rankedAlternatives, canonicalPayload.alternatives);
  const modelName = execution.model?.name || canonicalPayload.models?.base?.name || "—";

  return {
    issueSummary: {
      alternativesCount: asArray(canonicalPayload.alternatives).length,
      criteriaCount: asArray(canonicalPayload.criteria?.nodes).filter((node) => node?.isLeaf === true).length,
      expertsCount: overview.participation.total,
      modelName,
    },
    result: {
      available: ranking.length > 0,
      unavailableReason: ranking.length ? null : "No final result is available.",
      ranking,
    },
    findings: buildFindings(ranking),
  };
};

export default buildDashboardData;
