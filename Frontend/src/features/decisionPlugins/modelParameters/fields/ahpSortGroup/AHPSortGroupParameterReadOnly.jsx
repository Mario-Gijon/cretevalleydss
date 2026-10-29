import { Stack, Typography } from "@mui/material";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const AHPSortGroupParameterReadOnly = ({ value }) => {
  if (!isPlainObject(value) || !["optimistic", "pessimistic"].includes(value.tiePolicy) || Object.keys(value).length !== 1) {
    return <Typography variant="body2" color="text.secondary">No group tie preference is configured.</Typography>;
  }

  return (
    <Stack spacing={0.35}>
      <Typography variant="body2">
        Equal-vote preference: {value.tiePolicy === "optimistic" ? "more preferred category" : "less preferred category"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Applies only when multiple categories share the maximum vote count.
      </Typography>
    </Stack>
  );
};

export default AHPSortGroupParameterReadOnly;
