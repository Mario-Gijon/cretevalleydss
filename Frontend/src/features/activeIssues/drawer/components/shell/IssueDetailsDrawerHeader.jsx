import { Box, Grid, IconButton, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import { stageLabel } from "../../../utils/activeIssues.meta";
import ActiveIssuesPill from "../../../components/shared/ActiveIssuesPill";
import ActiveIssuesTinyStat from "../../../components/shared/ActiveIssuesTinyStat";
import { getIssueDetailsDrawerCrystalBorder } from "./IssueDetailsDrawer.parts";

/**
 * Cabecera principal del drawer de detalles del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.selectedIssue Issue seleccionado.
 * @param {number} props.alternativesCount Número de alternativas.
 * @param {number} props.criteriaCount Número de criterios hoja.
 * @param {number} props.totalExperts Número total de expertos.
 * @param {string} props.deadlineLabel Fecha límite visible.
 * @param {Function} props.onClose Acción de cierre.
 * @returns {JSX.Element}
 */
const IssueDetailsDrawerHeader = ({
  selectedIssue,
  alternativesCount,
  criteriaCount,
  totalExperts,
  deadlineLabel,
  onClose,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 2.5,
        pb: 2,
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(1200px 500px at 10% 0%, ${alpha(
          theme.palette.info.main,
          0.18
        )}, transparent 60%),
                     radial-gradient(900px 420px at 90% 20%, ${alpha(
                       theme.palette.secondary.main,
                       0.18
                     )}, transparent 55%)`,
        ...getIssueDetailsDrawerCrystalBorder(),
        borderLeft: "none",
        borderRight: "none",
        borderTop: "none",
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Stack spacing={0.7} sx={{ minWidth: 0 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 980,
              lineHeight: 1.12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedIssue?.name}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
          >
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 900 }}
            >
              {selectedIssue?.model?.name}
            </Typography>

            <ActiveIssuesPill tone={selectedIssue?.isAdmin ? "warning" : "info"}>
              {selectedIssue?.isAdmin ? "Admin" : "Expert"}
            </ActiveIssuesPill>

            <ActiveIssuesPill tone="info">
              {stageLabel(selectedIssue?.currentStage)}
            </ActiveIssuesPill>

            {selectedIssue?.isConsensus ? (
              <ActiveIssuesPill tone="info">Consensus</ActiveIssuesPill>
            ) : null}
          </Stack>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{ bgcolor: alpha(theme.palette.text.primary, 0.06) }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      <Grid container spacing={1.1} sx={{ mt: 2 }}>
        <Grid item xs={6} sm={3}>
          <ActiveIssuesTinyStat
            icon={<ViewListIcon fontSize="small" />}
            label="Alternatives"
            value={alternativesCount}
            tone="info"
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <ActiveIssuesTinyStat
            icon={<CategoryIcon fontSize="small" />}
            label="Criteria"
            value={criteriaCount}
            tone="info"
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <ActiveIssuesTinyStat
            icon={<PeopleAltIcon fontSize="small" />}
            label="Experts"
            value={totalExperts}
            tone="warning"
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <ActiveIssuesTinyStat
            icon={<TimelineIcon fontSize="small" />}
            label="Deadline"
            value={deadlineLabel}
            tone={deadlineLabel && deadlineLabel !== "—" ? "warning" : "success"}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default IssueDetailsDrawerHeader;