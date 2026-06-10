import { Button, Paper, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { getAdminIssueDetailCardSx } from "../../adminIssues/styles/adminIssues.styles";
import {
  formatBoolean,
  getCatalogVisibilityLabel,
  getModelDisplayName,
  isVisibleInCreate,
  toTitle,
} from "../utils/modelManifest.formatters";
import {
  getSeverityForSyncState,
  getSyncState,
} from "../utils/modelManifest.severity";
import CatalogVisibilitySwitch from "./CatalogVisibilitySwitch";
import FieldGrid from "./FieldGrid";
import StatusChip from "./StatusChip";

export default function ModelCards({
  rows,
  onViewDetails,
  onAskVisibilityChange,
  visibilityBusyId,
}) {
  return (
    <Stack spacing={1}>
      {rows.map((row, index) => {
        const visible = isVisibleInCreate(row);
        const loadingVisibility = visibilityBusyId === row.mongoId;

        return (
          <Paper
            key={`${row.apiModelKey || row.mongoId || row.mongoName || index}-card`}
            elevation={0}
            sx={(theme) => ({ ...getAdminIssueDetailCardSx(theme), p: 1.2 })}
          >
            <Stack spacing={1}>
              <Stack spacing={0.7}>
                <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                  {getModelDisplayName(row)}
                </Typography>

                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                  <StatusChip label={row.apiModelKey || "No key"} />
                  <StatusChip
                    label={row.isIssueModel ? "Issue model" : "Non-issue model"}
                    severity={row.isIssueModel ? "success" : "info"}
                  />
                  <StatusChip label={toTitle(row.lifecycleKind)} />
                  <StatusChip
                    label={getSyncState(row)}
                    severity={getSeverityForSyncState(getSyncState(row))}
                  />
                  <StatusChip
                    label={getCatalogVisibilityLabel(row)}
                    severity={visible ? "success" : "error"}
                  />
                </Stack>
              </Stack>

              <FieldGrid
                rows={[
                  { label: "Catalog", value: getCatalogVisibilityLabel(row) },
                  { label: "Lifecycle", value: toTitle(row.lifecycleKind) },
                  {
                    label: "Alternative structure",
                    value: toTitle(row.alternativeEvaluationStructureKey),
                  },
                  {
                    label: "Uses criteria weights",
                    value: formatBoolean(row.usesCriteriaWeights),
                  },
                  {
                    label: "Uses fuzzy weights",
                    value: formatBoolean(row.usesFuzzyCriteriaWeights),
                  },
                  { label: "Input", value: row.apiInputFormat },
                  { label: "Output", value: row.apiOutputFormat },
                  { label: "Issue model", value: formatBoolean(row.isIssueModel) },
                ]}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={0.9}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<InfoOutlinedIcon />}
                  onClick={() => onViewDetails(row)}
                  sx={{ borderRadius: 999, fontWeight: 900 }}
                >
                  View details
                </Button>

                <CatalogVisibilitySwitch
                  checked={visible}
                  loading={loadingVisibility}
                  disabled={!row.mongoId}
                  onChange={() => onAskVisibilityChange(row)}
                />
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
