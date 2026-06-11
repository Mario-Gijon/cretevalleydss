import { alpha } from "@mui/material/styles";

import { getActiveIssuesHeaderGlassSx as glassSxBase } from "../../../activeIssues/styles/activeIssues.styles";

export const getAdminExpertToneColor = (theme, tone) => {
  if (tone === "success") return theme.palette.success.main;
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "error") return theme.palette.error.main;
  if (tone === "secondary") return theme.palette.secondary.main;
  return theme.palette.info.main;
};

export const getAdminExpertPillSx = (theme, tone = "info") => {
  const color = getAdminExpertToneColor(theme, tone);

  return {
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    bgcolor: alpha(color, 0.1),
    borderColor: alpha(color, 0.25),
    color: "text.secondary",
  };
};

export const getAdminExpertsSectionPanelSx = (theme) => ({
  borderRadius: 4,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, 0.2, "crystal"),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.1)}, transparent 55%)`,
    opacity: 0.18,
  },
});
