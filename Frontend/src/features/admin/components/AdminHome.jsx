import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Divider, Grid, Paper, Stack, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import AdminTag from "./AdminTag";
import {
  getAdminPanelSx,
  getAdminSectionCardSx,
  getAdminToneColor,
} from "../styles/admin.styles";
import { ADMIN_SECTIONS } from "../utils/adminSections";

/**
 * Pantalla principal del modulo admin con acceso a secciones.
 *
 * @returns {JSX.Element}
 */
const AdminHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const groups = useMemo(() => {
    const groupMap = new Map();

    ADMIN_SECTIONS.forEach((section) => {
      if (!groupMap.has(section.group)) groupMap.set(section.group, []);
      groupMap.get(section.group).push(section);
    });

    return Array.from(groupMap.entries());
  }, []);

  return (
    <Box sx={{ maxWidth: 2100, mx: "auto", px: { xs: 1.5, md: 2.5 }, pt: 2, pb: 3 }}>
      <Paper elevation={0} sx={{ ...getAdminPanelSx(theme, 0.16), p: { xs: 1.6, md: 2.0 }, mb: 2 }}>
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.1} alignItems="flex-start" sx={{ mb: 0.8 }}>
            <Avatar
              sx={{
                width: 45,
                height: 45,
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: "secondary.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <AdminPanelSettingsIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 980, fontSize: 45, lineHeight: 1.05, whiteSpace: "nowrap" }}>
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
              <AdminTag tone="info">{items.length}</AdminTag>
            </Stack>

            <Grid container spacing={1.5}>
              {items.map((section) => {
                const accent = getAdminToneColor(theme, section.tone);

                return (
                  <Grid key={section.key} item xs={12} sm={6} lg={4}>
                    <Paper elevation={0} sx={getAdminSectionCardSx(theme)} onClick={() => navigate(section.key)}>
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
                            {section.icon}
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
                                {section.title}
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
                              {section.desc}
                            </Typography>

                            <Box sx={{ mt: 1 }}>
                              <AdminTag tone={section.tone}>{section.group}</AdminTag>
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
};

export default AdminHome;
