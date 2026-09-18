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
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";

import {
  FINISHED_ISSUE_CARD_HEIGHT,
  FinishedIssueCard,
  getFinishedTopAlternativesWidgetSx,
} from "../styles/finishedIssues.styles";

const FinishedIssueTopAlternatives = ({ topAlternatives = [] }) => {
  const theme = useTheme();
  const alternatives = Array.isArray(topAlternatives)
    ? topAlternatives.slice(0, 3)
    : [];

  return (
    <Box
      component="section"
      aria-label="Top alternatives"
      sx={getFinishedTopAlternativesWidgetSx()}
    >
      <Stack
        direction="row"
        spacing={0.55}
        alignItems="center"
        sx={{ mb: 0.6, pl: 0.1 }}
      >
        <EmojiEventsOutlinedIcon
          sx={{
            fontSize: 15,
            color: alpha(theme.palette.success.light, 0.78),
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.common.white, 0.62),
            fontWeight: 950,
            letterSpacing: 0.35,
            textTransform: "uppercase",
          }}
        >
          Top alternatives
        </Typography>
      </Stack>

      {alternatives.length ? (
        <Stack
          component="ol"
          role="list"
          spacing={{ xs: 0.48, sm: 0.62 }}
          sx={{ m: 0, p: 0, listStyle: "none" }}
        >
          {alternatives.map((alternative, index) => {
            const rank = Number.isFinite(Number(alternative?.rank))
              ? Number(alternative.rank)
              : index + 1;
            const name = alternative?.name || "Unnamed alternative";
            const isFirst = rank === 1;
            const isSecond = rank === 2;

            return (
              <Box
                component="li"
                role="listitem"
                key={`${alternative?.alternativeId || name}-${rank}`}
              >
                <Stack direction="row" spacing={0.65} alignItems="baseline">
                  <Typography
                    variant="caption"
                    sx={{
                      flex: "0 0 auto",
                      minWidth: 20,
                      px: 0.35,
                      py: 0.08,
                      borderRadius: 1,
                      bgcolor: isFirst
                        ? alpha(theme.palette.success.main, 0.13)
                        : isSecond
                          ? alpha(theme.palette.common.white, 0.045)
                          : "transparent",
                      color: isFirst
                        ? alpha(theme.palette.success.light, 0.96)
                        : isSecond
                          ? alpha(theme.palette.common.white, 0.68)
                          : alpha(theme.palette.common.white, 0.52),
                      fontWeight: 950,
                      textAlign: "center",
                    }}
                  >
                    #{rank}
                  </Typography>

                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      color: alpha(theme.palette.common.white, isFirst ? 0.94 : 0.76),
                      fontWeight: isFirst ? 900 : 800,
                    }}
                  >
                    {name}
                  </Typography>
                </Stack>

              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.65}
          sx={{
            minHeight: 20,
            pl: 0.1,
            color: alpha(theme.palette.common.white, 0.46),
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: alpha(theme.palette.common.white, 0.34),
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            Ranking unavailable
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

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

        <FinishedIssueTopAlternatives topAlternatives={issue?.topAlternatives} />
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
