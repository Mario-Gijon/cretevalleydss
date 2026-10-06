import { buildOverviewData } from "../../overview/logic/buildFinishedIssueOverviewData.js";
import { normalizeFinishedIssueRanking } from "../../../shared/logic/normalizeFinishedIssueRanking.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const buildFindings = (ranking) => {
  if (!ranking.length) return [];

  const first = ranking[0];
  const last = ranking.at(-1);
  const rankedCount = ranking.length;
  const rankedNoun = rankedCount === 1 ? "alternative" : "alternatives";
  const findings = [{
    kind: "winner",
    title: "Recommended alternative",
    headline: first.name,
    text: first.formattedScore === "—"
      ? `Among the ${rankedCount} ranked ${rankedNoun}, this option occupies first place in the final ranking.`
      : `Among the ${rankedCount} ranked ${rankedNoun}, this option occupies first place with a final score of ${first.formattedScore}.`,
  }];

  const overviewItems = [];
  if (ranking.length > 1 && Number.isFinite(first.score) && Number.isFinite(ranking[1].score)) {
    overviewItems.push(`The difference between the first and second alternatives is ${Math.abs(first.score - ranking[1].score).toFixed(4)} score units.`);
  }

  if (ranking.every((entry) => Number.isFinite(entry.score))) {
    const lowest = ranking.reduce((current, entry) => entry.score < current.score ? entry : current);
    const highest = ranking.reduce((current, entry) => entry.score > current.score ? entry : current);
    overviewItems.push(`Final scores range from ${lowest.formattedScore} to ${highest.formattedScore} across ${rankedCount} ranked ${rankedNoun}.`);
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
        ? `Among the ${rankedCount} ranked ${rankedNoun}, this option occupies the final position in the ranking.`
        : `Among the ${rankedCount} ranked ${rankedNoun}, this option occupies the final position with a final score of ${last.formattedScore}.`,
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
