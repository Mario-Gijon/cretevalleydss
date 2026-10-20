import {
  Stack,
  Typography,
  Box,
  Tooltip,
  Divider,
  Grid,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { resolveResultPresentation } from "../../finishedIssueDialog/resultPresentations/registry.js";

import {
  FINISHED_ISSUE_CARD_HEIGHT,
  FinishedIssueCard,
} from "../styles/finishedIssues.styles";

const formatFinishedDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const FinishedIssueFooterItem = ({ icon, label, value, desktopAlign }) => (
  <Stack
    spacing={0.2}
    sx={{
      minWidth: 0,
      justifySelf: {
        xs: "start",
        sm: desktopAlign,
      },
    }}
  >
    <Stack direction="row" spacing={0.55} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ color: alpha("#fff", 0.48), lineHeight: 0 }}>{icon}</Box>
      <Typography
        variant="caption"
        noWrap
        sx={{
          display: "block",
          color: alpha("#fff", 0.46),
          fontSize: 10,
          fontWeight: 850,
          letterSpacing: 0.18,
        }}
      >
        {label}
      </Typography>
    </Stack>
    <Typography
      variant="caption"
      noWrap
      title={value}
      sx={{
        display: "block",
        color: alpha("#fff", 0.8),
        fontWeight: 900,
      }}
    >
      {value}
    </Typography>
  </Stack>
);

const FinishedIssueFooter = ({ issue }) => (
  <Box
    component="footer"
    data-testid="finished-issue-footer"
    sx={{ pt: 0.85 }}
  >
    <Divider
      sx={{
        opacity: 0.14,
        mb: 0.9,
        borderColor: alpha("#fff", 0.12),
      }}
    />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(3, minmax(0, 1fr))",
        },
        rowGap: { xs: 0.8, sm: 0 },
      }}
    >
      <FinishedIssueFooterItem
        icon={<CalendarMonthIcon sx={{ fontSize: 14 }} />}
        label="Created"
        value={issue?.creationDate || "—"}
        desktopAlign="start"
      />
      <FinishedIssueFooterItem
        icon={<AssignmentTurnedInIcon sx={{ fontSize: 14 }} />}
        label="Expected finish"
        value={issue?.closureDate || "—"}
        desktopAlign="center"
      />
      <FinishedIssueFooterItem
        icon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
        label="Finished"
        value={formatFinishedDate(issue?.finishedAt)}
        desktopAlign="end"
      />
    </Box>
  </Box>
);

const FinishedIssueCardContent = ({ issue, accent, onOpenDetails }) => {
  const theme = useTheme();
  const resultPresentation = resolveResultPresentation(issue || {}).presentation;
  const SummaryComponent = resultPresentation?.FinishedIssueCardSummaryComponent;

  return (
    <Box
      onClick={() => onOpenDetails(issue)}
      sx={{
        cursor: "pointer",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        p: 2,
        pl: 2.35,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: accent,
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(560px 240px at 0% 0%, ${alpha(
              accent,
              0.14
            )}, transparent 52%),
            radial-gradient(520px 220px at 0% 0%, ${alpha(
              theme.palette.secondary.main,
              0.05
            )}, transparent 58%)
          `,
        }}
      />

      <Stack
        spacing={1.05}
        sx={{ position: "relative", zIndex: 1, minHeight: 0 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 980,
              lineHeight: 1.12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
            title={issue?.name || ""}
          >
            {issue?.name || "—"}
          </Typography>

          {issue?.isIssueOwner ? (
            <Tooltip title="You are the owner" placement="top" arrow>
              <Box
                sx={{
                  mt: 0.25,
                  color: alpha(theme.palette.common.white, 0.78),
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 2,
                  p: 0.55,
                  lineHeight: 0,
                }}
              >
                <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />
              </Box>
            </Tooltip>
          ) : null}
        </Stack>

        <Typography
          variant="body2"
          data-testid="finished-issue-description"
          title={issue?.description || ""}
          sx={{
            color: alpha(theme.palette.common.white, 0.72),
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            minHeight: 42,
            fontWeight: 850,
          }}
        >
          {issue?.description || "—"}
        </Typography>

        {SummaryComponent ? <SummaryComponent issue={issue} /> : (
          <Box component="section" aria-label="Result summary">
            <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.5), fontWeight: 800 }}>
              Result presentation unavailable
            </Typography>
          </Box>
        )}
      </Stack>

      <Box sx={{ mt: "auto", position: "relative", zIndex: 1 }}>
        <FinishedIssueFooter issue={issue} />
      </Box>
    </Box>
  );
};

/**
 * Renderiza la grilla de tarjetas de issues finalizados.
 *
 * Mantiene el mismo diseño visual existente para desktop y móvil.
 *
 * @param {Object} props Props del componente.
 * @param {Array} props.issues Lista de issues a mostrar.
 * @param {boolean} props.isLgUp Si está en breakpoint grande.
 * @param {boolean} props.isMobile Si está en viewport móvil.
 * @param {Function} props.onOpenDetails Acción para abrir detalle.
 * @returns {JSX.Element}
 */
const FinishedIssuesCards = ({
  issues,
  isLgUp,
  isMobile,
  onOpenDetails,
}) => {
  const theme = useTheme();
  const accent = alpha(theme.palette.success.main, 0.92);

  if (isLgUp) {
    return (
      <Grid container spacing={2}>
        {issues.map((issue) => (
          <Grid item xs={12} md={6} xl={4} key={issue.id}>
            <FinishedIssueCard
              elevation={0}
              sx={{ height: FINISHED_ISSUE_CARD_HEIGHT }}
            >
              <FinishedIssueCardContent
                issue={issue}
                accent={accent}
                onOpenDetails={onOpenDetails}
              />
            </FinishedIssueCard>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      {issues.map((issue) => (
        <Grid item xs={12} md={6} key={issue.id}>
          <FinishedIssueCard
            elevation={0}
            sx={{ height: isMobile ? "auto" : FINISHED_ISSUE_CARD_HEIGHT }}
          >
            <FinishedIssueCardContent
              issue={issue}
              accent={accent}
              onOpenDetails={onOpenDetails}
            />
          </FinishedIssueCard>
        </Grid>
      ))}
    </Grid>
  );
};

export default FinishedIssuesCards;
