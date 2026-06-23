import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import {
  getModelAdminEnabledLabel,
  getModelManifestDisplayName,
  isModelVisibleInCreateIssue,
  toModelManifestTitle,
} from "../logic/formatModelManifestDisplay";
import {
  getModelManifestSyncSeverity,
  getModelManifestSyncState,
} from "../logic/getModelManifestSeverity";
import {
  getModelCatalogTableBodyCellSx,
  getModelCatalogTableContainerSx,
  getModelCatalogTableHeadCellSx,
} from "../styles/modelManifest.styles";
import CatalogVisibilitySwitch from "./CatalogVisibilitySwitch";
import StatusChip from "./StatusChip";

const TABLE_HEADINGS = [
  "Model",
  "Key",
  "Lifecycle",
  "Evaluation structure",
  "Input",
  "Output",
  "Model kind",
  "Sync state",
  "Active",
];

export default function ModelsTable({
  rows,
  onViewDetails,
  onAskVisibilityChange,
  visibilityBusyId,
}) {
  return (
    <TableContainer sx={(theme) => getModelCatalogTableContainerSx(theme)}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {TABLE_HEADINGS.map((head) => (
              <TableCell
                key={head}
                align={head === "Active" ? "center" : "left"}
                sx={(theme) => getModelCatalogTableHeadCellSx(theme)}
              >
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, index) => {
            const syncState = getModelManifestSyncState(row);
            const visible = isModelVisibleInCreateIssue(row);
            const loadingVisibility = visibilityBusyId === row.mongoId;
            const isProtectedHistoricalModel = row.protectedHistoricalModel === true;

            return (
              <TableRow
                key={`${row.apiModelKey || row.mongoId || row.mongoName || index}-row`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onViewDetails(row);
                  }
                }}
                tabIndex={0}
                role="button"
                onClick={() => onViewDetails(row)}
                sx={(theme) => ({
                  cursor: "pointer",
                  transition: "background-color 0.16s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.info.main, 0.06),
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${alpha(theme.palette.info.main, 0.55)}`,
                    outlineOffset: "-2px",
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                  },
                })}
              >
                <TableCell
                  sx={(theme) => ({
                    ...getModelCatalogTableBodyCellSx(theme),
                    minWidth: 230,
                  })}
                >
                  <Stack spacing={0.15}>
                    <Typography variant="body2" sx={{ fontWeight: 950 }}>
                      {getModelManifestDisplayName(row)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <StatusChip
                        label={getModelAdminEnabledLabel(row)}
                        severity={visible ? "success" : "error"}
                      />
                      <StatusChip
                        label={toModelManifestTitle(row.implementationStatus)}
                        severity={row.implementationStatus === "scaffold" ? "warning" : "success"}
                      />
                      {isProtectedHistoricalModel && (
                        <StatusChip label="Protected" severity="warning" />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      ID: {row.mongoId || "No Mongo id"}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  <StatusChip label={row.apiModelKey || "No key"} />
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {toModelManifestTitle(row.lifecycleKind)}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {toModelManifestTitle(row.evaluationStructureKey)}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {row.apiInputFormat || "Unknown"}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {row.apiOutputFormat || "Unknown"}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  {toModelManifestTitle(row.modelKind)}
                </TableCell>

                <TableCell sx={(theme) => getModelCatalogTableBodyCellSx(theme)}>
                  <StatusChip
                    label={syncState}
                    severity={getModelManifestSyncSeverity(syncState)}
                  />
                </TableCell>

                <TableCell
                  align="center"
                  onClick={(event) => event.stopPropagation()}
                  sx={(theme) => ({
                    ...getModelCatalogTableBodyCellSx(theme),
                    minWidth: 88,
                  })}
                >
                  <CatalogVisibilitySwitch
                    checked={visible}
                    loading={loadingVisibility}
                    disabled={!row.mongoId || isProtectedHistoricalModel}
                    onChange={() => onAskVisibilityChange(row)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
