import { buildOverviewData } from "../../overview/logic/buildFinishedIssueOverviewData.js";
import { normalizeFinishedIssueRanking } from "../../../shared/logic/normalizeFinishedIssueRanking.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const buildFindings = (ranking) => {
  if (!ranking.length) return [];

  const first = ranking[0];
  const last = ranking.at(-1);
  const findings = [{
    title: "Top-ranked alternative",
    text: first.formattedScore === "—"
      ? `${first.name} ranks first.`
      : `${first.name} ranks first with a score of ${first.formattedScore}.`,
  }];

  if (ranking.length > 1 && Number.isFinite(first.score) && Number.isFinite(ranking[1].score)) {
    findings.push({
      title: "First and second",
      text: `The first two alternatives differ by ${Math.abs(first.score - ranking[1].score).toFixed(4)} score units.`,
    });
  }

  if (ranking.length > 1) {
    findings.push({
      title: "Last-ranked alternative",
      text: last.formattedScore === "—"
        ? `${last.name} is the last-ranked alternative.`
        : `${last.name} is the last-ranked alternative with a score of ${last.formattedScore}.`,
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
