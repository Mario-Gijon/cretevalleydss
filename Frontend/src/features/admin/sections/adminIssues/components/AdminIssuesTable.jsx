import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AdminIssueMetaChip from "./AdminIssueMetaChip";
import {
  getAdminIssueProgressTone,
  getAdminIssueStageLabel,
  getAdminIssueStageTone,
} from "../logic/getAdminIssueStatusDisplay";
import { getAdminIssuePillSx } from "../styles/adminIssues.styles";

export default function AdminIssuesTable({ issues, isMdDown, onOpenDetail }) {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={{ backgroundColor: "transparent" }}>
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <TableContainer
          sx={{
            maxHeight: "64vh",
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            bgcolor: alpha(theme.palette.common.white, 0.02),
            overflow: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
            "&::-webkit-scrollbar": { width: 8, height: 8 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: alpha(theme.palette.common.white, 0.16),
              borderRadius: 999,
              border: "2px solid transparent",
              backgroundClip: "content-box",
            },
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {[
                  "Issue",
                  "Model",
                  "Admin",
                  "Stage",
                  "Status",
                  "Experts",
                  "Progress",
                  "Closure",
                ].map((head) => (
                  <TableCell
                    key={head}
                    sx={{
                      fontWeight: 950,
                      color: alpha(theme.palette.common.white, 0.84),
                      borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                      bgcolor: "#1a2a2fcf",
                      py: 1.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    sx={{
                      py: 4,
                      borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    }}
                  >
                    <Stack spacing={0.6} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        No issues found
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        Try another search or filter combination.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => {
                  const metrics = issue?.metrics || {};
                  const progressTotal = metrics.acceptedExperts || 0;
                  const progressDone =
                    issue?.currentStage === "criteriaWeighting" ||
                    issue?.currentStage === "weightsFinished"
                      ? metrics.weightsDoneAccepted || 0
                      : metrics.evaluationsDoneAccepted || 0;
                  const progressPct =
                    progressTotal > 0
                      ? Math.round((progressDone / progressTotal) * 100)
                      : 0;

                  return (
                    <TableRow
                      key={issue?.id}
                      onClick={() => onOpenDetail(issue)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenDetail(issue);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      sx={{
                        cursor: "pointer",
                        transition: "background-color 0.16s ease, transform 0.16s ease",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.info.main, 0.06),
                        },
                        "&:focus-visible": {
                          outline: `2px solid ${alpha(theme.palette.info.main, 0.55)}`,
                          outlineOffset: "-2px",
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                          minWidth: 250,
                        }}
                      >
                        <Stack spacing={0.15}>
                          <Typography variant="body2" sx={{ fontWeight: 950 }}>
                            {issue?.name || "Unnamed issue"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            {issue?.description || "No description"}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {issue?.model?.name || "—"}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                          minWidth: 180,
                        }}
                      >
                        <Stack spacing={0.15}>
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>
                            {issue?.admin?.name || "—"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            {issue?.admin?.email || "—"}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                        }}
                      >
                        <AdminIssueMetaChip tone={getAdminIssueStageTone(issue?.currentStage)}>
                          {getAdminIssueStageLabel(issue)}
                        </AdminIssueMetaChip>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                        }}
                      >
                        <AdminIssueMetaChip tone={issue?.active ? "warning" : "success"}>
                          {issue?.active ? "Active" : "Finished"}
                        </AdminIssueMetaChip>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                          minWidth: 160,
                        }}
                      >
                        <Stack direction="row" spacing={0.6} flexWrap="wrap">
                          <Chip
                            label={`A ${metrics.acceptedExperts || 0}`}
                            size="small"
                            variant="outlined"
                            sx={getAdminIssuePillSx(theme, "success")}
                          />
                          <Chip
                            label={`P ${metrics.pendingExperts || 0}`}
                            size="small"
                            variant="outlined"
                            sx={getAdminIssuePillSx(theme, "warning")}
                          />
                          <Chip
                            label={`D ${metrics.declinedExperts || 0}`}
                            size="small"
                            variant="outlined"
                            sx={getAdminIssuePillSx(theme, "error")}
                          />
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                          minWidth: 130,
                        }}
                      >
                        <Stack spacing={0.35}>
                          <Stack direction="row" spacing={0.6} alignItems="center">
                            <AdminIssueMetaChip tone={getAdminIssueProgressTone(progressPct)}>
                              {progressDone}/{progressTotal}
                            </AdminIssueMetaChip>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                              {progressPct}%
                            </Typography>
                          </Stack>

                          {metrics.consensusRounds > 0 ? (
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                              Rounds: {metrics.consensusRounds}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          py: 1.15,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>
                          {issue?.closureDate || "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {isMdDown ? (
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "text.secondary", fontWeight: 850 }}
          >
            Scroll horizontally to view all columns.
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
