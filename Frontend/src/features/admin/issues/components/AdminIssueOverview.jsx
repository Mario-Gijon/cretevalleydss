import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingButton from "@mui/lab/LoadingButton";

import AssignmentIcon from "@mui/icons-material/Assignment";
import CategoryIcon from "@mui/icons-material/Category";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GavelIcon from "@mui/icons-material/Gavel";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CalculateIcon from "@mui/icons-material/Calculate";

import { IssueModelParametersView } from "../../../modelParameters";
import AdminIssueInfoRow from "./AdminIssueInfoRow";
import AdminIssueMetaChip from "./AdminIssueMetaChip";
import {
  formatAdminIssueDateTime,
  formatAdminIssueWeightValue,
} from "../logic/formatAdminIssueDisplay";
import { getAdminIssueStageLabel } from "../logic/getAdminIssueStatusDisplay";
import { getAdminIssueDetailCardSx } from "../styles/adminIssues.styles";
import { buildModelParameterContext } from "../../../modelParameters/logic/buildModelParameterContext";

export default function AdminIssueOverview({
  issueDetail,
  selectedIssueRow,
  detailView,
  actionBusy,
  onGoToExperts,
  onOpenReassignDialog,
  onRequestCompute,
  onRequestResolve,
  onRequestRemove,
}) {
  const theme = useTheme();
  const parameterContext = buildModelParameterContext({
    leafCriteria: Array.isArray(detailView?.leafCriteria) ? detailView.leafCriteria : [],
    leafNames: Array.isArray(detailView?.leafNames) ? detailView.leafNames : [],
    alternatives: Array.isArray(detailView?.alternatives) ? detailView.alternatives : [],
  });

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          display: "grid",
          gap: 1.1,
          gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" },
        }}
      >
        <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <InfoOutlinedIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Issue information
            </Typography>
          </Stack>

          <Stack spacing={0.9}>
            <AdminIssueInfoRow label="Name" value={issueDetail?.name || selectedIssueRow?.name} />
            <AdminIssueInfoRow label="Description" value={issueDetail?.description || "—"} />
            <AdminIssueInfoRow
              label="Current owner"
              value={
                issueDetail?.owner
                  ? `${issueDetail.owner.name} (${issueDetail.owner.email})`
                  : "—"
              }
            />
            <AdminIssueInfoRow label="Model" value={issueDetail?.model?.name || "—"} />
            <AdminIssueInfoRow label="Stage" value={getAdminIssueStageLabel(issueDetail)} />
            <AdminIssueInfoRow
              label="Criteria weighting structure"
              value={detailView.criteriaWeightingStructureLabel}
            />
            <AdminIssueInfoRow
              label="Evaluation structure"
              value={detailView.alternativeEvaluationStructureLabel}
            />
            <AdminIssueInfoRow label="Creation date" value={issueDetail?.creationDate || "—"} />
            <AdminIssueInfoRow label="Closure date" value={issueDetail?.closureDate || "—"} />
          </Stack>

          <Divider sx={{ opacity: 0.12, my: 1.4 }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SwapHorizIcon />}
              onClick={onOpenReassignDialog}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              Reassign owner
            </Button>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <RuleOutlinedIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Owner actions
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <LoadingButton
              variant="outlined"
              color="secondary"
              startIcon={<EditOutlinedIcon />}
              disabled={!issueDetail?.ownerActionsState?.canEditExperts}
              onClick={onGoToExperts}
              sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
            >
              Manage experts
            </LoadingButton>

            <LoadingButton
              variant="outlined"
              color="warning"
              startIcon={<CalculateIcon />}
              loading={actionBusy.compute}
              disabled={!issueDetail?.ownerActionsState?.canComputeWeights}
              onClick={onRequestCompute}
              sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
            >
              Compute weights
            </LoadingButton>

            <LoadingButton
              variant="outlined"
              color="warning"
              startIcon={<GavelIcon />}
              loading={actionBusy.resolve}
              disabled={!issueDetail?.ownerActionsState?.canResolveIssue}
              onClick={onRequestResolve}
              sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
            >
              Resolve issue
            </LoadingButton>

            <LoadingButton
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              loading={actionBusy.remove}
              disabled={!issueDetail?.ownerActionsState?.canRemoveIssue}
              onClick={onRequestRemove}
              sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
            >
              Remove issue
            </LoadingButton>
          </Stack>
        </Paper>
      </Box>

      <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <InfoOutlinedIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
            Model parameters
          </Typography>
        </Stack>

        <IssueModelParametersView
          parameters={issueDetail?.model?.parameters || []}
          values={issueDetail?.modelParameters || {}}
          context={parameterContext}
        />
      </Paper>

      <Box
        sx={{
          display: "grid",
          gap: 1.1,
          gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
        }}
      >
        <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AssignmentIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Alternatives
            </Typography>
          </Stack>

          <Stack spacing={0.65}>
            {detailView.alternatives.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                No alternatives.
              </Typography>
            ) : (
              detailView.alternatives.map((alternative) => (
                <Box
                  key={alternative?.id}
                  sx={{
                    px: 1,
                    py: 0.8,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.common.white, 0.03),
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                    {alternative?.name}
                  </Typography>
                </Box>
              ))
            )}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <CategoryIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Leaf criteria / final weights
            </Typography>
          </Stack>

          <Stack spacing={0.65}>
            {detailView.leafCriteria.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                No leaf criteria.
              </Typography>
            ) : (
              detailView.leafCriteria.map((criterion) => (
                <Box
                  key={criterion?.id}
                  sx={{
                    px: 1,
                    py: 0.8,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.common.white, 0.03),
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.1}>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        {criterion?.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        {criterion?.type || "—"}
                      </Typography>
                    </Stack>

                    <AdminIssueMetaChip tone="info">
                      {formatAdminIssueWeightValue(issueDetail?.finalWeights?.[criterion?.name])}
                    </AdminIssueMetaChip>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </Paper>
      </Box>

      {detailView.scenarios.length > 0 ? (
        <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <PsychologyIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Scenarios
            </Typography>
          </Stack>

          <Stack spacing={0.75}>
            {detailView.scenarios.map((scenario) => (
              <Box
                key={scenario?.id}
                sx={{
                  px: 1,
                  py: 0.85,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.03),
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={0.8}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.15}>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {scenario?.name || scenario?.targetModelName || "Scenario"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      {scenario?.targetModelName || "—"} · {scenario?.status || "—"}
                    </Typography>
                  </Stack>

                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    {formatAdminIssueDateTime(scenario?.createdAt)}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
