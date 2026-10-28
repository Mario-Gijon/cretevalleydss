import { IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";

import {
  formatSaatyPreferenceLabel,
  getSaatyScaleValue,
  SAATY_SCALE_VALUES,
} from "../../criteriaPairwiseAHP/operations/saatyPreference.js";

const SaatyComparisonSelect = ({
  ariaLabel,
  value,
  onChange,
  readOnly = false,
}) => {
  const selectedValue = value === "" || value === null || value === undefined
    ? null
    : getSaatyScaleValue(typeof value === "string" ? Number(value) : value);

  if (readOnly) {
    return (
      <Typography
        variant="body2"
        aria-label={`${ariaLabel}: ${selectedValue === null ? "pending" : formatSaatyPreferenceLabel(selectedValue)}`}
        color={selectedValue === null ? "text.secondary" : "text.primary"}
        sx={{ minWidth: 8, fontVariantNumeric: "tabular-nums" }}
      >
        {selectedValue === null ? "Pending" : formatSaatyPreferenceLabel(selectedValue)}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.15} alignItems="center" sx={{ minWidth: 0 }}>
      <TextField
        select
        size="small"
        color="secondary"
        value={selectedValue === null ? "" : String(selectedValue)}
        onChange={(event) => {
          const nextValue = getSaatyScaleValue(Number(event.target.value));
          if (nextValue !== null) onChange(nextValue);
        }}
        SelectProps={{
          displayEmpty: true,
          renderValue: (rawValue) => {
            if (rawValue === "") return <span style={{ opacity: 0.58 }}>Choose</span>;
            return formatSaatyPreferenceLabel(Number(rawValue));
          },
          MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
        }}
        inputProps={{
          "aria-label": ariaLabel,
        }}
        sx={{
          minWidth: 88,
          width: 96,
          "& .MuiSelect-select": { py: 0.75, pr: 3.5, fontVariantNumeric: "tabular-nums" },
        }}
      >
        {SAATY_SCALE_VALUES.map((saatyValue) => (
          <MenuItem key={saatyValue} value={String(saatyValue)}>
            {formatSaatyPreferenceLabel(saatyValue)}
          </MenuItem>
        ))}
      </TextField>
      {selectedValue !== null ? (
        <Tooltip title={`Clear ${ariaLabel}`}>
          <IconButton
            size="small"
            aria-label={`Clear ${ariaLabel}`}
            onClick={() => onChange(null)}
            sx={{ flexShrink: 0 }}
          >
            <ClearOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {readOnly && selectedValue === null ? (
        <span aria-label={`${ariaLabel}: pending`} style={{ color: "rgba(255,255,255,0.55)" }}>Pending</span>
      ) : null}
    </Stack>
  );
};

export default SaatyComparisonSelect;
