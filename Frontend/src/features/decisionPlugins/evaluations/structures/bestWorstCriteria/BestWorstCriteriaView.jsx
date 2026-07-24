import { Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import BestWorstComparisonRow from "./components/BestWorstComparisonRow";
import { buildEmptyBestWorstCriteriaPayload } from "./operations/buildEmptyBestWorstCriteriaEvaluation";
import { getBestWorstCriterionItems } from "./operations/resolveBestWorstCriteriaItems";
import {
  updateBestCriterionSelection,
  updateBestWorstComparison,
  updateWorstCriterionSelection,
} from "./operations/updateBestWorstCriteriaEvaluation";

const BestWorstCriteriaView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  void collectiveEvaluation;
  const criterionItems = getBestWorstCriterionItems(decisionContext);
  const criterionIds = criterionItems.map((criterion) => criterion.id);
  const criterionNameById = new Map(
    criterionItems.map((criterion) => [criterion.id, criterion.name])
  );
  const currentPayload =
    evaluation &&
    typeof evaluation === "object" &&
    !Array.isArray(evaluation) &&
    Object.keys(evaluation).length > 0
      ? evaluation
      : buildEmptyBestWorstCriteriaPayload(criterionItems);
  const isReadOnly = readOnly === true || loading === true;

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

    setEvaluation(
      updateBestCriterionSelection({
        payload: currentPayload,
        criterionIds,
        bestCriterion,
      })
    );
  };

  const updateWorstCriterion = (worstCriterion) => {
    if (isReadOnly) {
      return;
    }

    setEvaluation(
      updateWorstCriterionSelection({
        payload: currentPayload,
        criterionIds,
        worstCriterion,
      })
    );
  };

  const updateBestToOthersValue = (criterionId, value) => {
    if (isReadOnly) {
      return;
    }

    const nextEvaluation = updateBestWorstComparison({
      payload: currentPayload,
      comparisonKey: "bestToOthers",
      criterionId,
      rawValue: value,
    });

    if (nextEvaluation !== currentPayload) {
      setEvaluation(nextEvaluation);
    }
  };

  const updateOthersToWorstValue = (criterionId, value) => {
    if (isReadOnly) {
      return;
    }

    const nextEvaluation = updateBestWorstComparison({
      payload: currentPayload,
      comparisonKey: "othersToWorst",
      criterionId,
      rawValue: value,
    });

    if (nextEvaluation !== currentPayload) {
      setEvaluation(nextEvaluation);
    }
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

          {bestComparisonIds.map((criterionId) => (
            <BestWorstComparisonRow
              key={criterionId}
              criterionId={criterionId}
              criterionName={criterionNameById.get(criterionId) || criterionId}
              value={currentPayload.bestToOthers[criterionId]}
              labelColumnWidth={labelColumnWidth}
              readOnly={isReadOnly}
              onChange={updateBestToOthersValue}
            />
          ))}
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

          {worstComparisonIds.map((criterionId) => (
            <BestWorstComparisonRow
              key={criterionId}
              criterionId={criterionId}
              criterionName={criterionNameById.get(criterionId) || criterionId}
              value={currentPayload.othersToWorst[criterionId]}
              labelColumnWidth={labelColumnWidth}
              readOnly={isReadOnly}
              onChange={updateOthersToWorstValue}
            />
          ))}
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Use integer values from 1 to 9.
      </Typography>
    </Stack>
  );
};

export default BestWorstCriteriaView;
