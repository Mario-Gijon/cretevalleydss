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

import ActiveIssuesPill from "../../activeIssues/components/ActiveIssuesPill";
import {
  FINISHED_ISSUE_CARD_HEIGHT,
  FinishedIssueCard,
} from "../styles/finishedIssues.styles";

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

  if (isLgUp) {
    return (
      <Grid container spacing={2}>
        {issues.map((issue) => {
          const accent = alpha(theme.palette.success.main, 0.92);

          return (
            <Grid item xs={12} md={6} xl={4} key={issue.id}>
              <FinishedIssueCard elevation={0} sx={{ height: FINISHED_ISSUE_CARD_HEIGHT }}>
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
                    sx={{ position: "relative", zIndex: 1, minHeight: 0, flex: 1 }}
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

                      {issue?.isAdmin ? (
                        <Tooltip title="You are the admin" placement="top" arrow>
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

                    <Box sx={{ mt: 0.2 }}>
                      <ActiveIssuesPill tone="success">Finished</ActiveIssuesPill>
                    </Box>

                    <Divider
                      sx={{
                        opacity: 0.14,
                        my: 0.7,
                        borderColor: alpha("#fff", 0.12),
                      }}
                    />

                    <Stack spacing={0.55}>
                      <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                        <CalendarMonthIcon sx={{ fontSize: 16, opacity: 0.75 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 900,
                            color: alpha(theme.palette.common.white, 0.78),
                          }}
                        >
                          Created: {issue?.creationDate || "—"}
                        </Typography>
                      </Stack>

                      {issue?.closureDate ? (
                        <Stack
                          direction="row"
                          spacing={0.6}
                          sx={{ alignItems: "center" }}
                        >
                          <AssignmentTurnedInIcon sx={{ fontSize: 16, opacity: 0.75 }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 900,
                              color: alpha(theme.palette.common.white, 0.78),
                            }}
                          >
                            Closed: {issue?.closureDate}
                          </Typography>
                        </Stack>
                      ) : null}
                    </Stack>

                    <Box sx={{ flex: 1 }} />
                  </Stack>
                </Box>
              </FinishedIssueCard>
            </Grid>
          );
        })}
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
                  bgcolor: alpha(theme.palette.success.main, 0.92),
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: `radial-gradient(560px 240px at 0% 0%, ${alpha(
                    theme.palette.success.main,
                    0.14
                  )}, transparent 52%)`,
                }}
              />

              <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1 }}>
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
                  >
                    {issue?.name || "—"}
                  </Typography>

                  {issue?.isAdmin ? (
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
                  ) : null}
                </Stack>

                <Typography
                  variant="body2"
                  sx={{
                    color: alpha(theme.palette.common.white, 0.72),
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                    fontWeight: 850,
                  }}
                >
                  {issue?.description || "—"}
                </Typography>

                <Divider
                  sx={{
                    opacity: 0.14,
                    my: 0.7,
                    borderColor: alpha("#fff", 0.12),
                  }}
                />

                <Box>
                  <ActiveIssuesPill tone="success">Finished</ActiveIssuesPill>
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 900,
                    color: alpha(theme.palette.common.white, 0.78),
                  }}
                >
                  Created: {issue?.creationDate || "—"}
                </Typography>

                {issue?.closureDate ? (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 900,
                      color: alpha(theme.palette.common.white, 0.78),
                    }}
                  >
                    Closed: {issue?.closureDate}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </FinishedIssueCard>
        </Grid>
      ))}
    </Grid>
  );
};

export default FinishedIssuesCards;
