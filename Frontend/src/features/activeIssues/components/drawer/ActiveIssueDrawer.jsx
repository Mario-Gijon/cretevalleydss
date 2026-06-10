import { useMemo } from "react";
import { Stack, Box, Drawer, Divider, Tabs, Tab, IconButton, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CloseIcon from "@mui/icons-material/Close";
import {
  countLeafCriteria,
  getIssueDrawerAlternatives,
  getIssueDrawerDeadlineLabel,
  getIssueDrawerFinalWeights,
  getIssueDrawerParticipation,
  getIssueDrawerPermissions,
  getLeafCriterionNames,
} from "../../logic/activeIssueDrawerDetails.js";
import ActiveIssueOverview from "./ActiveIssueOverview.jsx";
import ActiveIssueCriteria from "./ActiveIssueCriteria.jsx";
import ActiveIssueAlternatives from "./ActiveIssueAlternatives.jsx";
import ActiveIssueTimeline from "./ActiveIssueTimeline.jsx";
import ActiveIssueDrawerHeader from "./ActiveIssueDrawerHeader.jsx";
import { getNextActionMeta } from "../../logic/activeIssuesMeta.js";
import IssueExpertsSection from "../../../issueExperts/components/IssueExpertsSection.jsx";

const BASE_DRAWER_TABS = [
  { key: "overview", label: "Overview", icon: InfoOutlinedIcon },
  { key: "alts", label: "Alternatives", icon: ViewListIcon },
  { key: "criteria", label: "Criteria", icon: CategoryIcon },
  { key: "timeline", label: "Timeline", icon: TimelineIcon },
];

const ADMIN_DRAWER_TAB = {
  key: "experts",
  label: "Experts",
  icon: PeopleAltIcon,
};

/**
 * Drawer principal de detalles del issue activo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssueDrawer = ({
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
  setIsRatingAlternatives,
  setIsRatingWeights,
}) => {
  const theme = useTheme();

  const {
    totalExperts,
    pendingExperts,
    participatedExperts,
    notEvaluatedExperts,
    declinedExperts,
  } = useMemo(() => {
    return getIssueDrawerParticipation(selectedIssue);
  }, [selectedIssue]);

  const drawerAction = useMemo(() => {
    return selectedIssue ? getNextActionMeta(selectedIssue) : null;
  }, [selectedIssue]);

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

  const drawerTabs = useMemo(() => {
    if (!selectedIssue) {
      return [];
    }

    return selectedIssue.isAdmin
      ? [...BASE_DRAWER_TABS, ADMIN_DRAWER_TAB]
      : BASE_DRAWER_TABS;
  }, [selectedIssue]);

  const finalWeights = useMemo(() => {
    return getIssueDrawerFinalWeights(selectedIssue);
  }, [selectedIssue]);

  const leafNames = useMemo(() => {
    return getLeafCriterionNames(selectedIssue?.criteria || []);
  }, [selectedIssue?.criteria]);

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
    leafNames,
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
        <Stack sx={{ p: 3 }} spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 980 }}>
              Issue details
            </Typography>

            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Select an issue to see details.
          </Typography>
        </Stack>
      ) : (
        <Stack sx={{ height: "100%" }}>
          <ActiveIssueDrawerHeader
            selectedIssue={selectedIssue}
            alternativesCount={alternatives.length}
            criteriaCount={criteriaCount}
            totalExperts={totalExperts}
            deadlineLabel={deadlineLabel}
            onClose={onClose}
          />

          <Divider sx={{ opacity: 0.18 }} />

          <Box sx={{ px: 2, pt: 1 }}>
            <Tabs
              value={drawerTab}
              onChange={(_, value) => setDrawerTab(value)}
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

          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pt: 2, pb: 2 }}>
            {drawerTab === 0 ? <ActiveIssueOverview {...overviewProps} /> : null}

            {drawerTab === 1 ? (
              <ActiveIssueAlternatives alternatives={alternatives} />
            ) : null}

            {drawerTab === 2 ? (
              <ActiveIssueCriteria
                selectedIssue={selectedIssue}
                criteriaCount={criteriaCount}
                finalWeights={finalWeights}
              />
            ) : null}

            {drawerTab === 3 ? (
              <ActiveIssueTimeline
                selectedIssue={selectedIssue}
                deadlineLabel={deadlineLabel}
              />
            ) : null}

            {selectedIssue.isAdmin && drawerTab === 4 ? (
              <Box sx={{ minHeight: 0 }}>
                <IssueExpertsSection />
              </Box>
            ) : null}
          </Box>

          <Divider sx={{ opacity: 0.18 }} />
        </Stack>
      )}
    </Drawer>
  );
};

export default ActiveIssueDrawer;
