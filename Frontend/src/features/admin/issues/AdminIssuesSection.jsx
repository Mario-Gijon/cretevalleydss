import { Backdrop, Box, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AssignmentIcon from "@mui/icons-material/Assignment";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";

import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import {
  computeIssueWeightsAdminAction,
  removeIssueAdminAction,
  resolveIssueAdminAction,
} from "../../../services/admin.service";
import AddExpertsDomainsDialog from "../../issueExperts/components/AddExpertsDomainsDialog";
import AdminIssueActionConfirmDialog from "./components/AdminIssueActionConfirmDialog";
import AdminIssueAddExpertsDialog from "./components/AdminIssueAddExpertsDialog";
import AdminIssueDetailDialog from "./components/AdminIssueDetailDialog";
import AdminIssueReassignDialog from "./components/AdminIssueReassignDialog";
import AdminIssuesStatCard from "./components/AdminIssuesStatCard";
import AdminIssuesTable from "./components/AdminIssuesTable";
import AdminIssuesToolbar from "./components/AdminIssuesToolbar";
import { useAdminIssuesSection } from "./hooks/useAdminIssuesSection";

export default function AdminIssuesSection() {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const { list, detail, actions } = useAdminIssuesSection();

  const isActionBackdropOpen =
    actions.reassignLoading ||
    actions.actionBusy.compute ||
    actions.actionBusy.resolve ||
    actions.actionBusy.remove ||
    actions.actionBusy.editExperts;

  const handleInspectExpert = (expertId) => {
    detail.setSelectedExpertId(expertId);
    detail.setDetailTab(2);
  };

  const handleRequestCompute = () => {
    if (!detail.issueDetail?.id) return;

    actions.openConfirmAction({
      key: "compute",
      title: "Compute weights",
      description:
        "This will compute the final criteria weights and move the issue forward.",
      run: () => computeIssueWeightsAdminAction(detail.issueDetail.id),
    });
  };

  const handleRequestResolve = () => {
    if (!detail.issueDetail?.id) return;

    actions.openConfirmAction({
      key: "resolve",
      title: "Resolve issue",
      description: "This will resolve the issue using the corresponding model.",
      run: () => resolveIssueAdminAction(detail.issueDetail.id),
    });
  };

  const handleRequestRemove = () => {
    if (!detail.issueDetail?.id) return;

    actions.openConfirmAction({
      key: "remove",
      title: "Remove issue",
      description: "This will permanently remove the issue and its related data.",
      run: () => removeIssueAdminAction(detail.issueDetail.id),
    });
  };

  if (list.loading) {
    return <CircularLoading color="secondary" size={44} height="28vh" />;
  }

  return (
    <>
      <Backdrop open={isActionBackdropOpen} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={46} height="50vh" />
      </Backdrop>

      <Stack spacing={1.15}>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
          }}
        >
          <AdminIssuesStatCard
            icon={<AssignmentIcon />}
            label="Total issues"
            value={list.stats.total}
            tone="info"
          />
          <AdminIssuesStatCard
            icon={<TimelineIcon />}
            label="Active"
            value={list.stats.active}
            tone="warning"
          />
          <AdminIssuesStatCard
            icon={<RuleOutlinedIcon />}
            label="Finished"
            value={list.stats.finished}
            tone="success"
          />
        </Box>

        <AdminIssuesToolbar
          search={list.search}
          activeFilter={list.activeFilter}
          consensusFilter={list.consensusFilter}
          stageFilter={list.stageFilter}
          stageOptions={list.stageOptions}
          refreshing={list.refreshing}
          onSearchChange={list.setSearch}
          onActiveFilterChange={list.setActiveFilter}
          onConsensusFilterChange={list.setConsensusFilter}
          onStageFilterChange={list.setStageFilter}
          onRefresh={() => list.fetchIssuesData({ keepLoading: true })}
        />

        <AdminIssuesTable
          issues={list.filteredIssues}
          isMdDown={isMdDown}
          onOpenDetail={detail.openDetail}
        />
      </Stack>

      <AdminIssueDetailDialog
        detail={detail}
        actions={actions}
        onClose={detail.closeDetail}
        onRequestCompute={handleRequestCompute}
        onRequestResolve={handleRequestResolve}
        onRequestRemove={handleRequestRemove}
        onInspectExpert={handleInspectExpert}
      />

      <AdminIssueAddExpertsDialog
        open={actions.addExpertsOpen}
        onClose={() => actions.setAddExpertsOpen(false)}
        loading={actions.addExpertsLoading}
        availableExperts={actions.availableExperts}
        expertsToAdd={actions.expertsToAdd}
        setExpertsToAdd={actions.setExpertsToAdd}
      />

      <AddExpertsDomainsDialog
        open={actions.assignDomainsOpen}
        onClose={() => actions.setAssignDomainsOpen(false)}
        issue={actions.issueForDomains}
        expertsToAdd={actions.expertsToAdd}
        onConfirmDomains={actions.handleConfirmDomains}
      />

      <AdminIssueReassignDialog
        open={actions.reassignOpen}
        issueDetail={detail.issueDetail}
        ownerCandidates={actions.ownerCandidates}
        ownerCandidatesLoading={actions.ownerCandidatesLoading}
        newOwnerId={actions.newOwnerId}
        onClose={() => actions.setReassignOpen(false)}
        onNewOwnerIdChange={actions.setNewOwnerId}
        onReassign={actions.handleReassignOwner}
      />

      <AdminIssueActionConfirmDialog
        confirmAction={actions.confirmAction}
        actionBusy={actions.actionBusy}
        onClose={actions.closeConfirmAction}
        onConfirm={actions.handleRunConfirmedAction}
      />
    </>
  );
}
