import { Tab, Tabs } from "@mui/material";

const TAB_LABELS = {
  dashboard: "Dashboard",
  overview: "Overview",
  "results-analysis": "Results analysis",
  evaluations: "Evaluations",
  consensus: "Consensus",
  models: "Models",
};

const FinishedIssueNavigation = ({ navigation }) => (
  <Tabs value={navigation.activeTab} onChange={(_, tab) => navigation.selectTab(tab)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile indicatorColor="secondary" textColor="inherit" sx={{ minHeight: 38, "& .MuiTab-root": { minHeight: 38, textTransform: "none", fontWeight: 900 } }}>
    {navigation.availableTabs.map((tab) => <Tab key={tab} value={tab} label={TAB_LABELS[tab]} />)}
  </Tabs>
);

export default FinishedIssueNavigation;
