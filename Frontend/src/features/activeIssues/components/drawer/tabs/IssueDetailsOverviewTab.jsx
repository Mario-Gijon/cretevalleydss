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
import ActiveIssuesPill from "../../shared/ActiveIssuesPill";
import { getIssueDetailsDrawerPanelSx } from "../shell/IssueDetailsDrawer.styles";
import {
  IssueDetailsDrawerKeyValueRow,
} from "../shell/IssueDetailsDrawer.parts";
import IssueParticipationChart from "../../shared/IssueParticipationChart";
import { IssueModelParametersView } from "../../../../modelParameters";

const CRITERIA_WEIGHTING_STRUCTURE_LABELS = {
  manualCriteriaWeights: "Manual criteria weights",
  bestWorstCriteria: "BWM",
};

const ALTERNATIVE_STRUCTURE_LABELS = {
  alternativeCriteriaMatrix: "Alternative-criteria matrix",
  alternativePairwiseByCriterion: "Pairwise alternatives by criterion",
};

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
  leafNames,
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
  const isAdminUser = Boolean(selectedIssue?.isAdmin);

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

        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }} />
      </Box>

      {isAdminUser ? (
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
              </Stack>
            </Box>
          </Stack>

          <Stack width="100%">
            <Box
              sx={{
                ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }),
                p: 1.75,
                height: "100%",
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
                  disabled={!cComputeW}
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
                  disabled={!cResolve}
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
      ) : (
        <Stack spacing={1} sx={{ width: "100%" }}>
          <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 1 }}>
              Actions
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <LoadingButton
                variant="outlined"
                color="info"
                startIcon={<FactCheckIcon />}
                disabled={!cEvalA}
                onClick={() => {
                  setIsRatingAlternatives(true);
                  if (isMobile) onMinimize?.();
                }}
                sx={{ flex: 1 }}
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
                sx={{ flex: 1 }}
              >
                Evaluate weights
              </LoadingButton>

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
                sx={{ flex: 1 }}
              >
                Leave issue
              </LoadingButton>
            </Stack>
          </Box>
        </Stack>
      )}

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
              k="Criteria weighting structure"
              v={
                CRITERIA_WEIGHTING_STRUCTURE_LABELS[
                  selectedIssue?.criteriaWeightingStructureKey
                ] || selectedIssue?.criteriaWeightingStructureKey || "—"
              }
            />
            <IssueDetailsDrawerKeyValueRow
              k="Alternative evaluation structure"
              v={
                ALTERNATIVE_STRUCTURE_LABELS[
                  selectedIssue?.alternativeEvaluationStructureKey
                ] || selectedIssue?.alternativeEvaluationStructureKey || "—"
              }
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
          <IssueModelParametersView
            parameters={selectedIssue?.model?.parameters || []}
            values={selectedIssue?.modelParameters || selectedIssue?.ui?.modelParameters || {}}
            leafNames={leafNames}
          />
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
          <Grid item xs={12} md={5}>
            <Stack
              sx={{
                borderRadius: 3,
                height: "100%",
                bgcolor: alpha(theme.palette.text.primary, 0.02),
                border: "1px solid rgba(255,255,255,0.08)",
                p: 1.25,
              }}
              justifyContent={"center"}
              alignItems={"center"}
            >
              <IssueParticipationChart
                total={totalExperts}
                participated={participatedExperts}
                notEvaluated={notEvaluatedExperts}
                pending={pendingExperts}
                declined={declinedExperts}
                size={140}
              />
            </Stack>
          </Grid>

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
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Stack>
  );
};

export default IssueDetailsOverviewTab;
