import { forwardRef, useImperativeHandle } from "react";
import { Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import {
  buildEmptyBestWorstCriteriaPayload,
  getBestWorstCriterionItems,
} from "./bestWorstCriteria.payload";

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

const BestWorstCriteriaView = (
  {
    evaluationContext,
    evaluationPayload,
    setEvaluationPayload,
    readOnly,
    loading,
  },
  ref
) => {
  const criterionItems = getBestWorstCriterionItems(evaluationContext);
  const criterionIds = criterionItems.map((criterion) => criterion.id);
  const criterionNameById = new Map(
    criterionItems.map((criterion) => [criterion.id, criterion.name])
  );
  const currentPayload =
    evaluationPayload &&
    typeof evaluationPayload === "object" &&
    !Array.isArray(evaluationPayload) &&
    Object.keys(evaluationPayload).length > 0
      ? evaluationPayload
      : buildEmptyBestWorstCriteriaPayload(criterionItems);
  const isReadOnly = readOnly === true || loading === true;

  useImperativeHandle(ref, () => ({}));

  const bestComparisonIds = criterionIds.filter(
    (criterionId) => criterionId !== currentPayload.bestCriterion
  );
  const worstComparisonIds = criterionIds.filter(
    (criterionId) => criterionId !== currentPayload.worstCriterion
  );
  const longestCriterionLength = criterionItems.reduce(
    (max, criterion) => Math.max(max, String(criterion.name).length),
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

    if (criterionIds.length > 1 && next.worstCriterion === next.bestCriterion) {
      next.worstCriterion =
        criterionIds.find((criterionId) => criterionId !== next.bestCriterion) ||
        next.worstCriterion;
      next.othersToWorst[next.worstCriterion] = 1;
    }

    setEvaluationPayload(next);
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

    if (criterionIds.length > 1 && next.bestCriterion === next.worstCriterion) {
      next.bestCriterion =
        criterionIds.find((criterionId) => criterionId !== next.worstCriterion) ||
        next.bestCriterion;
      next.bestToOthers[next.bestCriterion] = 1;
    }

    setEvaluationPayload(next);
  };

  const updateBestToOthersValue = (criterionId, value) => {
    if (isReadOnly) {
      return;
    }

    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setEvaluationPayload({
      ...currentPayload,
      bestToOthers: {
        ...currentPayload.bestToOthers,
        [criterionId]: normalizedValue,
      },
    });
  };

  const updateOthersToWorstValue = (criterionId, value) => {
    if (isReadOnly) {
      return;
    }

    const normalizedValue = normalizeScaleInput(value);
    if (normalizedValue === null) return;

    setEvaluationPayload({
      ...currentPayload,
      othersToWorst: {
        ...currentPayload.othersToWorst,
        [criterionId]: normalizedValue,
      },
    });
  };

  const renderComparisonRow = ({ criterionId, value, onChange }) => {
    const criterionName = criterionNameById.get(criterionId) || criterionId;

    return (
      <Stack
        key={criterionId}
        direction={{ xs: "column", sm: "row" }}
        spacing={0.75}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
      <Typography
        variant="body2"
        noWrap
        title={criterionName}
        sx={{
          width: { xs: "auto", sm: labelColumnWidth },
          flexShrink: 0,
        }}
      >
        {criterionName}
      </Typography>

      <TextField
        variant="outlined"
        type="number"
        size="small"
        color="info"
        disabled={isReadOnly}
        value={value ?? ""}
        onKeyDown={preventInvalidNumberKeys}
        onChange={(event) => onChange(criterionId, event.target.value)}
        inputProps={{ min: 1, max: 9, step: 1 }}
        sx={{ width: { xs: "100%", sm: 96 } }}
      />
      </Stack>
    );
  };

  if (criterionIds.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No criteria available.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25} sx={{ pt: 1.5, width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 5 }}
        alignItems="flex-start"
        sx={{ width: "100%", minWidth: 0 }}
      >
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
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
            {criterionItems
              .filter((criterion) => criterion.id !== currentPayload.worstCriterion)
              .map((criterion) => (
                <MenuItem key={criterion.id} value={criterion.id}>
                  {criterion.name}
                </MenuItem>
              ))}
          </TextField>

          <Typography variant="subtitle1">Best to others</Typography>

          {bestComparisonIds.map((criterionId) =>
            renderComparisonRow({
              criterionId,
              value: currentPayload.bestToOthers[criterionId],
              onChange: updateBestToOthersValue,
            })
          )}
        </Stack>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: "none", md: "block" } }}
        />

        <Divider
          sx={{
            display: { xs: "block", md: "none" },
            width: "100%",
          }}
        />

        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
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
            {criterionItems
              .filter((criterion) => criterion.id !== currentPayload.bestCriterion)
              .map((criterion) => (
                <MenuItem key={criterion.id} value={criterion.id}>
                  {criterion.name}
                </MenuItem>
              ))}
          </TextField>

          <Typography variant="subtitle1">Others to worst</Typography>

          {worstComparisonIds.map((criterionId) =>
            renderComparisonRow({
              criterionId,
              value: currentPayload.othersToWorst[criterionId],
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

export default forwardRef(BestWorstCriteriaView);
