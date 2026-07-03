import { forwardRef, useImperativeHandle } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";

import { getExpressionDomainTypeEntry } from "../../../expressionDomains";
import { formatCollectiveDisplayValue } from "../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import { getExpressionDomainTypeKey } from "../../../../../utils/expressionDomains";

const normalizeCell = (cell, fallbackDomain) => {
  if (cell === null || cell === undefined) {
    return { value: "", domain: fallbackDomain || null };
  }

  if (typeof cell === "object" && !Array.isArray(cell)) {
    return {
      value: cell?.value ?? "",
      domain: cell?.domain ?? cell?.expressionDomain ?? fallbackDomain ?? null,
    };
  }

  return {
    value: cell,
    domain: fallbackDomain || null,
  };
};

const getCollectiveDisplayValue = (cell) => {
  if (cell == null) return null;
  if (typeof cell !== "object") return cell;
  if (cell.localizedLabel != null && cell.localizedLabel !== "") {
    return cell.localizedLabel;
  }
  if (cell.localizedValue != null && cell.localizedValue !== "") {
    return cell.localizedValue;
  }
  if (cell.value != null && cell.value !== "") {
    return cell.value;
  }
  return null;
};

const hasCollectiveValue = (value) =>
  value !== null && value !== undefined && value !== "";

const AlternativeCriteriaMatrixView = (
  {
    evaluationContext,
    evaluationPayload,
    setEvaluationPayload,
    collectivePayload,
    readOnly,
    loading,
  },
  ref
) => {
  const theme = useTheme();
  const alternativeItems = Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives
        .map((alternative) => ({
          id: String(alternative?.id ?? alternative?._id ?? "").trim(),
          name: String(alternative?.name ?? "").trim(),
        }))
        .filter((alternative) => alternative.id && alternative.name)
    : [];
  const criteria = Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          ...criterion,
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
  const resolvedPayload =
    evaluationPayload && typeof evaluationPayload === "object" && !Array.isArray(evaluationPayload)
      ? evaluationPayload
      : {};
  const resolvedCollectivePayload =
    collectivePayload && typeof collectivePayload === "object" && !Array.isArray(collectivePayload)
      ? collectivePayload
      : {};
  const permitEdit = readOnly !== true && loading !== true;

  const renderCollectiveChip = (collectiveValue) => {
    if (!hasCollectiveValue(collectiveValue)) {
      return null;
    }

    return (
      <Chip
        label={formatCollectiveDisplayValue(collectiveValue)}
        variant="outlined"
        size="small"
        sx={{
          ml: 1,
          fontSize: "0.75rem",
          height: 20,
          pointerEvents: "none",
          flexShrink: 0,
        }}
        color="info"
      />
    );
  };

  const renderCellWithCollective = ({ leftContent, collectiveValue }) => (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        {leftContent}
      </Box>
      {hasCollectiveValue(collectiveValue) ? (
        <Box
          sx={{
            ml: 1,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {renderCollectiveChip(collectiveValue)}
        </Box>
      ) : null}
    </Stack>
  );

  const updateCellValue = ({ rowId, criterionId, expressionDomain, nextValue }) => {
    setEvaluationPayload((previous) => ({
      ...(previous && typeof previous === "object" ? previous : {}),
      [rowId]: {
        ...((previous && previous[rowId]) || {}),
        [criterionId]: {
          value: nextValue,
          expressionDomain,
        },
      },
    }));
  };

  const columns = [
    {
      field: "alternativeLabel",
      headerName: "Alternative/Criterion",
      minWidth: 120,
      flex: 1,
    },
    ...criteria.map((criterion) => ({
      field: criterion.id,
      headerName: criterion.name,
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        const cell = params.row?.[criterion.id];
        return typeof cell === "object" ? cell?.value ?? "" : cell ?? "";
      },
      renderCell: (params) => {
        const rowId = params.row.id;
        const cell = normalizeCell(
          resolvedPayload?.[rowId]?.[criterion.id],
          criterion?.expressionDomain || null
        );
        const collectiveValue = getCollectiveDisplayValue(
          resolvedCollectivePayload?.[rowId]?.[criterion.id]
        );
        const expressionDomain = cell.domain;
        const typeKey = getExpressionDomainTypeKey(expressionDomain);
        const typeEntry = getExpressionDomainTypeEntry(typeKey);
        const EvaluationInput = typeEntry?.EvaluationInput || null;

        if (!typeKey || !EvaluationInput) {
          return renderCellWithCollective({
            leftContent: (
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 700 }}
              >
                {typeKey
                  ? `Unsupported domain: ${typeKey}`
                  : "Missing domain type"}
              </Typography>
            ),
            collectiveValue,
          });
        }

        return renderCellWithCollective({
          leftContent: (
            <Box
              sx={{ width: "100%", minWidth: 0 }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <EvaluationInput
                expressionDomain={expressionDomain}
                value={cell.value}
                onChange={(nextValue) => {
                  if (!permitEdit) {
                    return;
                  }

                  updateCellValue({
                    rowId,
                    criterionId: criterion.id,
                    expressionDomain,
                    nextValue,
                  });
                }}
                disabled={!permitEdit}
                error={false}
                helperText=""
              />
            </Box>
          ),
          collectiveValue,
        });
      },
    })),
  ];

  const rows = alternativeItems.map((alternative) => {
    const row = { id: alternative.id, alternativeLabel: alternative.name };

    criteria.forEach((criterion) => {
      row[criterion.id] = normalizeCell(
        resolvedPayload?.[alternative.id]?.[criterion.id],
        criterion?.expressionDomain || null
      );
    });

    return row;
  });

  const flushPendingEdits = async () => {
    await Promise.resolve();
  };

  useImperativeHandle(ref, () => ({
    flushPendingEdits,
    preparePayloadRead: flushPendingEdits,
  }));

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        p: { xs: 1, sm: 1.5 },
        overflow: "hidden",
      }}
    >
      <DataGrid
        autoHeight
        disableColumnMenu
        disableColumnFilter
        disableColumnSorting
        disableColumnSelector
        disableRowSelectionOnClick
        hideFooter
        density="compact"
        rows={rows}
        columns={columns}
        sx={{
          ...buildEvaluationMatrixDataGridSx(theme),
        }}
      />
    </Box>
  );
};

export default forwardRef(AlternativeCriteriaMatrixView);

