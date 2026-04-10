import { alpha } from "@mui/material/styles";

export const authLayoutContainerSx = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  position: "relative",
  overflow: "hidden",
};

export const authLayoutGridSx = {
  height: { xs: "90vh", sm: "95vh", md: "98vh" },
  pt: 1,
};

export const authFooterContainerSx = {
  pt: { xs: 1, sm: 2, md: 3, lg: 4 },
  pb: 3,
};

export const getAuroraBackground = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1200px 220px at 12% 0%, ${alpha(theme.palette.info.main, intensity)}, transparent 62%),
                    radial-gradient(900px 160px at 8% 6%, ${alpha(theme.palette.secondary.main, intensity)}, transparent 58%)`,
});

export const getGlassSurface = (theme, strength = 0.14) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  border: "1px solid rgba(155, 192, 197, 0.45)",
});

export const getAuthCardSx = (theme, accent = "secondary") => ({
  width: "100%",
  borderRadius: 6,
  overflow: "hidden",
  position: "relative",
  ...getGlassSurface(theme, 0.16),
  ...getAuroraBackground(theme, 0.16),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 48%)`,
    opacity: 0.22,
  },
  "& .auth-header-avatar": {
    width: 46,
    height: 46,
    bgcolor: alpha(theme.palette[accent].main, 0.12),
    color: `${accent}.main`,
    border: "1px solid rgba(255,255,255,0.10)",
  },
});

export const authCardContentSx = {
  position: "relative",
  zIndex: 1,
  p: { xs: 2, sm: 2.5 },
};