import { useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import { collectiveResultSx } from "../styles/CriteriaPairwiseAHPView.styles";

const percent = (value) => `${(Number(value) * 100).toFixed(2)}%`;
const number = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "—";
const statusLabel = (status) => {
  if (status === "consistent") return "Consistent";
  if (status === "review") return "Review suggested";
  return "Not applicable";
};

const CollectiveAHPResult = ({ criteria, result }) => {
  const expertRows = useMemo(() => {
    const expertWeights = result?.expertWeightsByExpert || {};
    const diagnostics = result?.expertDiagnosticsByExpert || {};
    return Object.entries(expertWeights).map(([expertKey, weightsByCriterion]) => ({
      expertKey,
      weightsByCriterion,
      diagnostics: diagnostics[expertKey] || {},
      name: diagnostics[expertKey]?.expertName || expertKey,
    }));
  }, [result]);

  return (
    <Stack spacing={0.9} sx={collectiveResultSx.container}>
      <Typography variant="subtitle2" sx={collectiveResultSx.heading}>
        Collective criterion weights
      </Typography>
      <Stack spacing={0.55}>
        {criteria.map((criterion) => (
          <Stack
            key={criterion.id}
            direction="row"
            justifyContent="space-between"
            spacing={1}
            sx={collectiveResultSx.weightRow}
          >
            <Typography variant="body2" sx={collectiveResultSx.criterionName}>
              {criterion.name}
            </Typography>
            <Typography variant="body2" sx={collectiveResultSx.weight}>
              {percent(result.weightsByCriterion[criterion.id])}
            </Typography>
          </Stack>
        ))}
      </Stack>
      {expertRows.length ? (
        <>
          <Divider sx={collectiveResultSx.divider} />
          <Typography variant="caption" sx={collectiveResultSx.subheading}>
            Individual priorities and consistency
          </Typography>
          {expertRows.map(({ expertKey, name, weightsByCriterion, diagnostics }) => (
            <Accordion
              key={expertKey}
              disableGutters
              elevation={0}
              sx={collectiveResultSx.expertAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 0.1, sm: 1.1 }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  sx={{ minWidth: 0 }}
                >
                  <Typography variant="body2" sx={collectiveResultSx.expertName}>
                    {name}
                  </Typography>
                  <Typography variant="caption" sx={collectiveResultSx.expertStatus}>
                    {statusLabel(diagnostics.consistencyStatus)}
                    {diagnostics.consistencyRatio === null || diagnostics.consistencyRatio === undefined
                      ? ""
                      : ` · CR ${number(diagnostics.consistencyRatio)}`}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={0.55}>
                  <Typography variant="caption" sx={collectiveResultSx.diagnosticLine}>
                    CI {number(diagnostics.consistencyIndex)} · λmax {number(diagnostics.lambdaMax)} · {diagnostics.completedComparisons ?? 0}/{diagnostics.requiredComparisons ?? 0} comparisons
                  </Typography>
                  {criteria.map((criterion) => (
                    <Stack
                      key={criterion.id}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="caption" sx={collectiveResultSx.criterionName}>
                        {criterion.name}
                      </Typography>
                      <Typography variant="caption" sx={collectiveResultSx.weight}>
                        {percent(weightsByCriterion?.[criterion.id])}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      ) : null}
      {result.aggregation?.method === "mcc" ? (
        <Typography variant="caption" sx={collectiveResultSx.aggregation}>
          Group weights use the existing MCC method over individual AHP priorities.
        </Typography>
      ) : null}
    </Stack>
  );
};

export default CollectiveAHPResult;
