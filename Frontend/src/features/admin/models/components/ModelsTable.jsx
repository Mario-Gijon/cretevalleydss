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
  formatBoolean,
  getModelDisplayName,
  isVisibleInCreate,
  toTitle,
} from "../utils/modelManifest.formatters";
import {
  getSeverityForSyncState,
  getSyncState,
} from "../utils/modelManifest.severity";
import {
  modelTableBodyCellSx,
  modelTableContainerSx,
  modelTableHeadCellSx,
} from "../utils/modelManifest.styles";
import CatalogVisibilitySwitch from "./CatalogVisibilitySwitch";
import StatusChip from "./StatusChip";

const TABLE_HEADINGS = [
  "Model",
  "Key",
  "Lifecycle",
  "Alternative structure",
  "Input",
  "Output",
  "Issue model",
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
    <TableContainer sx={(theme) => modelTableContainerSx(theme)}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {TABLE_HEADINGS.map((head) => (
              <TableCell
                key={head}
                align={head === "Active" ? "center" : "left"}
                sx={(theme) => modelTableHeadCellSx(theme)}
              >
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, index) => {
            const syncState = getSyncState(row);
            const visible = isVisibleInCreate(row);
            const loadingVisibility = visibilityBusyId === row.mongoId;

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
                    ...modelTableBodyCellSx(theme),
                    minWidth: 230,
                  })}
                >
                  <Stack spacing={0.15}>
                    <Typography variant="body2" sx={{ fontWeight: 950 }}>
                      {getModelDisplayName(row)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      ID: {row.mongoId || "No Mongo id"}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  <StatusChip label={row.apiModelKey || "No key"} />
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {toTitle(row.lifecycleKind)}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {toTitle(row.alternativeEvaluationStructureKey)}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {row.apiInputFormat || "Unknown"}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  <Typography variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
                    {row.apiOutputFormat || "Unknown"}
                  </Typography>
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  {formatBoolean(row.isIssueModel)}
                </TableCell>

                <TableCell sx={(theme) => modelTableBodyCellSx(theme)}>
                  <StatusChip label={syncState} severity={getSeverityForSyncState(syncState)} />
                </TableCell>

                <TableCell
                  align="center"
                  onClick={(event) => event.stopPropagation()}
                  sx={(theme) => ({
                    ...modelTableBodyCellSx(theme),
                    minWidth: 88,
                  })}
                >
                  <CatalogVisibilitySwitch
                    checked={visible}
                    loading={loadingVisibility}
                    disabled={!row.mongoId}
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
