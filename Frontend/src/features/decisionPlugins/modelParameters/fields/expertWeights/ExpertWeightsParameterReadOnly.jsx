import { Box, Typography } from "@mui/material";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const formatWeight = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value ?? "—");
  }

  return numericValue.toFixed(3);
};

const ExpertWeightsParameterReadOnly = ({ value }) => {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
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
        gridTemplateColumns: "max-content max-content",
        columnGap: 1.25,
        rowGap: 0.45,
        alignItems: "center",
        width: "fit-content",
      }}
    >
      {Object.entries(value).map(([expertId, weight]) => (
        <Box
          key={expertId}
          sx={{
            display: "contents",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {expertId}:
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontWeight: 850,
              whiteSpace: "nowrap",
            }}
          >
            {formatWeight(weight)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default ExpertWeightsParameterReadOnly;
