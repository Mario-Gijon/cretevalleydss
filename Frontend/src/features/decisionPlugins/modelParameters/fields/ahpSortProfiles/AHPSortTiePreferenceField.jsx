import { useId } from "react";
import { FormControl, FormHelperText, MenuItem, Select, Stack, Typography } from "@mui/material";
import ParameterInfoTooltip from "../../components/ParameterInfoTooltip.jsx";

export const AHPSortTiePreferenceField = ({
  label,
  value,
  onChange,
  info,
  error = "",
  disabled = false,
  showValidation = false,
}) => {
  const labelId = useId();
  const helperId = useId();
  const visibleError = showValidation ? error : "";

  return (
    <Stack spacing={0.45} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Typography id={labelId} component="span" variant="body2" sx={{ fontWeight: 650 }}>
          {label}
        </Typography>
        <ParameterInfoTooltip label={label} text={info} />
      </Stack>
      <FormControl fullWidth size="small" disabled={disabled} error={Boolean(visibleError)}>
        <Select
          value={value || ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          inputProps={{
            "aria-label": label,
            "aria-labelledby": labelId,
            "aria-describedby": visibleError ? helperId : undefined,
          }}
          displayEmpty
          renderValue={(selected) => selected === "optimistic"
            ? "More preferred category"
            : selected === "pessimistic"
              ? "Less preferred category"
              : "Choose preference"}
        >
          <MenuItem value="">Choose preference</MenuItem>
          <MenuItem value="optimistic">More preferred category</MenuItem>
          <MenuItem value="pessimistic">Less preferred category</MenuItem>
        </Select>
        {visibleError ? <FormHelperText id={helperId} role="alert">{visibleError}</FormHelperText> : null}
      </FormControl>
    </Stack>
  );
};

export default AHPSortTiePreferenceField;
