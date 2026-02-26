// private/admin/AdminPage.jsx
import { useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Box, Stack, Typography, Paper, Grid, Avatar, IconButton, Chip, Divider, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PsychologyIcon from "@mui/icons-material/Psychology";
import BugReportIcon from "@mui/icons-material/BugReport";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { auroraBg, glassSx as glassSxBase } from "../../../components/ActiveIssuesHeader/ActiveIssuesHeader";

// Sections
import ReportsSection from "./sections/ReportsSection";
import ExpertsSection from "./sections/ExpertsSection";
import IssuesSection from "./sections/IssuesSection";
import ModelsSection from "./sections/ModelsSection";
import LogsSection from "./sections/LogsSection";

/* --------------------------------
 * Styles (simple, clean admin panel)
 * -------------------------------- */

const panelSx = (theme, strength = 0.14) => ({
  borderRadius: 5,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, strength, "crystal"),
  ...auroraBg(theme, 0.12),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
    opacity: 0.2,
  },
});

const sectionCardSx = (theme) => ({
  borderRadius: 5,
  height: "100%",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 220ms ease, background 220ms ease",
  ...glassSxBase(theme, 0.12, "crystal"),
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: `0 20px 54px ${alpha(theme.palette.common.black, 0.14)}`,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: alpha(theme.palette.background.paper, 0.16),
  },
});

const toneDot = (theme, tone) => {
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "success") return theme.palette.success.main;
  if (tone === "error") return theme.palette.error.main;
  return theme.palette.info.main;
};

const Tag = ({ tone = "info", children }) => {
  const theme = useTheme();
  const c = toneDot(theme, tone);
  return (
    <Chip
      label={children}
      size="small"
      variant="outlined"
      sx={{
        height: 26,
        borderRadius: 999,
        fontWeight: 950,
        bgcolor: alpha(c, 0.1),
        borderColor: alpha(c, 0.25),
        color: "text.secondary",
      }}
    />
  );
};

/* --------------------------------
 * Sections (admin essentials)
 * -------------------------------- */

const SECTIONS = [
  {
    key: "experts",
    title: "Experts",
    desc: "Directory, invitations and domain assignments.",
    tone: "success",
    icon: <PeopleAltIcon />,
    group: "Operations",
  },
  {
    key: "issues",
    title: "Issues",
    desc: "Create, monitor and manage decision problems.",
    tone: "warning",
    icon: <AssignmentIcon />,
    group: "Operations",
  },
  {
    key: "models",
    title: "Models",
    desc: "Manage decision models and their parameters.",
    tone: "info",
    icon: <PsychologyIcon />,
    group: "Operations",
  },
  {
    key: "reports",
    title: "Reports",
    desc: "Usage and activity summaries.",
    tone: "info",
    icon: <AssessmentIcon />,
    group: "Monitoring",
  },
  {
    key: "logs",
    title: "Logs",
    desc: "System events, errors and audit trail.",
    tone: "warning",
    icon: <BugReportIcon />,
    group: "Monitoring",
  },
];

/* --------------------------------
 * Home (clear options)
 * -------------------------------- */

function AdminHome() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const groups = useMemo(() => {
    const map = new Map();
    SECTIONS.forEach((s) => {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group).push(s);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1.5, md: 2.5 }, pt: 2, pb: 3 }}>
      <Paper elevation={0} sx={{ ...panelSx(theme, 0.16), p: { xs: 1.6, md: 2.0 }, mb: 2 }}>
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 0.8 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: "secondary.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <AdminPanelSettingsIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                Admin panel
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Select a section to manage the platform.
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ opacity: 0.14, mt: 1.2 }} />
        </Box>
      </Paper>

      <Stack spacing={2}>
        {groups.map(([groupName, items]) => (
          <Box key={groupName}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                {groupName}
              </Typography>
              <Tag tone="info">{items.length}</Tag>
            </Stack>

            <Grid container spacing={1.5}>
              {items.map((s) => {
                const accent = toneDot(theme, s.tone);
                return (
                  <Grid key={s.key} item xs={12} sm={6} lg={4}>
                    <Paper elevation={0} sx={sectionCardSx(theme)} onClick={() => navigate(s.key)}>
                      <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, bgcolor: alpha(accent, 0.9) }} />

                      <Box sx={{ p: 2, position: "relative", zIndex: 1 }}>
                        <Stack direction="row" spacing={1.2} alignItems="flex-start">
                          <Avatar
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: alpha(accent, 0.12),
                              color: accent,
                              border: "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            {s.icon}
                          </Avatar>

                          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 980,
                                  lineHeight: 1.1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.title}
                              </Typography>
                              <Box sx={{ flex: 1 }} />
                              <ArrowForwardIosIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                            </Stack>

                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                fontWeight: 850,
                                display: "-webkit-box",
                                WebkitLineClamp: isLgUp ? 2 : 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {s.desc}
                            </Typography>

                            <Box sx={{ mt: 1 }}>
                              <Tag tone={s.tone}>{s.group}</Tag>
                            </Box>
                          </Stack>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/* --------------------------------
 * Section shell (full-screen layout)
 * -------------------------------- */

function AdminSectionShell({ sectionKey, children }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const section = useMemo(() => SECTIONS.find((s) => s.key === sectionKey) || null, [sectionKey]);
  const accent = toneDot(theme, section?.tone || "info");

  if (!section) return <Navigate to="/dashboard/admin" replace />;

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", px: { xs: 1.5, md: 2.5 }, pt: 2, pb: 3 }}>
      <Paper elevation={0} sx={{ ...panelSx(theme, 0.14), p: { xs: 1.6, md: 2.0 } }}>
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
              <IconButton
                onClick={() => navigate("/dashboard/admin")}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowBackIcon />
              </IconButton>

              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(accent, 0.12),
                  color: accent,
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {section.icon}
              </Avatar>

              <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                  {section.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  {section.desc}
                </Typography>
              </Stack>
            </Stack>

            <Tag tone={section.tone}>{section.group}</Tag>
          </Stack>

          <Divider sx={{ opacity: 0.14, my: 1.6 }} />

          <Box>{children}</Box>
        </Box>
      </Paper>
    </Box>
  );
}

/* --------------------------------
 * Main AdminPage (internal routes)
 * -------------------------------- */

export default function AdminPage() {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route index element={<AdminHome />} />

      <Route
        path="experts"
        element={
          <AdminSectionShell sectionKey="experts">
            <ExpertsSection />
          </AdminSectionShell>
        }
      />
      <Route
        path="issues"
        element={
          <AdminSectionShell sectionKey="issues">
            <IssuesSection />
          </AdminSectionShell>
        }
      />
      <Route
        path="models"
        element={
          <AdminSectionShell sectionKey="models">
            <ModelsSection />
          </AdminSectionShell>
        }
      />
      <Route
        path="reports"
        element={
          <AdminSectionShell sectionKey="reports">
            <ReportsSection />
          </AdminSectionShell>
        }
      />
      <Route
        path="logs"
        element={
          <AdminSectionShell sectionKey="logs">
            <LogsSection />
          </AdminSectionShell>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
    </Routes>
  );
}