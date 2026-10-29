import { Box, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { buildEvaluationMatrixDataGridSx } from "../../../shared/styles/evaluationMatrixTable.styles.js";
import {
  ALTERNATIVE_CRITERIA_LABEL_COLUMN_MIN_WIDTH,
  ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
  EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
} from "../../../shared/evaluationMatrixSizing.js";
import SaatyComparisonSelect from "./SaatyComparisonSelect.jsx";
import {
  getAlternativeToProfileValue,
  getOrientedProfileComparisonValue,
} from "../operations/evaluationPayload.js";

const matrixViewportSx = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
};

const matrixGridSx = (theme) => {
  const sharedStyles = buildEvaluationMatrixDataGridSx(theme);

  return {
    ...sharedStyles,
    "& .MuiDataGrid-cell": {
      ...sharedStyles["& .MuiDataGrid-cell"],
      px: 0.75,
      minWidth: 0,
    },
    "& .MuiDataGrid-cellContent": {
      width: "100%",
      minWidth: 0,
    },
  };
};

const buildColumns = ({ profiles, rowHeader, rowHeaderWidth, renderCell }) => [
  {
    field: "alternativeLabel",
    headerName: rowHeader,
    minWidth: rowHeaderWidth,
    flex: 1,
    sortable: false,
  },
  ...profiles.map((profile) => ({
    field: profile.profileId,
    headerName: profile.label,
    minWidth: EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
    flex: 1,
    sortable: false,
    renderCell: (params) => renderCell({ row: params.row, profile }),
  })),
];

const DataGridMatrix = ({ rows, columns, label, rowHeaderField = "alternativeLabel", diagonalField = false }) => {
  const theme = useTheme();

  return (
    <Box sx={matrixViewportSx}>
      <DataGrid
        aria-label={label}
        autoHeight
        density="compact"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        getCellClassName={(params) => {
          if (params.field === rowHeaderField) return "first-column";
          return diagonalField && params.row.id === params.field ? "diagonal-cell" : "";
        }}
        hideFooter
        disableColumnMenu
        disableColumnFilter
        disableColumnSorting
        disableColumnSelector
        disableRowSelectionOnClick
        sx={matrixGridSx(theme)}
      />
    </Box>
  );
};

export const AlternativeProfileComparisonsTable = ({
  alternatives,
  profiles,
  criterion,
  assessment,
  onChange,
  readOnly,
}) => {
  const alternativesById = new Map(alternatives.map((alternative) => [alternative.id, alternative]));
  const rows = alternatives.map((alternative) => ({
    id: alternative.id,
    alternativeLabel: alternative.name,
  }));
  const columns = buildColumns({
    profiles,
    rowHeader: "Alternative",
    rowHeaderWidth: ALTERNATIVE_CRITERIA_LABEL_COLUMN_MIN_WIDTH,
    renderCell: ({ row, profile }) => {
      const alternative = alternativesById.get(row.id);
      const ariaLabel = `Compare ${alternative.name} with ${profile.label} for ${criterion.name}`;
      return (
        <SaatyComparisonSelect
          ariaLabel={ariaLabel}
          value={getAlternativeToProfileValue({
            assessment,
            criterionId: criterion.id,
            alternativeId: alternative.id,
            profileId: profile.profileId,
          })}
          onChange={(value) => onChange({ alternative, profile, value })}
          readOnly={readOnly}
        />
      );
    },
  });

  return (
    <DataGridMatrix
      label={`${criterion.name} alternative to profile comparisons`}
      rows={rows}
      columns={columns}
    />
  );
};

export const ProfileComparisonsTable = ({
  profiles,
  criterion,
  assessment,
  onChange,
  readOnly,
}) => {
  const rows = profiles.map((profile) => ({
    id: profile.profileId,
    alternativeLabel: profile.label,
  }));
  const columns = buildColumns({
    profiles,
    rowHeader: "Profile",
    rowHeaderWidth: ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
    renderCell: ({ row, profile }) => {
      const diagonal = row.id === profile.profileId;
      if (diagonal) {
        return <Box aria-label="Neutral profile self-comparison">1 — Neutral</Box>;
      }

      const rowProfile = profiles.find(({ profileId }) => profileId === row.id);
      const ariaLabel = `Compare ${rowProfile.label} with ${profile.label} for ${criterion.name}`;
      return (
        <SaatyComparisonSelect
          ariaLabel={ariaLabel}
          value={getOrientedProfileComparisonValue({
            assessment,
            criterionId: criterion.id,
            rowProfileId: rowProfile.profileId,
            columnProfileId: profile.profileId,
          })}
          onChange={(value) => onChange({
            rowProfile,
            columnProfile: profile,
            value,
          })}
          readOnly={readOnly}
        />
      );
    },
  });

  return (
    <DataGridMatrix
      label={`${criterion.name} profile comparisons`}
      rows={rows}
      columns={columns}
      diagonalField
    />
  );
};

export default AlternativeProfileComparisonsTable;
