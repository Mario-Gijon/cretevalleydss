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
  evaluationViewContext,
}) => {
  const {
    criteria,
    payload: payloadContext,
    ui,
  } = evaluationViewContext || {};
  const names = Array.isArray(criteria?.leafItems)
    ? criteria.leafItems
        .map((criterion) =>
          typeof criterion === "string"
            ? criterion
            : String(criterion?.name || criterion?.criterionName || "").trim()
        )
        .filter(Boolean)
    : Array.isArray(criteria?.leafNames)
      ? criteria.leafNames
      : [];
  const providedPayload = payloadContext?.value ?? {};
  const currentPayload =
    providedPayload && Object.keys(providedPayload).length > 0
      ? providedPayload
      : buildEmptyBestWorstCriteriaPayload(names);
  const setPayload = payloadContext?.setValue;
  const isReadOnly = ui?.readOnly === true || ui?.loading === true;

  const bestComparisonNames = names.filter((name) => name !== currentPayload.bestCriterion);
  const worstComparisonNames = names.filter((name) => name !== currentPayload.worstCriterion);

  const longestCriterionLength = names.reduce(
    (max, name) => Math.max(max, String(name).length),
    0
  );

  const labelColumnWidth = `${Math.min(
    Math.max(longestCriterionLength + 2, 10),
    28
  )}ch`;

  const updateBestCriterion = (bestCriterion) => {
    if (isReadOnly) {
      return;
    }

    const previousBestCriterion = currentPayload.bestCriterion;

    const next = {
      ...currentPayload,
      bestCriterion,
      bestToOthers: {
        ...currentPayload.bestToOthers,
        [bestCriterion]: 1,
      },
      othersToWorst: { ...currentPayload.othersToWorst },
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
    if (isReadOnly) {
      return;
    }

    const previousWorstCriterion = currentPayload.worstCriterion;

    const next = {
      ...currentPayload,
      worstCriterion,
      bestToOthers: { ...currentPayload.bestToOthers },
      othersToWorst: {
        ...currentPayload.othersToWorst,
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
    if (isReadOnly) {
      return;
    }

    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setPayload({
      ...currentPayload,
      bestToOthers: {
        ...currentPayload.bestToOthers,
        [criterionName]: normalizedValue,
      },
    });
  };

  const updateOthersToWorstValue = (criterionName, value) => {
    if (isReadOnly) {
      return;
    }

    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setPayload({
      ...currentPayload,
      othersToWorst: {
        ...currentPayload.othersToWorst,
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
        disabled={isReadOnly}
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
            disabled={isReadOnly}
            value={currentPayload.bestCriterion}
            onChange={(event) => updateBestCriterion(event.target.value)}
          >
            {names
              .filter((name) => name !== currentPayload.worstCriterion)
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
              value: currentPayload.bestToOthers[name],
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
            disabled={isReadOnly}
            value={currentPayload.worstCriterion}
            onChange={(event) => updateWorstCriterion(event.target.value)}
          >
            {names
              .filter((name) => name !== currentPayload.bestCriterion)
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
              value: currentPayload.othersToWorst[name],
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
