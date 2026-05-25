import { Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const formatNumber = (value, digits = 2) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value ?? "—");
  return parsed.toFixed(digits);
};

const criterionLabel = (leafNames, index) => leafNames?.[index] || `Criterion ${index + 1}`;

const fallbackString = (value) => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "{…}";
  return String(value);
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const ModelParameterReadOnlyView = ({
  parameter,
  value,
  leafNames,
  leafCriteria,
}) => {
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
    return (
      <Typography variant="body2" sx={{ fontWeight: 850 }}>
        {`${formatNumber(shown[0])} → ${formatNumber(shown[1])}`}
      </Typography>
    );
  }

  if ((type === "array" || type === "fuzzyArray") && Array.isArray(shown)) {
    const expected = getParameterExpectedLength(parameter, leafNames?.length || 0);
    const perCriterion = Number.isInteger(expected) && expected === shown.length && Array.isArray(leafNames);

    if (perCriterion) {
      return (
        <Stack spacing={0.4}>
          {shown.map((item, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 120 }}>
                {criterionLabel(leafNames, index)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {type === "fuzzyArray" && Array.isArray(item)
                  ? `l ${formatNumber(item[0])} · m ${formatNumber(item[1])} · u ${formatNumber(item[2])}`
                  : formatNumber(item)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      );
    }

    if (type === "fuzzyArray") {
      return (
        <Stack spacing={0.6}>
          {shown.map((tri, index) => {
            const text = Array.isArray(tri)
              ? `l ${formatNumber(tri[0])} · m ${formatNumber(tri[1])} · u ${formatNumber(tri[2])}`
              : fallbackString(tri);
            return (
              <Stack
                key={index}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  p: 0.6,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.paper, 0.08),
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {text}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      );
    }

    return (
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {shown.map((item, index) => (
          <Chip key={index} size="small" label={formatNumber(item)} />
        ))}
      </Stack>
    );
  }

  if (parameter?.parameterStructureKey === "criterionMap" && isPlainObject(shown)) {
    const entries = Object.entries(shown);
    const normalizedLeafCriteria = Array.isArray(leafCriteria)
      ? leafCriteria
          .map((criterion, index) => {
            const id = String(criterion?.id || criterion?._id || "").trim();
            const name = String(criterion?.name || "").trim() || `Criterion ${index + 1}`;
            if (!id) return null;
            return { id, name };
          })
          .filter(Boolean)
      : [];

    const byKey = new Map(entries);
    const orderedEntries = [];

    normalizedLeafCriteria.forEach((criterion) => {
      if (!byKey.has(criterion.id)) return;
      orderedEntries.push([criterion.name, byKey.get(criterion.id)]);
      byKey.delete(criterion.id);
    });

    for (const entry of byKey.entries()) {
      orderedEntries.push(entry);
    }

    if (orderedEntries.length === 0) {
      return <Typography variant="body2" sx={{ fontWeight: 850 }}>—</Typography>;
    }

    return (
      <Stack spacing={0.4}>
        {orderedEntries.map(([criterionKey, criterionValue], index) => (
          <Stack key={`${criterionKey}-${index}`} direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 120 }}>
              {criterionKey}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {fallbackString(criterionValue)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  }

  return <Typography variant="body2" sx={{ fontWeight: 850 }}>{fallbackString(shown)}</Typography>;
};

export default ModelParameterReadOnlyView;
