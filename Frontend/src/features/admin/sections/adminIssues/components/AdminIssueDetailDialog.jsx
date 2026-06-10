import { useMemo } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AssignmentIcon from "@mui/icons-material/Assignment";
import CloseIcon from "@mui/icons-material/Close";

import { GlassDialog } from "../../../../../components/StyledComponents/GlassDialog";
import { CircularLoading } from "../../../../../components/LoadingProgress/CircularLoading";
import { getActiveIssuesAuroraBg } from "../../../../activeIssues/styles/activeIssues.styles";
import { buildAdminIssueDetailView } from "../logic/buildAdminIssueDetailView";
import AdminIssueExpertReview from "./AdminIssueExpertReview";
import AdminIssueExpertsProgress from "./AdminIssueExpertsProgress";
import AdminIssueOverview from "./AdminIssueOverview";

export default function AdminIssueDetailDialog({
  detail,
  actions,
  onClose,
  onRequestCompute,
  onRequestResolve,
  onRequestRemove,
  onInspectExpert,
}) {
  const theme = useTheme();
  const detailView = useMemo(
    () =>
      buildAdminIssueDetailView({
        issueDetail: detail.issueDetail,
        expertEvaluations: detail.expertEvaluations,
        expertWeights: detail.expertWeights,
      }),
    [detail.issueDetail, detail.expertEvaluations, detail.expertWeights]
  );

  return (
    <GlassDialog open={detail.detailOpen} onClose={onClose} maxWidth="xl" fullWidth>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          ...getActiveIssuesAuroraBg(theme, 0.16),
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
            opacity: 0.18,
          },
        }}
      >
        <Box sx={{ p: 2.1, position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                  color: "warning.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <AssignmentIcon />
              </Avatar>

              <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 980,
                    lineHeight: 1.05,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {detail.issueDetail?.name || detail.selectedIssueRow?.name || "Issue detail"}
                </Typography>
              </Stack>
            </Stack>

            <IconButton
              onClick={onClose}
              sx={{
                border: "1px solid rgba(255,255,255,0.10)",
                bgcolor: alpha(theme.palette.common.white, 0.04),
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {detail.detailLoading ? (
        <CircularLoading color="secondary" size={42} height="36vh" />
      ) : !detail.issueDetail ? (
        <Box sx={{ p: 2.1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            Issue detail is not available.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2.1 }}>
          <Tabs
            value={detail.detailTab}
            onChange={(_event, value) => detail.setDetailTab(value)}
            textColor="secondary"
            indicatorColor="secondary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 1.5,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 950,
                minHeight: 42,
              },
            }}
          >
            <Tab label="Overview" />
            <Tab label="Experts" />
            <Tab label="Expert review" />
          </Tabs>

          {detail.detailTab === 0 ? (
            <AdminIssueOverview
              issueDetail={detail.issueDetail}
              selectedIssueRow={detail.selectedIssueRow}
              detailView={detailView}
              actionBusy={actions.actionBusy}
              onGoToExperts={() => detail.setDetailTab(1)}
              onOpenReassignDialog={actions.openReassignDialog}
              onRequestCompute={onRequestCompute}
              onRequestResolve={onRequestResolve}
              onRequestRemove={onRequestRemove}
            />
          ) : null}

          {detail.detailTab === 1 ? (
            <AdminIssueExpertsProgress
              issueDetail={detail.issueDetail}
              issueExpertsProgress={detail.issueExpertsProgress}
              actions={actions}
              onInspectExpert={onInspectExpert}
            />
          ) : null}

          {detail.detailTab === 2 ? (
            <AdminIssueExpertReview
              detail={detail}
              issueExpertsProgress={detail.issueExpertsProgress}
              detailView={detailView}
            />
          ) : null}
        </Box>
      )}
    </GlassDialog>
  );
}
