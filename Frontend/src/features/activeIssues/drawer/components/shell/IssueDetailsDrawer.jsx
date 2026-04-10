import { useMemo } from "react";
import {
  Stack,
  Box,
  Drawer,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  getNextActionMeta,
} from "../../../utils/activeIssues.meta";
import { countLeafCriteria } from "../../../../../utils/issues/criteriaTree";
import {
  buildIssueDrawerModelParamsList,
  getIssueDrawerAlternatives,
  getIssueDrawerDeadlineLabel,
  getIssueDrawerFinalWeights,
  getIssueDrawerParticipation,
  getIssueDrawerPermissions,
} from "../../utils/issueDetailsDrawer.utils";
import { IssueDetailsDrawerTabPanel } from "./IssueDetailsDrawer.parts";
import IssueDetailsOverviewTab from "../tabs/IssueDetailsOverviewTab";
import IssueDetailsExpertsTab from "../tabs/IssueDetailsExpertsTab";
import IssueDetailsCriteriaTab from "../tabs/IssueDetailsCriteriaTab";
import IssueDetailsAlternativesTab from "../tabs/IssueDetailsAlternativesTab";
import IssueDetailsTimelineTab from "../tabs/IssueDetailsTimelineTab";
import IssueDetailsDrawerHeader from "../shell/IssueDetailsDrawerHeader";
import IssueDetailsDrawerEmptyState from "../shell/IssueDetailsDrawerEmptyState";
import { buildDrawerTabs } from "../config/IssueDetailsDrawer.tabs.js";

const IssueDetailsDrawer = ({
  open,
  onClose,
  onMinimize,
  selectedIssue,
  isMobile,
  drawerTab,
  setDrawerTab,
  busy,
  openConfirm,
  handleLeaveIssue,
  handleComputeWeights,
  handleResolveIssue,
  handleRemoveIssue,
  isEditingExperts,
  toggleEditExperts,
  expertsToRemove,
  markRemoveExpert,
  expertsToAdd,
  setOpenAddExpertsDialog,
  saveExpertsChanges,
  setIsRatingAlternatives,
  setIsRatingWeights,
}) => {

  const theme = useTheme();

  const {
    totalExperts,
    pendingExperts,
    participatedExperts,
    notEvaluatedExperts,
    declinedExperts
  } = useMemo(() => {
    return getIssueDrawerParticipation(selectedIssue);
  }, [selectedIssue]);

  const drawerAction = useMemo(
    () => (selectedIssue ? getNextActionMeta(selectedIssue) : null),
    [selectedIssue]
  );

  const DrawerActionIcon = drawerAction?.icon || null;

  const alternatives = useMemo(() => {
    return getIssueDrawerAlternatives(selectedIssue);
  }, [selectedIssue]);

  const criteriaCount = useMemo(() => {
    return countLeafCriteria(selectedIssue?.criteria || []);
  }, [selectedIssue?.criteria]);

  const deadlineLabel = useMemo(() => {
    return getIssueDrawerDeadlineLabel(selectedIssue);
  }, [selectedIssue]);

  const drawerTabs = useMemo(() => buildDrawerTabs(selectedIssue), [selectedIssue]);

  const finalWeights = useMemo(() => {
    return getIssueDrawerFinalWeights(selectedIssue);
  }, [selectedIssue]);

  const modelParamsList = useMemo(() => {
    return buildIssueDrawerModelParamsList(selectedIssue);
  }, [selectedIssue]);

  const permissions = useMemo(() => {
    return getIssueDrawerPermissions(selectedIssue);
  }, [selectedIssue]);

  const cEvalA = permissions.canEvaluateAlternatives;
  const cEvalW = permissions.canEvaluateWeights;
  const cComputeW = permissions.canComputeWeights;
  const cResolve = permissions.canResolveIssue;

  const overviewProps = {
    selectedIssue,
    drawerAction,
    DrawerActionIcon,
    deadlineLabel,
    modelParamsList,
    totalExperts,
    pendingExperts,
    participatedExperts,
    notEvaluatedExperts,
    declinedExperts,
    cEvalA,
    cEvalW,
    cComputeW,
    cResolve,
    busy,
    openConfirm,
    handleLeaveIssue,
    handleComputeWeights,
    handleResolveIssue,
    handleRemoveIssue,
    setIsRatingAlternatives,
    setIsRatingWeights,
    isMobile,
    onMinimize,
  };

  const expertsTabProps = {
    selectedIssue,
    isEditingExperts,
    toggleEditExperts,
    expertsToRemove,
    markRemoveExpert,
    expertsToAdd,
    setOpenAddExpertsDialog,
    saveExpertsChanges,
    busy,
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 580, md: 720 },
          borderTopLeftRadius: { xs: 0, sm: 24 },
          borderBottomLeftRadius: { xs: 0, sm: 24 },
          overflow: "hidden",
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: "blur(14px)",
        },
        elevation: 0,
      }}
    >
      {!selectedIssue ? (
        <IssueDetailsDrawerEmptyState onClose={onClose} />
      ) : (
        <Stack sx={{ height: "100%" }}>
          <IssueDetailsDrawerHeader
            selectedIssue={selectedIssue}
            alternativesCount={alternatives.length}
            criteriaCount={criteriaCount}
            totalExperts={totalExperts}
            deadlineLabel={deadlineLabel}
            onClose={onClose}
          />

          <Divider sx={{ opacity: 0.18 }} />

          {/* Tabs */}
          <Box sx={{ px: 2, pt: 1 }}>
            <Tabs
              value={drawerTab}
              onChange={(_, v) => setDrawerTab(v)}
              textColor="secondary"
              indicatorColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": { fontWeight: 950, minHeight: 42 },
                minHeight: 42,
              }}
            >
              {drawerTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <Tab
                    key={tab.key}
                    label={tab.label}
                    icon={<Icon fontSize="small" />}
                    iconPosition="start"
                    sx={{ textTransform: "none" }}
                  />
                );
              })}
            </Tabs>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pt: 2, pb: 2 }}>
            {/* Overview */}
            <IssueDetailsDrawerTabPanel value={drawerTab} index={0}>
              <IssueDetailsOverviewTab {...overviewProps} />
            </IssueDetailsDrawerTabPanel>

            {/* Alternatives */}
            <IssueDetailsDrawerTabPanel value={drawerTab} index={1}>
              <IssueDetailsAlternativesTab alternatives={alternatives} />
            </IssueDetailsDrawerTabPanel>

            {/* Criteria */}
            <IssueDetailsDrawerTabPanel value={drawerTab} index={2}>
              <IssueDetailsCriteriaTab
                selectedIssue={selectedIssue}
                criteriaCount={criteriaCount}
                finalWeights={finalWeights}
              />
            </IssueDetailsDrawerTabPanel>

            {/* Timeline */}
            <IssueDetailsDrawerTabPanel value={drawerTab} index={3}>
              <IssueDetailsTimelineTab
                selectedIssue={selectedIssue}
                deadlineLabel={deadlineLabel}
              />
            </IssueDetailsDrawerTabPanel>

            {/* Experts */}
            {selectedIssue.isAdmin ? (
              <IssueDetailsDrawerTabPanel value={drawerTab} index={4}>
                <IssueDetailsExpertsTab {...expertsTabProps} />
              </IssueDetailsDrawerTabPanel>
            ) : null}
          </Box>

          <Divider sx={{ opacity: 0.18 }} />
        </Stack>
      )}
    </Drawer>
  );
};

export default IssueDetailsDrawer;
