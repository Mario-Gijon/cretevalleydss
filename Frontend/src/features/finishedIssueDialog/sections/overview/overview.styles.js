export const overviewRootSx = {
  width: "100%",
  minWidth: 0,
};

export const overviewTopGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    lg: "1.08fr 0.92fr",
  },
  gap: { xs: 1.5, md: 1.75 },
  mb: { xs: 1.5, md: 1.75 },
  alignItems: "stretch",
};

export const overviewBottomGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    md: "minmax(0, 1.18fr) minmax(300px, 0.82fr)",
  },
  gridTemplateAreas: {
    xs: `"criteria" "participation"`,
    md: `"criteria participation"`,
  },
  gap: { xs: 1.5, md: 1.75 },
  alignItems: "stretch",
};

export const overviewGridItemSx = (area) => ({
  gridArea: area,
  minWidth: 0,
  "& > *": { height: "100%" },
});

export const overviewPanelSx = {
  minWidth: 0,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  p: { xs: 1.45, md: 1.75, xl: 1.9 },
  borderRadius: 3,
  border: "1px solid rgba(85, 199, 216, 0.20)",
  bgcolor: "rgba(8, 18, 29, 0.92)",
  background:
    "linear-gradient(150deg, rgba(27, 111, 145, 0.16), rgba(8, 18, 29, 0.95) 46%)",
  boxShadow: "0 15px 36px rgba(0,0,0,0.18)",
};

export const overviewPanelHeaderSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.9,
  mb: 1.3,
};

export const overviewPanelIconSx = {
  width: 31,
  height: 31,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  borderRadius: 1.3,
  color: "secondary.light",
  bgcolor: "rgba(52, 170, 199, 0.12)",
  border: "1px solid rgba(89, 213, 218, 0.13)",
};

export const overviewPanelTitleSx = {};

export const overviewPanelCountSx = {
  ml: "auto",
  px: 0.8,
  py: 0.25,
  borderRadius: 99,
  color: "secondary.light",
  bgcolor: "rgba(50, 163, 194, 0.11)",
  border: "1px solid rgba(74, 200, 210, 0.16)",
  typography: "caption",
  fontWeight: "fontWeightBold",
};

export const overviewIssueGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "minmax(0, 1.05fr) minmax(180px, 0.75fr)",
  },
  gap: 1.4,
  alignItems: "stretch",
};

export const overviewIssueRowsSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(0, 1fr))",
  },
  gap: 0.65,
};

export const overviewInformationRowSx = {
  display: "grid",
  gridTemplateColumns: "31px minmax(0, 1fr)",
  gap: 0.8,
  alignItems: "center",
  minWidth: 0,
  px: 0.85,
  py: 0.75,
  borderRadius: 1.35,
  border: "1px solid rgba(255,255,255,0.07)",
  bgcolor: "rgba(255,255,255,0.018)",
};

export const overviewInformationIconSx = (tone = "cyan") => ({
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  color:
    tone === "green"
      ? "success.light"
      : tone === "red"
        ? "error.light"
        : "secondary.light",
  bgcolor:
    tone === "green"
      ? "rgba(66, 194, 139, 0.11)"
      : tone === "red"
        ? "rgba(231, 79, 79, 0.10)"
        : "rgba(48, 157, 197, 0.11)",
});

export const overviewHeroSx = {
  position: "relative",
  minHeight: { xs: 178, sm: "100%" },
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  borderRadius: 2,
  border: "1px solid rgba(66, 192, 208, 0.10)",
  bgcolor: "rgba(9, 29, 42, 0.28)",
  "&::before": {
    content: '""',
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: "50%",
    border: "1px solid rgba(61, 202, 215, 0.13)",
    boxShadow:
      "0 0 0 26px rgba(61,202,215,0.025), 0 0 0 52px rgba(61,202,215,0.018)",
    transform: "rotateX(68deg)",
  },
};

export const overviewAlternativeRowSx = {
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr) auto",
  gap: 0.9,
  alignItems: "center",
  minWidth: 0,
  px: 1,
  py: 0.9,
  borderRadius: 1.55,
  border: "1px solid rgba(255,255,255,0.078)",
  bgcolor: "rgba(255,255,255,0.022)",
  transition: "border-color 150ms ease, background-color 150ms ease",
  "&:hover": {
    borderColor: "rgba(84, 205, 214, 0.23)",
    bgcolor: "rgba(52, 153, 184, 0.045)",
  },
};

import { finishedIssueScrollbarSx } from "../../shared/styles/finishedIssueScrollbar.styles.js";

export const overviewScrollableSurfaceSx = finishedIssueScrollbarSx;

export const overviewScrollableListSx = {
  ...overviewScrollableSurfaceSx,
  minHeight: 0,
  maxHeight: { xs: 360, md: 390, xl: 430 },
  overflowY: "auto",
  overflowX: "hidden",
  pr: 0.35,
};

export const overviewCriteriaViewportSx = {
  ...overviewScrollableSurfaceSx,
  minHeight: 0,
  width: "100%",
  maxHeight: { xs: 420, md: 460, xl: 520 },
  overflow: "auto",
  pr: 0.4,
  pb: 0.25,
};

export const overviewParticipationListSx = {
  ...overviewScrollableSurfaceSx,
  minHeight: 0,
  maxHeight: { xs: 260, md: 218, xl: 250 },
  overflowY: "auto",
  overflowX: "hidden",
  pr: 0.35,
};

export const overviewDomainListSx = {
  ...overviewScrollableSurfaceSx,
  minHeight: 0,
  maxHeight: { xs: 220, md: 250, xl: 290 },
  overflowY: "auto",
  overflowX: "hidden",
  pr: 0.35,
};

export const overviewCriterionRowSx = (depth, hasChildren) => ({
  position: "relative",
  width: `calc(100% - ${depth * 2.15}rem)`,
  minWidth: 0,
  ml: depth * 2.15,
  mb: 0.65,
  "&::before":
    depth > 0
      ? {
          content: '""',
          position: "absolute",
          left: -15,
          top: -10,
          bottom: -10,
          width: "1px",
          bgcolor: "rgba(76, 201, 211, 0.20)",
        }
      : undefined,
  "&::after":
    depth > 0
      ? {
          content: '""',
          position: "absolute",
          left: -15,
          top: 23,
          width: 12,
          height: "1px",
          bgcolor: "rgba(76, 201, 211, 0.30)",
        }
      : undefined,
  ...(hasChildren
    ? {
        "& > .criterion-surface": {
          borderColor: "rgba(70, 194, 207, 0.16)",
        },
      }
    : {}),
});

export const overviewCriterionSurfaceSx = {
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "25px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 0.7,
  px: 0.85,
  py: 0.72,
  borderRadius: 1.45,
  border: "1px solid rgba(255,255,255,0.075)",
  bgcolor: "rgba(255,255,255,0.020)",
};

export const overviewParticipationGridSx = {
  display: "flex",
  flexDirection: "column",
  gap: 1.1,
  alignItems: "stretch",
};

export const overviewParticipantRowSx = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 0.8,
  alignItems: "center",
  minWidth: 0,
  px: 0.9,
  py: 0.8,
  borderRadius: 1.5,
  border: "1px solid rgba(255,255,255,0.075)",
  bgcolor: "rgba(255,255,255,0.02)",
};

export const overviewParticipationChartSx = {
  minHeight: 218,
  display: "grid",
  placeItems: "center",
  p: 1,
  borderRadius: 1.8,
  border: "1px solid rgba(255,255,255,0.075)",
  bgcolor: "rgba(4, 12, 21, 0.30)",
};

export const overviewConfigRowSx = {
  display: "grid",
  gridTemplateColumns: "29px minmax(0, 0.9fr) minmax(0, 1.15fr)",
  gap: 0.7,
  alignItems: "center",
  minWidth: 0,
  py: 0.72,
  "&:not(:last-child)": {
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
};

export const overviewDomainSx = {
  px: 0.9,
  py: 0.75,
  borderRadius: 1.4,
  border: "1px solid rgba(255,255,255,0.075)",
  bgcolor: "rgba(255,255,255,0.018)",
};

export const overviewFooterSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(0, 1fr))",
    lg: "auto auto auto minmax(260px, 1fr)",
  },
  gap: { xs: 0.75, lg: 0 },
  alignItems: "center",
  mt: { xs: 1.5, md: 1.75 },
  px: { xs: 1.1, md: 1.35 },
  py: 0.9,
  borderRadius: 2.2,
  border: "1px solid rgba(84, 199, 211, 0.15)",
  bgcolor: "rgba(8, 19, 30, 0.80)",
  "& > *": {
    minWidth: 0,
  },
  "& > *:not(:last-child)": {
    borderRight: { xs: 0, lg: "1px solid rgba(255,255,255,0.08)" },
    pr: { xs: 0, lg: 1.35 },
    mr: { xs: 0, lg: 1.35 },
  },
};
