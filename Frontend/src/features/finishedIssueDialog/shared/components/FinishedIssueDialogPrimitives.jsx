import { Box, Stack, Typography, Avatar, ListItemButton, Collapse } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import { GlassPaper } from "../../../../components/StyledComponents/GlassPaper";
import {
  getFinishedIssueDialogAuroraBg,
  getFinishedIssueDialogGlassSx,
} from "../../styles/finishedIssueDialog.styles";

/**
 * Pill visual reutilizable para estados en el dialogo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const Pill = ({ tone = "success", children }) => {
  const theme = useTheme();

  const map = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    secondary: theme.palette.secondary.main,
  };

  const color = map[tone] || theme.palette.info.main;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.2,
        py: 0.55,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color,
        fontSize: 12,
        fontWeight: 950,
        width: "fit-content",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.10)}`,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: alpha(color, 0.85),
        }}
      />
      <span>{children}</span>
    </Box>
  );
};

/**
 * Card base de seccion del dialogo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const SectionCard = ({ title, icon, right, children, sx }) => {
  const theme = useTheme();

  return (
    <GlassPaper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: { xs: 1.5, md: 2 },
        ...getFinishedIssueDialogGlassSx(theme),
        ...getFinishedIssueDialogAuroraBg(theme, 0.08),
        position: "relative",
        overflow: "hidden",
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(
            theme.palette.common.white,
            0.1
          )}, transparent 15%)`,
          opacity: 0.22,
        },
        ...(sx || {}),
      }}
    >
      {(title || right) && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25, position: "relative", zIndex: 1 }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            {icon ? (
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {icon}
              </Avatar>
            ) : null}

            {title ? (
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 980, lineHeight: 1, whiteSpace: "nowrap" }}
              >
                {title}
              </Typography>
            ) : null}
          </Stack>

          {right ? <Box sx={{ position: "relative", zIndex: 1 }}>{right}</Box> : null}
        </Stack>
      )}

      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
    </GlassPaper>
  );
};

/**
 * Fila simple label/valor.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const Row = ({ label, value }) => (
  <Stack direction="row" spacing={1}>
    <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
      {label}:
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 850,
        color: "text.primary",
        wordBreak: "break-word",
      }}
    >
      {value ?? "—"}
    </Typography>
  </Stack>
);

/**
 * Fila desplegable usada en Summary y Models.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const SummaryAccordionRow = ({
  label,
  open,
  onToggle,
  right,
  children,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <ListItemButton
        disableGutters
        onClick={onToggle}
        sx={{
          px: 0,
          py: 0.45,
          borderRadius: 1.25,
          bgcolor: "transparent",
          "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.04) },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
            {label}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {right ? <Box sx={{ mr: 0.5 }}>{right}</Box> : null}

          <Box sx={{ opacity: 0.85 }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        </Stack>
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pt: 0.6 }}>
          <Stack direction="row" alignItems="flex-start" pl={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
