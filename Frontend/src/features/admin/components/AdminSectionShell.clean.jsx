import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Avatar, Box, Divider, IconButton, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import AdminTag from "./AdminTag";
import { findAdminSectionByKey } from "../adminSections";
import { getAdminToneColor } from "../styles/admin.styles";

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
      <Stack spacing={1.6}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
            <IconButton
              onClick={() => navigate("/dashboard/admin")}
              sx={{
                width: 40,
                height: 40,
                border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                bgcolor: alpha(theme.palette.common.white, 0.04),
                "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.08) },
              }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: alpha(accent, 0.12),
                color: accent,
                border: `1px solid ${alpha(accent, 0.22)}`,
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

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.1) }} />

        <Box>{children}</Box>
      </Stack>
    </Box>
  );
};

export default AdminSectionShell;
