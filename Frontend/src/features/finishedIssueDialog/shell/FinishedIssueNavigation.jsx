import { Tab, Tabs } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";

import { finishedIssueNavigationSx } from "./finishedIssueShell.styles";

const TAB_LABELS = {
  dashboard: "Summary",
  overview: "Overview",
  "results-analysis": "Results analysis",
  "global-analysis": "Global analysis",
  evaluations: "Evaluations",
  models: "Models",
};

const TAB_ICONS = {
  dashboard: <DashboardRoundedIcon fontSize="small" />,
  overview: <InfoOutlinedIcon fontSize="small" />,
  "results-analysis": <InsightsRoundedIcon fontSize="small" />,
  "global-analysis": <InsightsRoundedIcon fontSize="small" />,
  evaluations: <GroupsRoundedIcon fontSize="small" />,
  models: <ScienceRoundedIcon fontSize="small" />,
};

const FinishedIssueNavigation = ({ navigation }) => (
  <Tabs value={navigation.activeTab} onChange={(_, tab) => navigation.selectTab(tab)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile indicatorColor="secondary" textColor="inherit" sx={finishedIssueNavigationSx}>
    {navigation.availableTabs.map((tab) => <Tab key={tab} value={tab} icon={TAB_ICONS[tab]} iconPosition="start" label={TAB_LABELS[tab]} />)}
  </Tabs>
);

export default FinishedIssueNavigation;
