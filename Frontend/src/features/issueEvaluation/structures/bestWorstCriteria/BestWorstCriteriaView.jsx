import { Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { buildEmptyBestWorstCriteriaPayload } from "./bestWorstCriteria.payload";

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
  const criterionNamesSource =
    directCriterionNames ?? creationContext?.criterionNames ?? [];
  const names = criterionNamesSource;
  const providedPayload = directPayload ?? creationContext?.payload;
  const payload =
    providedPayload && Object.keys(providedPayload).length > 0
      ? providedPayload
      : buildEmptyBestWorstCriteriaPayload(names);
  const setPayload = directSetPayload ?? creationContext?.setPayload;

  const bestComparisonNames = names.filter((name) => name !== payload.bestCriterion);
  const worstComparisonNames = names.filter((name) => name !== payload.worstCriterion);

  const longestCriterionLength = names.reduce(
    (max, name) => Math.max(max, String(name).length),
    0
  );

  const labelColumnWidth = `${Math.min(
    Math.max(longestCriterionLength + 2, 10),
    28
  )}ch`;

  const updateBestCriterion = (bestCriterion) => {
    const previousBestCriterion = payload.bestCriterion;

    const next = {
      ...payload,
      bestCriterion,
      bestToOthers: {
        ...payload.bestToOthers,
        [bestCriterion]: 1,
      },
      othersToWorst: { ...payload.othersToWorst },
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
    const previousWorstCriterion = payload.worstCriterion;

    const next = {
      ...payload,
      worstCriterion,
      bestToOthers: { ...payload.bestToOthers },
      othersToWorst: {
        ...payload.othersToWorst,
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
      ...payload,
      bestToOthers: {
        ...payload.bestToOthers,
        [criterionName]: normalizedValue,
      },
    });
  };

  const updateOthersToWorstValue = (criterionName, value) => {
    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setPayload({
      ...payload,
      othersToWorst: {
        ...payload.othersToWorst,
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
            value={payload.bestCriterion}
            onChange={(event) => updateBestCriterion(event.target.value)}
          >
            {names
              .filter((name) => name !== payload.worstCriterion)
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
              value: payload.bestToOthers[name],
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
            value={payload.worstCriterion}
            onChange={(event) => updateWorstCriterion(event.target.value)}
          >
            {names
              .filter((name) => name !== payload.bestCriterion)
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
              value: payload.othersToWorst[name],
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
