import { Box, Typography } from "@mui/material";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const formatValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const resolveLeafRows = ({ leafCriteria, leafNames }) => {
  const rowsFromCriteria = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion, index) => {
      const key = String(
        criterion?.id ||
          criterion?._id ||
          criterion?.key ||
          criterion?.name ||
          ""
      ).trim();
      const name = String(criterion?.name || "").trim() || `Criterion ${index + 1}`;
      if (!key && !name) return null;

      return { key, name };
    })
    .filter(Boolean);

  if (rowsFromCriteria.length > 0) return rowsFromCriteria;

  return (Array.isArray(leafNames) ? leafNames : [])
    .map((name, index) => {
      const normalizedName = String(name || "").trim();
      if (!normalizedName) return null;

      return {
        key: normalizedName,
        name: normalizedName,
      };
    })
    .filter(Boolean);
};

const resolveShownValue = ({ value, parameter, rowKey }) => {
  if (isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, rowKey)) {
    return value[rowKey];
  }

  if (!isPlainObject(value) && value !== undefined && value !== null && value !== "") {
    return value;
  }

  return parameter?.default;
};

export const SelectCriterionParameterReadOnly = ({
  parameter,
  value,
  leafCriteria,
  leafNames,
}) => {
  const rows = resolveLeafRows({ leafCriteria, leafNames });

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        —
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${rows.length}, max-content)`,
        columnGap: 1,
        rowGap: 0.75,
        alignItems: "start",
        width: "fit-content",
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      {rows.map((row) => (
        <Typography
          key={`label-${row.key}`}
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {row.name}
        </Typography>
      ))}

      {rows.map((row) => (
        <Typography
          key={`value-${row.key}`}
          variant="body2"
          sx={{
            fontWeight: 850,
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          {formatValue(
            resolveShownValue({
              value,
              parameter,
              rowKey: row.key,
            })
          )}
        </Typography>
      ))}
    </Box>
  );
};

export default SelectCriterionParameterReadOnly;
