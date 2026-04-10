import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { alpha, useTheme } from "@mui/material/styles";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalculateIcon from "@mui/icons-material/Calculate";
import GavelIcon from "@mui/icons-material/Gavel";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { stageLabel } from "../../../utils/activeIssues.meta";
import ActiveIssuesPill from "../../../components/shared/ActiveIssuesPill";
import { ExpertParticipationChart } from "../../../../../components/ExpertParticipationChart/ExpertParticipationChart";
import {
  getIssueDetailsDrawerPanelSx,
  IssueDetailsDrawerKeyValueRow,
} from "../shell/IssueDetailsDrawer.parts";

/**
 * Pestaña Overview del drawer de detalles del issue.
 *
 * Agrupa el resumen principal, acciones disponibles,
 * datos generales, parámetros del modelo y participación.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const IssueDetailsOverviewTab = ({
  selectedIssue,
  drawerAction,
  DrawerActionIcon,
  deadlineLabel,
  modelParamsList,
  totalExperts,
  pendingExperts,
  participatedExperts,
  notEvaluatedExperts,
  declinedExperts,
  cEvalA,
  cEvalW,
  cComputeW,
  cResolve,
  busy,
  openConfirm,
  handleLeaveIssue,
  handleComputeWeights,
  handleResolveIssue,
  handleRemoveIssue,
  setIsRatingAlternatives,
  setIsRatingWeights,
  isMobile,
  onMinimize,
}) => {
  const theme = useTheme();

  return (
    <Stack spacing={2}>
      <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.85 }}>
          <ActiveIssuesPill tone={drawerAction?.tone || "info"}>
            {drawerAction?.title || "—"}
          </ActiveIssuesPill>

          <Box sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}>
            {DrawerActionIcon ? (
              <DrawerActionIcon fontSize="small" />
            ) : (
              <InfoOutlinedIcon fontSize="small" />
            )}
          </Box>
        </Stack>

        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          {/* espacio reservado para una posible descripción futura */}
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Stack width="100%">
          <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75, height: "100%" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 1 }}>
              Expert actions
            </Typography>

            <Stack spacing={1}>
              <LoadingButton
                variant="outlined"
                color="info"
                startIcon={<FactCheckIcon />}
                disabled={!cEvalA}
                onClick={() => {
                  setIsRatingAlternatives(true);
                  if (isMobile) onMinimize?.();
                }}
              >
                Evaluate alternatives
              </LoadingButton>

              <LoadingButton
                variant="outlined"
                color="info"
                startIcon={<FactCheckIcon />}
                disabled={!cEvalW}
                onClick={() => {
                  setIsRatingWeights(true);
                  if (isMobile) onMinimize?.();
                }}
              >
                Evaluate weights
              </LoadingButton>

              {!selectedIssue?.isAdmin ? (
                <LoadingButton
                  variant="outlined"
                  color="error"
                  startIcon={<LogoutIcon />}
                  loading={busy.leave}
                  onClick={() =>
                    openConfirm({
                      title: "Leave issue",
                      description: "You will stop participating in this issue.",
                      confirmText: "Leave",
                      tone: "error",
                      action: handleLeaveIssue,
                    })
                  }
                >
                  Leave issue
                </LoadingButton>
              ) : null}
            </Stack>
          </Box>
        </Stack>

        <Stack width="100%">
          <Box
            sx={{
              ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }),
              p: 1.75,
              height: "100%",
              opacity: selectedIssue?.isAdmin ? 1 : 0.55,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 1 }}>
              Admin actions
            </Typography>

            <Stack spacing={1}>
              <LoadingButton
                variant="outlined"
                color="warning"
                startIcon={<CalculateIcon />}
                disabled={!selectedIssue?.isAdmin || !cComputeW}
                loading={busy.compute}
                onClick={() =>
                  openConfirm({
                    title: "Compute weights",
                    description:
                      "This will compute the final criteria weights and move the issue forward.",
                    confirmText: "Compute",
                    tone: "warning",
                    action: handleComputeWeights,
                  })
                }
              >
                Compute weights
              </LoadingButton>

              <LoadingButton
                variant="outlined"
                color="warning"
                startIcon={<GavelIcon />}
                disabled={!selectedIssue?.isAdmin || !cResolve}
                loading={busy.resolve}
                onClick={() =>
                  openConfirm({
                    title: "Resolve issue",
                    description: "This will run the model and move the issue forward.",
                    confirmText: "Resolve",
                    tone: "warning",
                    action: handleResolveIssue,
                  })
                }
              >
                Resolve
              </LoadingButton>

              <LoadingButton
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                disabled={!selectedIssue?.isAdmin}
                loading={busy.remove}
                onClick={() =>
                  openConfirm({
                    title: "Remove issue",
                    description: "This will permanently remove the issue and its data.",
                    confirmText: "Remove",
                    tone: "error",
                    action: handleRemoveIssue,
                  })
                }
              >
                Remove issue
              </LoadingButton>
            </Stack>
          </Box>
        </Stack>
      </Stack>

      <Accordion
        disableGutters
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: alpha(theme.palette.background.paper, 0.10),
          boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
          border: "1px solid rgba(255,255,255,0.1)",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
            <InfoOutlinedIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
              Issue info
            </Typography>
          </Stack>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1.1}>
            <IssueDetailsDrawerKeyValueRow k="Creator" v={selectedIssue?.creator} />
            <IssueDetailsDrawerKeyValueRow k="Description" v={selectedIssue?.description} />
            <IssueDetailsDrawerKeyValueRow k="Creation date" v={selectedIssue?.creationDate} />
            <IssueDetailsDrawerKeyValueRow k="Closure date" v={deadlineLabel} />
            <IssueDetailsDrawerKeyValueRow
              k="Stage"
              v={stageLabel(selectedIssue?.currentStage)}
            />
            <IssueDetailsDrawerKeyValueRow
              k="Weighting mode"
              v={selectedIssue?.weightingMode}
            />
            <IssueDetailsDrawerKeyValueRow
              k="Consensus"
              v={String(Boolean(selectedIssue?.isConsensus))}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        elevation={0}
        defaultExpanded={false}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: alpha(theme.palette.background.paper, 0.10),
          boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
          border: "1px solid rgba(255,255,255,0.1)",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
            <InfoOutlinedIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
              Model parameters
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 900,
                maxWidth: 240,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={selectedIssue?.model?.name || ""}
            >
              {selectedIssue?.model?.name || "—"}
            </Typography>
          </Stack>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          {modelParamsList.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No model parameters defined for this issue.
            </Typography>
          ) : (
            <Stack spacing={1.05}>
              {modelParamsList.map((row) => (
                <IssueDetailsDrawerKeyValueRow key={row.k} k={row.k} v={row.v} />
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <PeopleAltIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Participation
          </Typography>
          <Box sx={{ flex: 1 }} />
          <ActiveIssuesPill tone="info">{totalExperts} experts</ActiveIssuesPill>
        </Stack>

        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={7}>
            <Box
              sx={{
                borderRadius: 3,
                height: "100%",
                bgcolor: alpha(theme.palette.text.primary, 0.02),
                border: "1px solid rgba(255,255,255,0.08)",
                p: 1.25,
              }}
            >
              <ExpertParticipationChart
                total={totalExperts}
                participated={participatedExperts}
                notEvaluated={notEvaluatedExperts}
                pending={pendingExperts}
                declined={declinedExperts}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box
              sx={{
                borderRadius: 3,
                height: "100%",
                bgcolor: alpha(theme.palette.text.primary, 0.02),
                border: "1px solid rgba(255,255,255,0.08)",
                p: 1.25,
              }}
            >
              <List disablePadding dense>
                {[
                  { label: "Participated", value: participatedExperts, tone: "success" },
                  {
                    label: "Accepted (not evaluated)",
                    value: notEvaluatedExperts,
                    tone: "info",
                  },
                  { label: "Pending invitations", value: pendingExperts, tone: "warning" },
                  { label: "Declined", value: declinedExperts, tone: "error" },
                ].map((row) => (
                  <ListItem
                    key={row.label}
                    disableGutters
                    sx={{
                      py: 0.7,
                      px: 0.5,
                      borderRadius: 2,
                      "&:not(:last-of-type)": {
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 900, color: "text.secondary" }}
                        >
                          {row.label}
                        </Typography>
                      }
                    />
                    <ActiveIssuesPill tone={row.tone}>{row.value}</ActiveIssuesPill>
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                  Total: {totalExperts}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Stack>
  );
};

export default IssueDetailsOverviewTab;