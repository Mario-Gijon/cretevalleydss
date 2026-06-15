import {
  Box,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  Typography,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";

import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import ExpressionDomainSummaryButton from "../../../issueEvaluation/components/ExpressionDomainSummaryButton";
import { EVALUATION_STAGES } from "../../../issueEvaluation/evaluation.constants";
import EvaluationStructureRenderer from "../../../issueEvaluation/components/EvaluationStructureRenderer";
import AdminIssueInfoRow from "./AdminIssueInfoRow";
import AdminIssueMetaChip from "./AdminIssueMetaChip";
import AdminIssueReadOnlyWeights from "./AdminIssueReadOnlyWeights";
import { formatAdminIssueDateTime } from "../logic/formatAdminIssueDisplay";
import { getAdminIssueProgressTone } from "../logic/getAdminIssueStatusDisplay";
import { getAdminIssueDetailCardSx } from "../styles/adminIssues.styles";

export default function AdminIssueExpertReview({ detail, issueExpertsProgress, detailView }) {
  const theme = useTheme();

  return (
    <Stack spacing={1.1}>
      <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonSearchIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Expert review
            </Typography>
          </Stack>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 340 } }}>
            <Select
              value={detail.selectedExpertId}
              color="info"
              displayEmpty
              onChange={(event) => detail.setSelectedExpertId(event.target.value)}
              sx={{
                borderRadius: 3,
                bgcolor: alpha(theme.palette.common.white, 0.04),
                minWidth: { xs: "100%", md: 340 },
              }}
            >
              {issueExpertsProgress.map((row) => (
                <MenuItem key={row?.expert?.id} value={row?.expert?.id}>
                  {row?.expert?.name || "Unknown"} — {row?.expert?.email || "—"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {detail.selectedExpertProgress ? (
          <>
            <Divider sx={{ opacity: 0.12, my: 1.3 }} />

            <Stack direction="row" flexWrap="wrap" gap={1}>
              <AdminIssueMetaChip tone={detail.selectedExpertProgress?.currentParticipant ? "success" : "error"}>
                {detail.selectedExpertProgress?.currentParticipant
                  ? "Current participant"
                  : "Exited"}
              </AdminIssueMetaChip>
              <AdminIssueMetaChip
                tone={getAdminIssueProgressTone(
                  detail.selectedExpertProgress?.progress?.evaluationProgressPct || 0
                )}
              >
                Evaluation: {detail.selectedExpertProgress?.progress?.status || "notSubmitted"}
              </AdminIssueMetaChip>
            </Stack>
          </>
        ) : null}
      </Paper>

      {detail.expertEvalLoading ? (
        <CircularLoading color="secondary" size={34} height="20vh" />
      ) : !detail.selectedExpertId ? (
        <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            Select an expert to inspect weights and evaluations.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              gridTemplateColumns: detailView.shouldShowExpertWeights
                ? { xs: "1fr", xl: "0.92fr 1.08fr" }
                : "1fr",
            }}
          >
            {detailView.shouldShowExpertWeights ? (
              <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <RuleOutlinedIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                      Weights
                    </Typography>
                  </Stack>
                </Stack>

                <AdminIssueReadOnlyWeights
                  data={detail.expertWeights}
                  leafCriteria={detailView.leafCriteria}
                />
              </Paper>
            ) : null}

            <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <FactCheckOutlinedIcon fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                  Evaluation summary
                </Typography>
              </Stack>

              <Stack spacing={0.75}>
                <AdminIssueInfoRow
                  label="Status"
                  value={detail.expertEvaluations?.stats?.status || "notSubmitted"}
                />
                <AdminIssueInfoRow
                  label="Submitted at"
                  value={formatAdminIssueDateTime(
                    detail.expertEvaluations?.stats?.submittedAt
                  )}
                />
                <AdminIssueInfoRow
                  label="Last activity"
                  value={formatAdminIssueDateTime(
                    detail.expertEvaluations?.stats?.lastEvaluationAt
                  )}
                />
                <AdminIssueInfoRow
                  label="Invitation status"
                  value={detail.expertEvaluations?.participation?.invitationStatus || "—"}
                />
              </Stack>
            </Paper>
          </Box>

          <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <AnalyticsOutlinedIcon fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                  Evaluations
                </Typography>
              </Stack>

              <Stack direction="row" spacing={0.75} alignItems="center">
                <ExpressionDomainSummaryButton
                  criteria={detailView.leafCriteria.map((criterion) => ({
                    isLeaf: true,
                    name: criterion?.name || "—",
                    expressionDomain: criterion?.expressionDomain || null,
                  }))}
                />
                {detailView.hasExpertCollectiveEvaluations ? (
                  <ToggleButton
                    value="collective"
                    selected={detail.showExpertCollective}
                    onChange={() =>
                      detail.setShowExpertCollective((value) => !value)
                    }
                    color="secondary"
                    size="small"
                    sx={{
                      borderRadius: 2.5,
                      textTransform: "none",
                      fontWeight: 850,
                      px: 1.2,
                    }}
                  >
                    {detail.showExpertCollective ? "Hide collective" : "Show collective"}
                  </ToggleButton>
                ) : null}
              </Stack>
            </Stack>

            {!detail.expertEvaluations?.issue?.alternativeEvaluationStructureKey ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Evaluation structure does not expose a reusable renderer.
              </Typography>
            ) : (
              <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                <EvaluationStructureRenderer
                  issue={{
                    ...detail.issueDetail,
                    alternatives: detailView.orderedAlternativesForReview,
                    criteria: detailView.orderedLeafCriteriaForReview.map(
                      (criterion) => ({
                        ...criterion,
                        children: [],
                      })
                    ),
                  }}
                  stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
                  structureKey={
                    detail.expertEvaluations?.issue?.alternativeEvaluationStructureKey ||
                    ""
                  }
                  backendPayload={detail.expertEvaluations?.evaluations || {}}
                  collectivePayload={
                    detail.showExpertCollective &&
                    detailView.hasExpertCollectiveEvaluations
                      ? detail.expertEvaluations?.collectiveEvaluations || null
                      : null
                  }
                  readOnly
                />
              </Box>
            )}
          </Paper>
        </>
      )}
    </Stack>
  );
}
