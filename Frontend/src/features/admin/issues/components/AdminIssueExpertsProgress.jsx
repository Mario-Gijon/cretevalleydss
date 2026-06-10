import {
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingButton from "@mui/lab/LoadingButton";

import DoneAllIcon from "@mui/icons-material/DoneAll";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import UndoIcon from "@mui/icons-material/Undo";

import AdminIssueMetaChip from "./AdminIssueMetaChip";
import {
  formatAdminIssueDateTime,
} from "../logic/formatAdminIssueDisplay";
import {
  getAdminIssueDetailCardSx,
  getAdminIssuePillSx,
} from "../styles/adminIssues.styles";

export default function AdminIssueExpertsProgress({
  issueDetail,
  issueExpertsProgress,
  actions,
  onInspectExpert,
}) {
  const theme = useTheme();
  const hasPendingChanges =
    actions.expertsToAdd.length > 0 || actions.expertsToRemove.length > 0;

  return (
    <Stack spacing={1.1}>
      <Paper elevation={0} sx={getAdminIssueDetailCardSx(theme)}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ mb: 1.1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <PeopleAltIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              Experts progress
            </Typography>
            <AdminIssueMetaChip tone="info">{issueExpertsProgress.length}</AdminIssueMetaChip>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ ml: { md: "auto" } }}
          >
            <LoadingButton
              variant="outlined"
              color="info"
              startIcon={<PersonAddAlt1Icon />}
              disabled={!issueDetail?.creatorActionsState?.canEditExperts}
              onClick={actions.handleOpenAddExperts}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              Add expert
            </LoadingButton>

            <LoadingButton
              variant="outlined"
              color="warning"
              startIcon={<UndoIcon />}
              disabled={!issueDetail?.creatorActionsState?.canEditExperts || !hasPendingChanges}
              onClick={actions.handleResetExpertChanges}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              Reset
            </LoadingButton>

            <LoadingButton
              variant="outlined"
              color="secondary"
              startIcon={<DoneAllIcon />}
              loading={actions.actionBusy.editExperts}
              disabled={!issueDetail?.creatorActionsState?.canEditExperts || !hasPendingChanges}
              onClick={actions.handleSaveExpertsChanges}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              Save changes
            </LoadingButton>
          </Stack>
        </Stack>

        {hasPendingChanges ? (
          <Stack spacing={0.85} sx={{ mb: 1.25 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap">
              {actions.expertsToAdd.length > 0 ? (
                <AdminIssueMetaChip tone="success">
                  Pending add: {actions.expertsToAdd.length}
                </AdminIssueMetaChip>
              ) : null}
              {actions.expertsToRemove.length > 0 ? (
                <AdminIssueMetaChip tone="error">
                  Pending remove: {actions.expertsToRemove.length}
                </AdminIssueMetaChip>
              ) : null}
              <AdminIssueMetaChip tone={actions.resultingExpertsCount > 0 ? "info" : "error"}>
                Resulting current experts: {actions.resultingExpertsCount}
              </AdminIssueMetaChip>
            </Stack>

            {actions.pendingAddExpertsInfo.length > 0 ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                {actions.pendingAddExpertsInfo.map((expert) => (
                  <Chip
                    key={expert?.email}
                    label={`+ ${expert?.name || expert?.email}`}
                    onDelete={() =>
                      actions.setExpertsToAdd((prev) =>
                        prev.filter((entry) => entry !== expert?.email)
                      )
                    }
                    variant="outlined"
                    sx={getAdminIssuePillSx(theme, "success")}
                  />
                ))}
              </Stack>
            ) : null}

            {actions.expertsToRemove.length > 0 ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                {actions.expertsToRemove.map((email) => (
                  <Chip
                    key={email}
                    label={`- ${email}`}
                    onDelete={() =>
                      actions.setExpertsToRemove((prev) =>
                        prev.filter((entry) => entry !== email)
                      )
                    }
                    variant="outlined"
                    sx={getAdminIssuePillSx(theme, "error")}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        <TableContainer
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            bgcolor: alpha(theme.palette.common.white, 0.02),
            overflow: "auto",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Expert",
                  "State",
                  "Weights",
                  "Evaluations",
                  "Progress",
                  "Last activity",
                  "Joined",
                  "Actions",
                ].map((head) => (
                  <TableCell key={head} sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {issueExpertsProgress.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      No expert data available.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                issueExpertsProgress.map((row) => {
                  const evaluationStatus = row?.progress?.status || "notSubmitted";
                  const email = row?.expert?.email || "";
                  const isMarkedForRemove = actions.expertsToRemove.includes(email);
                  const canMarkRemove =
                    issueDetail?.creatorActionsState?.canEditExperts &&
                    row?.currentParticipant &&
                    Boolean(email);

                  return (
                    <TableRow
                      key={row?.expert?.id || row?.expert?.email}
                      sx={{
                        bgcolor: isMarkedForRemove
                          ? alpha(theme.palette.error.main, 0.08)
                          : "transparent",
                      }}
                    >
                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Stack spacing={0.15}>
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>
                            {row?.expert?.name || "Unknown"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            {row?.expert?.email || "—"}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          <AdminIssueMetaChip tone={row?.currentParticipant ? "success" : "error"}>
                            {row?.currentParticipant
                              ? row?.invitationStatus || "participant"
                              : "exited"}
                          </AdminIssueMetaChip>
                          {isMarkedForRemove ? (
                            <AdminIssueMetaChip tone="error">Marked for removal</AdminIssueMetaChip>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <AdminIssueMetaChip tone={row?.weightsCompleted ? "success" : "warning"}>
                          {row?.weightsCompleted ? "Completed" : "Pending"}
                        </AdminIssueMetaChip>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <AdminIssueMetaChip tone={row?.evaluationCompleted ? "success" : "warning"}>
                          {row?.evaluationCompleted ? "Submitted" : "Pending"}
                        </AdminIssueMetaChip>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {evaluationStatus}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            Submitted docs: {row?.progress?.submittedEvaluationDocs || 0}
                            {row?.progress?.draftEvaluationDocs
                              ? ` · Draft docs: ${row.progress.draftEvaluationDocs}`
                              : ""}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>
                          {formatAdminIssueDateTime(
                            row?.progress?.lastEvaluationAt || row?.exitInfo?.timestamp
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>
                          {formatAdminIssueDateTime(row?.joinedAt)}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Stack direction="row" spacing={0.65}>
                          <Tooltip title="Inspect this expert" arrow>
                            <IconButton
                              size="small"
                              onClick={() => onInspectExpert(row?.expert?.id || "")}
                              sx={{
                                border: "1px solid rgba(255,255,255,0.10)",
                                bgcolor: alpha(theme.palette.common.white, 0.03),
                              }}
                            >
                              <PersonSearchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip
                            title={
                              !row?.currentParticipant
                                ? "Only current participants can be removed"
                                : isMarkedForRemove
                                  ? "Undo removal mark"
                                  : "Mark expert for removal"
                            }
                            arrow
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={!canMarkRemove}
                                onClick={() => actions.toggleRemoveExpert(email)}
                                sx={{
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  bgcolor: alpha(
                                    isMarkedForRemove
                                      ? theme.palette.warning.main
                                      : theme.palette.error.main,
                                    canMarkRemove ? 0.12 : 0.03
                                  ),
                                }}
                              >
                                {isMarkedForRemove ? (
                                  <UndoIcon fontSize="small" />
                                ) : (
                                  <PersonRemoveAlt1Icon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
