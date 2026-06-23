import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import EmptyState from "../models/components/EmptyState";
import SectionCard from "../models/components/SectionCard";
import {
  getModelCatalogTableBodyCellSx,
  getModelCatalogTableContainerSx,
  getModelCatalogTableHeadCellSx,
} from "../models/styles/modelManifest.styles";

const DELETE_DISABLED_MESSAGE =
  "This asset is used by existing issues and cannot be deleted.";

function AssetLocationCell({ locations = [], missingLocations = [] }) {
  const lines = [
    ...locations,
    ...missingLocations.map((location) => `Missing: ${location}`),
  ];

  if (lines.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 800 }}>
        Unknown
      </Typography>
    );
  }

  return (
    <Stack spacing={0.35}>
      {lines.map((line) => (
        <Typography
          key={line}
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 800, wordBreak: "break-word" }}
        >
          {line}
        </Typography>
      ))}
    </Stack>
  );
}

function AssetTable({
  title,
  subtitle,
  columns,
  rows,
  emptyMessage,
  loading,
  onAskDelete,
  deleteBusyId,
}) {
  const renderCellValue = (row, column) => {
    if (column.render) return column.render(row);

    const value = row[column.key];
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.trim()) return value;
    if (value === 0) return "0";

    return "Unknown";
  };

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {loading ? (
        <EmptyState>Loading registry assets...</EmptyState>
      ) : (
        <TableContainer sx={(theme) => getModelCatalogTableContainerSx(theme)}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align || "left"}
                    sx={(theme) => getModelCatalogTableHeadCellSx(theme)}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    sx={(theme) => ({
                      ...getModelCatalogTableBodyCellSx(theme),
                      py: 2,
                    })}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontWeight: 850 }}
                    >
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowId = `${row.kind}:${row.key}`;
                  const deleteDisabled = row.usedByIssuesCount > 0;

                  return (
                    <TableRow key={rowId}>
                      {columns.map((column) => {
                        if (column.key === "actions") {
                          return (
                            <TableCell
                              key={column.key}
                              align="right"
                              sx={(theme) => getModelCatalogTableBodyCellSx(theme)}
                            >
                              <Tooltip
                                title={deleteDisabled ? DELETE_DISABLED_MESSAGE : ""}
                                disableHoverListener={!deleteDisabled}
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={deleteDisabled || deleteBusyId === rowId}
                                    onClick={() => onAskDelete(row)}
                                    sx={(theme) => ({
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      bgcolor: alpha(theme.palette.common.white, 0.03),
                                    })}
                                  >
                                    <DeleteOutlineIcon
                                      fontSize="small"
                                      color={
                                        deleteDisabled || deleteBusyId === rowId
                                          ? "disabled"
                                          : "error"
                                      }
                                    />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          );
                        }

                        if (column.key === "location") {
                          return (
                            <TableCell
                              key={column.key}
                              sx={(theme) => ({
                                ...getModelCatalogTableBodyCellSx(theme),
                                minWidth: 280,
                              })}
                            >
                              <AssetLocationCell
                                locations={row.locations}
                                missingLocations={row.missingLocations}
                              />
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={column.key}
                            align={column.align || "left"}
                            sx={(theme) => getModelCatalogTableBodyCellSx(theme)}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: column.key === "key" ? 950 : 850 }}
                            >
                              {renderCellValue(row, column)}
                            </Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
}

const MODEL_COLUMNS = [
  { key: "key", label: "Key" },
  { key: "location", label: "Location" },
  { key: "usedByIssuesCount", label: "Used by issues" },
  { key: "actions", label: "Actions", align: "right" },
];

const EVALUATION_COLUMNS = [
  { key: "key", label: "Key" },
  {
    key: "stage",
    label: "Stage",
    render: (row) => row.stage || "Unknown",
  },
  { key: "location", label: "Location" },
  { key: "usedByIssuesCount", label: "Used by issues" },
  { key: "actions", label: "Actions", align: "right" },
];

const PARAMETER_COLUMNS = [
  { key: "key", label: "Key" },
  { key: "location", label: "Location" },
  { key: "usedByIssuesCount", label: "Used by issues" },
  { key: "actions", label: "Actions", align: "right" },
];

export default function ModelForgeRegistryTab({
  assets,
  loading,
  error,
  actionError,
  onReload,
  onAskDelete,
  deleteBusyId,
}) {
  const models = Array.isArray(assets?.models) ? assets.models : [];
  const evaluationStructures = Array.isArray(assets?.evaluationStructures)
    ? assets.evaluationStructures
    : [];
  const parameterStructures = Array.isArray(assets?.parameterStructures)
    ? assets.parameterStructures
    : [];

  return (
    <Stack spacing={1.2}>
      <SectionCard
        title="Registry"
        subtitle="Current Model Forge registry assets detected on disk."
        action={(
          <Button
            size="small"
            variant="outlined"
            color="info"
            onClick={() => onReload()}
            disabled={loading}
            sx={{ textTransform: "none", fontWeight: 900 }}
          >
            Reload
          </Button>
        )}
      >
        <Stack spacing={1}>
          {error && (
            <Alert severity="warning" variant="outlined">
              {error}
            </Alert>
          )}
          {actionError && (
            <Alert severity="error" variant="outlined">
              {actionError}
            </Alert>
          )}
          {!error && !loading && (
            <Box sx={{ py: 0.25 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Only unused assets can be deleted from this registry.
              </Typography>
            </Box>
          )}
        </Stack>
      </SectionCard>

      <AssetTable
        title="Models"
        subtitle="DecisionModelsService model folders."
        columns={MODEL_COLUMNS}
        rows={models}
        emptyMessage="No models found."
        loading={loading}
        onAskDelete={onAskDelete}
        deleteBusyId={deleteBusyId}
      />

      <AssetTable
        title="Evaluation structures"
        subtitle="Evaluation plugin assets used by issue and criteria weighting flows."
        columns={EVALUATION_COLUMNS}
        rows={evaluationStructures}
        emptyMessage="No evaluation structures found."
        loading={loading}
        onAskDelete={onAskDelete}
        deleteBusyId={deleteBusyId}
      />

      <AssetTable
        title="Parameter structures"
        subtitle="Parameter structure assets used by model parameter rendering and validation."
        columns={PARAMETER_COLUMNS}
        rows={parameterStructures}
        emptyMessage="No parameter structures found."
        loading={loading}
        onAskDelete={onAskDelete}
        deleteBusyId={deleteBusyId}
      />
    </Stack>
  );
}
