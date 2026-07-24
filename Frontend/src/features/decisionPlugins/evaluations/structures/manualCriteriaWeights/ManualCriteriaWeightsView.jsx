import { Box, Stack, Typography } from "@mui/material";

import ManualCriterionWeightField from "./components/ManualCriterionWeightField";
import { resolveManualCriteriaWeightItems } from "./operations/resolveManualCriteriaWeightItems";
import {
  resolveCollectiveManualCriteriaWeights,
  resolveManualCriteriaWeights,
} from "./operations/resolveManualCriteriaWeights";
import { updateManualCriterionWeight } from "./operations/updateManualCriterionWeight";

const ManualCriteriaWeightsView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const criteria = resolveManualCriteriaWeightItems(decisionContext);
  const isReadOnly = readOnly === true || loading === true;
  const weightsByCriterion = resolveManualCriteriaWeights(evaluation);
  const collectiveWeightsByCriterion =
    resolveCollectiveManualCriteriaWeights(collectiveEvaluation);

  if (criteria.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.2} sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Box sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Rate each criterion between 0 and 1
          </Typography>

          <Box sx={{ width: "100%", minWidth: 0 }}>
            <Stack spacing={1.1} sx={{ pt: 1 }}>
              {criteria.map((criterion) => (
                <ManualCriterionWeightField
                  key={criterion.id}
                  criterion={criterion}
                  value={weightsByCriterion[criterion.id]}
                  collectiveValue={collectiveWeightsByCriterion[criterion.id]}
                  readOnly={isReadOnly}
                  onChange={(rawValue) =>
                    setEvaluation(
                      updateManualCriterionWeight({
                        evaluation,
                        criterionId: criterion.id,
                        rawValue,
                      })
                    )
                  }
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};

export default ManualCriteriaWeightsView;
