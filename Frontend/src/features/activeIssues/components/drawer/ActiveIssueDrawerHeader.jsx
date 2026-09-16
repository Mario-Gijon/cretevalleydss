import { Box, IconButton, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import ActiveIssuesPill from "../ActiveIssuesPill";
import ActiveIssuesTinyStat from "../ActiveIssuesTinyStat";
import { getIssueDetailsDrawerCrystalBorder } from "../../styles/ActiveIssueDrawer.styles";

/**
 * Cabecera principal del drawer de detalles del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.selectedIssue Issue seleccionado.
 * @param {number} props.alternativesCount Número de alternativas.
 * @param {number} props.criteriaCount Número de criterios hoja.
 * @param {number} props.totalExperts Número total de expertos.
 * @param {string} props.deadlineLabel Fecha de finalización esperada visible.
 * @param {Function} props.onClose Acción de cierre.
 * @returns {JSX.Element}
 */
const ActiveIssueDrawerHeader = ({
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
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <ActiveIssuesPill tone={selectedIssue?.isIssueOwner ? "warning" : "info"}>
              {selectedIssue?.isIssueOwner ? "Owner" : "Expert"}
            </ActiveIssuesPill>

            {selectedIssue?.isConsensus ? (
              <ActiveIssuesPill tone="info">Consensus</ActiveIssuesPill>
            ) : null}
          </Stack>
        </Stack>

        <IconButton
          aria-label="Close issue details"
          onClick={onClose}
          sx={{ bgcolor: alpha(theme.palette.text.primary, 0.06) }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          mt: 2,
          display: { xs: "none", sm: "grid" },
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr)) minmax(0, 1.3fr)",
          },
          gap: 1.1,
          alignItems: "stretch",
        }}
      >
        <ActiveIssuesTinyStat
          compact
          icon={<ViewListIcon fontSize="small" />}
          label="Alternatives"
          value={alternativesCount}
          tone="info"
        />

        <ActiveIssuesTinyStat
          compact
          icon={<CategoryIcon fontSize="small" />}
          label="Criteria"
          value={criteriaCount}
          tone="info"
        />

        <ActiveIssuesTinyStat
          compact
          icon={<PeopleAltIcon fontSize="small" />}
          label="Experts"
          value={totalExperts}
          tone="warning"
        />

        <ActiveIssuesTinyStat
          icon={<TimelineIcon fontSize="small" />}
          label="Expected finalization"
          value={deadlineLabel}
          tone="info"
        />
      </Box>
    </Box>
  );
};

export default ActiveIssueDrawerHeader;
