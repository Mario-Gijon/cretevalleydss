import { Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isValidBwmScaleValue = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 9;

// eslint-disable-next-line react-refresh/only-export-components
export const buildEmptyBestWorstCriteriaPayload = (criterionNames) => ({
  bestCriterion: "",
  worstCriterion: "",
  bestToOthers: Object.fromEntries(
    (Array.isArray(criterionNames) ? criterionNames : []).map((name) => [
      name,
      "",
    ])
  ),
  othersToWorst: Object.fromEntries(
    (Array.isArray(criterionNames) ? criterionNames : []).map((name) => [
      name,
      "",
    ])
  ),
});

// eslint-disable-next-line react-refresh/only-export-components
export const normalizeBestWorstCriteriaDraftPayload = ({
  criterionNames,
  payload,
}) => {
  const names = (Array.isArray(criterionNames) ? criterionNames : []).filter(
    Boolean
  );
  const safePayload = isPlainObject(payload) ? payload : {};
  const base = buildEmptyBestWorstCriteriaPayload(names);

  const normalized = {
    bestCriterion:
      typeof safePayload.bestCriterion === "string" &&
        names.includes(safePayload.bestCriterion)
        ? safePayload.bestCriterion
        : names[0] || "",
    worstCriterion:
      typeof safePayload.worstCriterion === "string" &&
        names.includes(safePayload.worstCriterion)
        ? safePayload.worstCriterion
        : names.length > 1
          ? names[names.length - 1]
          : names[0] || "",
    bestToOthers: { ...base.bestToOthers },
    othersToWorst: { ...base.othersToWorst },
  };

  if (names.length > 1 && normalized.bestCriterion === normalized.worstCriterion) {
    normalized.worstCriterion =
      names.find((name) => name !== normalized.bestCriterion) ||
      normalized.worstCriterion;
  }

  for (const name of names) {
    const bestValue = safePayload?.bestToOthers?.[name];
    const worstValue = safePayload?.othersToWorst?.[name];

    normalized.bestToOthers[name] =
      bestValue === "" || bestValue === null || bestValue === undefined
        ? ""
        : Number(bestValue);

    normalized.othersToWorst[name] =
      worstValue === "" || worstValue === null || worstValue === undefined
        ? ""
        : Number(worstValue);
  }

  if (normalized.bestCriterion) {
    normalized.bestToOthers[normalized.bestCriterion] = 1;
  }

  if (normalized.worstCriterion) {
    normalized.othersToWorst[normalized.worstCriterion] = 1;
  }

  return normalized;
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateBestWorstCriteriaPayload = ({ criterionNames, payload }) => {
  const names = (Array.isArray(criterionNames) ? criterionNames : []).filter(
    Boolean
  );
  const normalized = normalizeBestWorstCriteriaDraftPayload({
    criterionNames: names,
    payload,
  });

  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } =
    normalized;

  if (!bestCriterion) return "Best criterion is required.";
  if (!worstCriterion) return "Worst criterion is required.";
  if (names.length > 1 && bestCriterion === worstCriterion) {
    return "Best and worst criteria must be different.";
  }

  for (const name of names) {
    if (name !== bestCriterion && !isValidBwmScaleValue(bestToOthers[name])) {
      return `Best-to-others value for '${name}' must be an integer between 1 and 9.`;
    }

    if (name !== worstCriterion && !isValidBwmScaleValue(othersToWorst[name])) {
      return `Others-to-worst value for '${name}' must be an integer between 1 and 9.`;
    }
  }

  return null;
};

const preventInvalidNumberKeys = (event) => {
  if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
    event.preventDefault();
  }
};

const normalizeScaleInput = (value) => {
  if (value === "") return "";
  if (/^[1-9]$/.test(value)) return Number(value);
  return null;
};

const BestWorstCriteriaView = ({
  creationContext = null,
  criterionNames: directCriterionNames,
  payload: directPayload,
  setPayload: directSetPayload,
  disabled = false,
}) => {
  const criterionNamesSource = Array.isArray(directCriterionNames)
    ? directCriterionNames
    : Array.isArray(creationContext?.criterionNames)
      ? creationContext.criterionNames
      : [];
  const payload = directPayload ?? creationContext?.payload ?? {};
  const setPayload = directSetPayload ?? creationContext?.setPayload;
  const names = criterionNamesSource.filter(Boolean);

  const normalizedPayload = normalizeBestWorstCriteriaDraftPayload({
    criterionNames: names,
    payload,
  });

  const bestComparisonNames = names.filter(
    (name) => name !== normalizedPayload.bestCriterion
  );

  const worstComparisonNames = names.filter(
    (name) => name !== normalizedPayload.worstCriterion
  );

  const longestCriterionLength = names.reduce(
    (max, name) => Math.max(max, String(name).length),
    0
  );

  const labelColumnWidth = `${Math.min(
    Math.max(longestCriterionLength + 2, 10),
    28
  )}ch`;

  const updateBestCriterion = (bestCriterion) => {
    const previousBestCriterion = normalizedPayload.bestCriterion;

    const next = {
      ...normalizedPayload,
      bestCriterion,
      bestToOthers: {
        ...normalizedPayload.bestToOthers,
        [bestCriterion]: 1,
      },
      othersToWorst: { ...normalizedPayload.othersToWorst },
    };

    if (
      previousBestCriterion &&
      previousBestCriterion !== bestCriterion &&
      next.bestToOthers[previousBestCriterion] === 1
    ) {
      next.bestToOthers[previousBestCriterion] = "";
    }

    if (names.length > 1 && next.worstCriterion === next.bestCriterion) {
      next.worstCriterion =
        names.find((name) => name !== next.bestCriterion) || next.worstCriterion;
      next.othersToWorst[next.worstCriterion] = 1;
    }

    setPayload(next);
  };

  const updateWorstCriterion = (worstCriterion) => {
    const previousWorstCriterion = normalizedPayload.worstCriterion;

    const next = {
      ...normalizedPayload,
      worstCriterion,
      bestToOthers: { ...normalizedPayload.bestToOthers },
      othersToWorst: {
        ...normalizedPayload.othersToWorst,
        [worstCriterion]: 1,
      },
    };

    if (
      previousWorstCriterion &&
      previousWorstCriterion !== worstCriterion &&
      next.othersToWorst[previousWorstCriterion] === 1
    ) {
      next.othersToWorst[previousWorstCriterion] = "";
    }

    if (names.length > 1 && next.bestCriterion === next.worstCriterion) {
      next.bestCriterion =
        names.find((name) => name !== next.worstCriterion) || next.bestCriterion;
      next.bestToOthers[next.bestCriterion] = 1;
    }

    setPayload(next);
  };

  const updateBestToOthersValue = (criterionName, value) => {
    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setPayload({
      ...normalizedPayload,
      bestToOthers: {
        ...normalizedPayload.bestToOthers,
        [criterionName]: normalizedValue,
      },
    });
  };

  const updateOthersToWorstValue = (criterionName, value) => {
    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setPayload({
      ...normalizedPayload,
      othersToWorst: {
        ...normalizedPayload.othersToWorst,
        [criterionName]: normalizedValue,
      },
    });
  };

  const renderComparisonRow = ({ name, value, onChange }) => (
    <Stack
      key={name}
      direction={{ xs: "column", sm: "row" }}
      spacing={0.75}
      alignItems={{ xs: "stretch", sm: "center" }}
    >
      <Typography
        variant="body2"
        noWrap
        title={name}
        sx={{
          width: {
            xs: "auto",
            sm: labelColumnWidth,
          },
          flexShrink: 0,
        }}
      >
        {name}
      </Typography>

      <TextField
        variant="outlined"
        type="number"
        size="small"
        color="info"
        disabled={disabled}
        value={value ?? ""}
        onKeyDown={preventInvalidNumberKeys}
        onChange={(event) => onChange(name, event.target.value)}
        inputProps={{ min: 1, max: 9, step: 1 }}
        sx={{ width: { xs: "100%", sm: 96 } }}
      />
    </Stack>
  );

  if (names.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No criteria available.
      </Typography>
    );
  }

  if (typeof setPayload !== "function") {
    return (
      <Typography variant="caption" color="text.secondary">
        Criteria weighting payload is not editable in this context.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25} sx={{pt:1.5}}>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 5 }}
        alignItems="flex-start"
      >
        <Stack spacing={0.75}>

          <TextField
            select
            variant="outlined"
            label="Best criterion"
            size="small"
            color="info"
            disabled={disabled}
            value={normalizedPayload.bestCriterion}
            onChange={(event) => updateBestCriterion(event.target.value)}
          >
            {names
              .filter((name) => name !== normalizedPayload.worstCriterion)
              .map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
          </TextField>

          <Typography variant="subtitle1">Best to others</Typography>

          {bestComparisonNames.map((name) =>
            renderComparisonRow({
              name,
              value: normalizedPayload.bestToOthers[name],
              onChange: updateBestToOthersValue,
            })
          )}
        </Stack>

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            display: {
              xs: "none",
              md: "block",
            },
          }}
        />

        <Divider
          sx={{
            display: {
              xs: "block",
              md: "none",
            },
            width: "100%",
          }}
        />

        <Stack spacing={0.75}>

          <TextField
            select
            variant="outlined"
            label="Worst criterion"
            size="small"
            color="info"
            disabled={disabled}
            value={normalizedPayload.worstCriterion}
            onChange={(event) => updateWorstCriterion(event.target.value)}
          >
            {names
              .filter((name) => name !== normalizedPayload.bestCriterion)
              .map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
          </TextField>

          <Typography variant="subtitle1">Others to worst</Typography>

          {worstComparisonNames.map((name) =>
            renderComparisonRow({
              name,
              value: normalizedPayload.othersToWorst[name],
              onChange: updateOthersToWorstValue,
            })
          )}
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Use integer values from 1 to 9.
      </Typography>
    </Stack>
  );
};

export default BestWorstCriteriaView;
