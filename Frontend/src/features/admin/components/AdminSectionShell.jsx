import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Avatar, Box, Divider, IconButton, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import AdminTag from "./AdminTag";
import { findAdminSectionByKey } from "../utils/adminSections";
import { getAdminPanelSx, getAdminToneColor } from "../styles/admin.styles";

/**
 * Contenedor visual para renderizar una seccion de admin.
 *
 * @param {object} props
 * @param {string} props.sectionKey
 * @param {*} props.children
 * @returns {JSX.Element}
 */
const AdminSectionShell = ({ sectionKey, children }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const section = useMemo(() => findAdminSectionByKey(sectionKey), [sectionKey]);
  const accent = getAdminToneColor(theme, section?.tone || "info");

  if (!section) return <Navigate to="/dashboard/admin" replace />;

  return (
    <Box sx={{ maxWidth: 2300, mx: "auto", px: { xs: 1.5, md: 2.5 }, pt: 2, pb: 3 }}>
      <Paper elevation={0} sx={{ ...getAdminPanelSx(theme, 0.14), p: { xs: 1.6, md: 2.0 } }}>
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

            <AdminTag tone={section.tone}>{section.group}</AdminTag>
          </Stack>

          <Divider sx={{ opacity: 0.14, my: 1.6 }} />

          <Box>{children}</Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminSectionShell;
