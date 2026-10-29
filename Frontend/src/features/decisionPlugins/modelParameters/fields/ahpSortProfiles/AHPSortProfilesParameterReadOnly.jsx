import { Chip, Stack, Typography } from "@mui/material";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const AHPSortProfilesParameterReadOnly = ({ value }) => {
  if (!isObject(value) || (value.mode !== "limiting" && value.mode !== "central")) {
    return <Typography variant="body2" color="text.secondary">No AHPSort I profile method is configured.</Typography>;
  }

  const profiles = Array.isArray(value.profiles) ? value.profiles : [];

  return (
    <Stack spacing={0.9}>
      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={value.mode === "limiting" ? "Limiting profiles" : "Central profiles"}
        />
        {value.mode === "central" ? (
          <Typography variant="body2" color="text.secondary">
            Equal-distance preference: {value.tiePolicy === "optimistic"
              ? "more preferred category"
              : value.tiePolicy === "pessimistic"
                ? "less preferred category"
                : "needs review"}
          </Typography>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {profiles.length} {value.mode === "limiting" ? "boundary" : "central"} profile{profiles.length === 1 ? "" : "s"} generated automatically.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Comparisons are completed during expert evaluation.
      </Typography>
    </Stack>
  );
};

export default AHPSortProfilesParameterReadOnly;
