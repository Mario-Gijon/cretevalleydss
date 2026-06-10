import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import {
  count,
  formatBoolean,
  getCatalogVisibilityLabel,
  getModelDisplayName,
  toTitle,
  valueToText,
} from "../utils/modelManifest.formatters";
import {
  getSeverityForSyncState,
  getSyncState,
} from "../utils/modelManifest.severity";
import EmptyState from "./EmptyState";
import FieldGrid from "./FieldGrid";
import ParametersTable from "./ParametersTable";
import SectionCard from "./SectionCard";
import StatusChip from "./StatusChip";
import TechnicalDifferencesList from "./TechnicalDifferencesList";

export default function ModelDetailDialog({ row, open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!row) return null;

  const syncState = getSyncState(row);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.96),
          backgroundImage: `radial-gradient(760px 320px at 0% 0%, ${alpha(
            theme.palette.info.main,
            0.12
          )}, transparent 56%)`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Stack spacing={0.7} sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 980, overflowWrap: "anywhere" }}>
              {getModelDisplayName(row)}
            </Typography>
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              <StatusChip label={row.apiModelKey || "No key"} />
              <StatusChip
                label={row.isIssueModel ? "Issue model" : "Non-issue model"}
                severity={row.isIssueModel ? "success" : "info"}
              />
              <StatusChip label={toTitle(row.lifecycleKind)} />
              <StatusChip label={syncState} severity={getSeverityForSyncState(syncState)} />
            </Stack>
          </Stack>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }}>
        <Stack spacing={1.25}>
          <SectionCard title="General">
            <FieldGrid
              rows={[
                { label: "Key", value: row.apiModelKey },
                { label: "Mongo name", value: row.mongoName },
                { label: "Mongo id", value: row.mongoId },
                { label: "Lifecycle", value: toTitle(row.lifecycleKind) },
                { label: "Issue model", value: formatBoolean(row.isIssueModel) },
                { label: "Create Issue visibility", value: getCatalogVisibilityLabel(row) },
                { label: "Safe to create IssueModel", value: formatBoolean(row.safeToCreateIssueModel) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Capabilities">
            <FieldGrid
              rows={[
                {
                  label: "Alternative structure",
                  value: toTitle(row.alternativeEvaluationStructureKey),
                },
                {
                  label: "Uses criteria weights",
                  value: formatBoolean(row.usesCriteriaWeights),
                },
                {
                  label: "Uses fuzzy criteria weights",
                  value: formatBoolean(row.usesFuzzyCriteriaWeights),
                },
                {
                  label: "Uses criterion types",
                  value: formatBoolean(row.usesCriterionTypes),
                },
                { label: "Consensus", value: formatBoolean(row.isConsensus) },
                { label: "Multi criteria", value: formatBoolean(row.isMultiCriteria) },
                { label: "Input format", value: row.apiInputFormat },
                { label: "Output format", value: row.apiOutputFormat },
                { label: "Supported domains", value: valueToText(row.supportedDomains) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Endpoint">
            <FieldGrid
              rows={[
                { label: "Method", value: row.endpoint?.method },
                { label: "Path", value: row.endpoint?.path },
                { label: "Operation id", value: row.endpoint?.operationId },
              ]}
            />
          </SectionCard>

          <SectionCard title="Parameters">
            <ParametersTable parameters={row.parameters} />
          </SectionCard>

          <SectionCard title="Sync">
            <FieldGrid
              rows={[
                { label: "Sync state", value: syncState },
                { label: "Matched", value: formatBoolean(row.matched) },
                { label: "Matched by", value: row.matchedBy },
                { label: "Reason", value: row.reason },
                { label: "Manifest sync", value: valueToText(row.manifestSync) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Raw technical differences">
            {count(row.differences) > 0 ? (
              <TechnicalDifferencesList differences={row.differences} />
            ) : (
              <EmptyState>No dry-run differences loaded for this model.</EmptyState>
            )}
          </SectionCard>

          <Accordion
            disableGutters
            sx={{
              bgcolor: alpha(theme.palette.common.white, 0.035),
              border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              borderRadius: 2,
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                Raw data
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.common.black, 0.22),
                  color: "text.secondary",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {JSON.stringify(row, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 999, fontWeight: 900 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
