import { normalizeFinishedIssueRanking } from "../../../../shared/logic/normalizeFinishedIssueRanking.js";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import RankingDashboardResult from "./RankingDashboardResult.jsx";
import RankingFinishedIssueCardSummary from "./RankingFinishedIssueCardSummary.jsx";

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
    const canContextualizeGap = ranking.length >= 3 && Number.isFinite(last.score) && scoresAreOrderedDescending && observedRange > 0;
    overviewItems.push(canContextualizeGap
      ? `${absoluteGapText}, representing ${((leaderGap / observedRange) * 100).toFixed(1)}% of the total spread between the highest and lowest scores.`
      : `${absoluteGapText}.`);
  }

  if (ranking.every((entry) => Number.isFinite(entry.score))) {
    const lowest = ranking.reduce((current, entry) => entry.score < current.score ? entry : current);
    const highest = ranking.reduce((current, entry) => entry.score > current.score ? entry : current);
    overviewItems.push(`Final scores range from ${lowest.formattedScore} to ${highest.formattedScore} across ${rankedCount} ${rankedNoun}.`);
  }
  if (overviewItems.length) findings.push({ kind: "overview", title: "Performance overview", items: overviewItems });
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

const rankingV1ResultPresentation = Object.freeze({
  resultStructureKey: "ranking",
  resultStructureVersion: 1,
  capabilities: Object.freeze({ resultsAnalysis: true }),
  DashboardResultComponent: RankingDashboardResult,
  ResultHeaderIconComponent: EmojiEventsRoundedIcon,
  FinishedIssueCardSummaryComponent: RankingFinishedIssueCardSummary,
  normalizeDashboardResult: ({ execution, alternatives }) => {
    const ranking = normalizeFinishedIssueRanking(execution?.standardizedOutput?.rankedAlternatives, alternatives);
    return {
      available: ranking.length > 0,
      unavailableReason: ranking.length ? null : "No final result is available.",
      ranking,
    };
  },
  buildDashboardFindings: (result) => buildFindings(result.ranking),
});

export default rankingV1ResultPresentation;
