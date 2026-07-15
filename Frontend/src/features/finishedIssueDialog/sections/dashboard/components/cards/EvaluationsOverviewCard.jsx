import { Box, Chip, Stack, Typography } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";

const formatWeight = (value) => typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(4)).toString() : "—";

const EvaluationsOverviewCard = ({ evaluations, onViewEvaluations }) => (
  <DashboardCardShell number="3" title="Evaluations" subtitle={evaluations.stageLabel || "Evaluation summary"} icon={<PeopleAltIcon fontSize="small" />} actionLabel="View evaluations" onAction={onViewEvaluations}>
    <Stack spacing={0.72}>
      <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap"><Chip size="small" label={evaluations.phaseLabel} variant="outlined" /><Chip size="small" label={`${evaluations.completedExpertsCount}/${evaluations.expertsCount} completed`} variant="outlined" /><Chip size="small" label={evaluations.hasCollective ? "Collective available" : "Individual evaluation"} color={evaluations.hasCollective ? "success" : "default"} variant="outlined" /></Stack>
      {evaluations.criteria.slice(0, 4).map((criterion) => {
        const weight = evaluations.finalCriteriaWeights?.[criterion.id];
        const width = typeof weight === "number" && Number.isFinite(weight) ? `${Math.max(0, Math.min(100, weight * 100))}%` : "0%";
        return <Stack key={criterion.id} spacing={0.28}><Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="caption" noWrap sx={{ fontWeight: 800, minWidth: 0 }}>{criterion.name}</Typography><Typography variant="caption" sx={{ fontWeight: 900 }}>{formatWeight(weight)}</Typography></Stack><Box sx={{ height: 5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.065)", overflow: "hidden" }}><Box sx={{ width, height: "100%", borderRadius: 999, bgcolor: "secondary.main" }} /></Box></Stack>;
      })}
      {evaluations.criteria.length ? <MetaText>Total weight · {formatWeight(Object.values(evaluations.finalCriteriaWeights || {}).reduce((sum, value) => typeof value === "number" && Number.isFinite(value) ? sum + value : sum, 0))}</MetaText> : null}
      {evaluations.matrix ? <Box sx={{ pt: 0.2, overflow: "hidden" }}><Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>Alternative evaluation</Typography><Box sx={{ mt: 0.45, display: "grid", gridTemplateColumns: `minmax(56px, 1fr) repeat(${evaluations.matrix.criteria.length}, minmax(42px, 0.7fr))`, gap: 0.35, fontSize: 10 }}>{["", ...evaluations.matrix.criteria.map((criterion) => criterion.name)].map((value, index) => <Typography key={`head-${index}`} variant="caption" noWrap sx={{ color: "text.secondary", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</Typography>)}{evaluations.matrix.rows.flatMap((row) => [<Typography key={`${row.id}-name`} variant="caption" noWrap sx={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</Typography>, ...row.values.map((value, index) => <Box key={`${row.id}-${index}`} sx={{ px: 0.35, py: 0.12, borderRadius: 0.6, bgcolor: "rgba(255,255,255,0.06)", textAlign: "center" }}>{value}</Box>)])}</Box>{evaluations.matrix.hasMoreAlternatives || evaluations.matrix.hasMoreCriteria ? <MetaText>More values available in Evaluations.</MetaText> : null}</Box> : <MetaText>{evaluations.structure ? `Structure: ${evaluations.structure}` : "No evaluation structure is available."}</MetaText>}
    </Stack>
  </DashboardCardShell>
);

export default EvaluationsOverviewCard;
