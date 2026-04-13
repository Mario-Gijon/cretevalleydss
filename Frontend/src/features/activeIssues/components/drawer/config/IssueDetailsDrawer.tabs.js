import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

export const BASE_DRAWER_TABS = [
  { key: "overview", label: "Overview", icon: InfoOutlinedIcon },
  { key: "alts", label: "Alternatives", icon: ViewListIcon },
  { key: "criteria", label: "Criteria", icon: CategoryIcon },
  { key: "timeline", label: "Timeline", icon: TimelineIcon },
];

export const ADMIN_DRAWER_TAB = {
  key: "experts",
  label: "Experts",
  icon: PeopleAltIcon,
};

export const buildDrawerTabs = (selectedIssue) => {
  if (!selectedIssue) {
    return [];
  }

  const tabs = [...BASE_DRAWER_TABS];

  if (selectedIssue.isAdmin) {
    tabs.push(ADMIN_DRAWER_TAB);
  }

  return tabs;
};