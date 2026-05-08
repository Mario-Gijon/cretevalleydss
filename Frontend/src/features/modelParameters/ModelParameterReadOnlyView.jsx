import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { resolveModelParameterAdapter, getParameterExpectedLength } from "./modelParameter.registry";

const formatNumber = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return n.toFixed(digits);
};

const criterionLabel = (leafNames, index) => leafNames?.[index] || `Criterion ${index + 1}`;

const fallbackString = (value) => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "{…}";
  return String(value);
};

const GenericView = ({ parameter, value, leafNames }) => {
  const theme = useTheme();
  const shown = value ?? parameter?.default;
  const type = parameter?.type;

  if (type === "boolean") {
    return <Chip size="small" label={shown ? "Yes" : "No"} color={shown ? "success" : "default"} />;
  }

  if (type === "number" || type === "integer") {
    return <Typography variant="body2" sx={{ fontWeight: 850 }}>{formatNumber(shown)}</Typography>;
  }

  if (type === "interval" && Array.isArray(shown) && shown.length >= 2) {
    return <Typography variant="body2" sx={{ fontWeight: 850 }}>{`${formatNumber(shown[0])} → ${formatNumber(shown[1])}`}</Typography>;
  }

  if (type === "array" && Array.isArray(shown)) {
    const expected = getParameterExpectedLength(parameter, leafNames?.length || 0);
    const perCriterion = Number.isInteger(expected) && expected === shown.length && Array.isArray(leafNames);
    if (perCriterion) {
      return (
        <Stack spacing={0.4}>
          {shown.map((item, idx) => (
            <Stack key={idx} direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 120 }}>{criterionLabel(leafNames, idx)}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatNumber(item)}</Typography>
            </Stack>
          ))}
        </Stack>
      );
    }
    return (
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {shown.map((item, idx) => <Chip key={idx} size="small" label={formatNumber(item)} />)}
      </Stack>
    );
  }

  if (type === "fuzzyArray" && Array.isArray(shown)) {
    const expected = getParameterExpectedLength(parameter, leafNames?.length || 0);
    const perCriterion = Number.isInteger(expected) && expected === shown.length && Array.isArray(leafNames);
    return (
      <Stack spacing={0.6}>
        {shown.map((tri, idx) => {
          const text = Array.isArray(tri) ? `l ${formatNumber(tri[0])} · m ${formatNumber(tri[1])} · u ${formatNumber(tri[2])}` : fallbackString(tri);
          return (
            <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{
              p: 0.6,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.08),
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {perCriterion ? <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 120 }}>{criterionLabel(leafNames, idx)}</Typography> : null}
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{text}</Typography>
            </Stack>
          );
        })}
      </Stack>
    );
  }

  return <Typography variant="body2" sx={{ fontWeight: 850 }}>{fallbackString(shown)}</Typography>;
};

export const ModelParameterReadOnlyView = ({ parameter, value, leafNames }) => {
  const { handler } = resolveModelParameterAdapter(parameter);
  const ViewComponent = handler?.ViewComponent;

  if (ViewComponent) {
    return <ViewComponent parameter={parameter} value={value} leafNames={leafNames} />;
  }

  return <GenericView parameter={parameter} value={value} leafNames={leafNames} />;
};

export default ModelParameterReadOnlyView;
