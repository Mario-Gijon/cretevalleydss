import { forwardRef, useImperativeHandle } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { inputSx, sectionSx } from "../../styles/evaluationStructure.styles";

const ManualCriteriaWeightsView = (
  {
    evaluationContext,
    evaluationPayload,
    setEvaluationPayload,
    readOnly,
    loading,
  },
  ref
) => {
  const theme = useTheme();
  const criterionNames = Array.isArray(evaluationContext?.criteria?.leafNames)
    ? evaluationContext.criteria.leafNames
    : [];
  const isReadOnly = readOnly === true || loading === true;
  const weightsByCriterion =
    evaluationPayload &&
    typeof evaluationPayload === "object" &&
    !Array.isArray(evaluationPayload)
      ? evaluationPayload.weightsByCriterion || {}
      : {};

  useImperativeHandle(ref, () => ({}));

  if (criterionNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.2} sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Box sx={{ ...sectionSx(theme), width: "100%", maxWidth: "none", minWidth: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Rate each criterion between 0 and 1
          </Typography>

          <Box sx={{ ...inputSx(theme), width: "100%", minWidth: 0 }}>
            <Stack spacing={1.1} sx={{ pt: 1 }}>
              {criterionNames.map((criterionName) => (
                <TextField
                  key={criterionName}
                  label={criterionName}
                  type="number"
                  size="small"
                  color="info"
                  disabled={isReadOnly}
                  value={weightsByCriterion[criterionName] ?? ""}
                  onChange={(event) => {
                    if (isReadOnly) {
                      return;
                    }

                    const raw = event.target.value;
                    setEvaluationPayload((previous) => ({
                      ...(previous && typeof previous === "object" ? previous : {}),
                      weightsByCriterion: {
                        ...((previous && previous.weightsByCriterion) || {}),
                        [criterionName]: raw === "" ? "" : Number(raw),
                      },
                    }));
                  }}
                  inputProps={{ min: 0, max: 1, step: 0.01 }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};

export default forwardRef(ManualCriteriaWeightsView);
