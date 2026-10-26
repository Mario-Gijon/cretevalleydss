import { forwardRef } from "react";
import { Tab, Tabs } from "@mui/material";
import TabScrollButton from "@mui/material/TabScrollButton";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import { finishedIssueNavigationSx } from "./finishedIssueShell.styles";

const TAB_LABELS = {
  dashboard: "Summary",
  overview: "Issue info",
  "results-analysis": "Analysis",
  evaluations: "Evaluations",
  models: "Executions",
};

const TAB_ICONS = {
  dashboard: <DashboardRoundedIcon fontSize="small" />,
  overview: <InfoOutlinedIcon fontSize="small" />,
  "results-analysis": <InsightsRoundedIcon fontSize="small" />,
  evaluations: <GroupsRoundedIcon fontSize="small" />,
  models: <ScienceRoundedIcon fontSize="small" />,
};

export const FinishedIssueTabScrollButton = forwardRef(function FinishedIssueTabScrollButton(
  { direction, disabled, onClick, ...props },
  ref,
) {
  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event);
  };

  return (
    <TabScrollButton
      {...props}
      ref={ref}
      direction={direction}
      disabled={disabled}
      onClick={handleClick}
      role="button"
      aria-label={`Scroll tabs ${direction}`}
      aria-disabled={disabled ? "true" : undefined}
      tabIndex={disabled ? -1 : 0}
      sx={{
        "&.Mui-disabled": {
          opacity: 0.42,
          color: "text.secondary",
          pointerEvents: "auto",
        },
      }}
    />
  );
});

const FinishedIssueNavigation = ({ navigation }) => (
  <Tabs
    aria-label="Finished issue sections"
    value={navigation.activeTab}
    onChange={(_, tab) => navigation.selectTab(tab)}
    variant="scrollable"
    scrollButtons="auto"
    ScrollButtonComponent={FinishedIssueTabScrollButton}
    allowScrollButtonsMobile
    textColor="secondary"
    indicatorColor="secondary"
    sx={finishedIssueNavigationSx}
  >
    {navigation.availableTabs.map((tab) => <Tab key={tab} value={tab} icon={TAB_ICONS[tab]} iconPosition="start" label={TAB_LABELS[tab]} />)}
  </Tabs>
);

export default FinishedIssueNavigation;
