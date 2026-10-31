import { Box, Stack, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import AHPSortIAlternativeEvidence from "./AHPSortIAlternativeEvidence.jsx";

const cardSx = {
  border: "1px solid rgba(83,198,214,0.16)",
  bgcolor: "rgba(8,18,29,0.88)",
  borderRadius: 3,
  p: { xs: 1.5, sm: 2 },
  minWidth: 0,
};

const AHPSortIExecutionEvidence = ({ execution }) => {
  const { categories, evidence } = execution.ahpSortIAnalysisEvidence;
  return (
    <Box sx={{ minWidth: 0 }}>
      {execution.displayLabel && (
        <Typography variant="subtitle1" sx={{ mb: 0.8, color: execution.color, fontWeight: 800 }}>
          {execution.displayLabel}
        </Typography>
      )}
      <Stack spacing={1.1}>
        {categories.map((category) => (
          <Box key={category.id} component="section" aria-label={`${category.label} classification evidence`} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.35, fontWeight: 800 }}>
              {category.label}
            </Typography>
            <Stack spacing={0.65}>
              {category.alternatives.map((alternative) => (
                <Box key={alternative.id} sx={{ minWidth: 0, pl: 0.9, borderLeft: "1px solid rgba(83,198,214,0.24)" }}>
                  <Typography variant="body2" sx={{ fontWeight: 650, overflowWrap: "anywhere" }}>
                    {alternative.name}
                  </Typography>
                  <AHPSortIAlternativeEvidence evidence={evidence.alternativesById?.[alternative.id]} />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
      {evidence.status !== "available" && evidence.unavailableReason && (
        <Typography
          variant="caption"
          role={evidence.status === "integrity_warning" ? "alert" : "note"}
          data-testid={`ahp-sort-i-analysis-${evidence.status}`}
          sx={{ display: "block", mt: 0.8, color: evidence.status === "integrity_warning" ? "warning.light" : "text.secondary", lineHeight: 1.45 }}
        >
          {evidence.unavailableReason}
        </Typography>
      )}
    </Box>
  );
};

const AHPSortIClassificationAnalysis = ({ executions = [] }) => {
  const evidenceExecutions = executions.filter((execution) => execution?.ahpSortIAnalysisEvidence);
  if (!evidenceExecutions.length) return null;

  return (
    <Box component="section" aria-labelledby="ahpsort-i-classification-evidence-title" sx={cardSx} data-testid="ahpsort-i-classification-analysis">
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.35 }}>
        <AnalyticsIcon fontSize="small" color="secondary" aria-hidden="true" />
        <Typography id="ahpsort-i-classification-evidence-title" variant="h6" component="h2" sx={{ fontWeight: 900 }}>
          AHPSort I classification evidence
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
        Saved AHP priorities, profile comparisons and assignment explanations for each alternative.
      </Typography>
      <Stack spacing={1.4}>
        {evidenceExecutions.map((execution) => (
          <AHPSortIExecutionEvidence key={execution.key} execution={execution} />
        ))}
      </Stack>
    </Box>
  );
};

export default AHPSortIClassificationAnalysis;
