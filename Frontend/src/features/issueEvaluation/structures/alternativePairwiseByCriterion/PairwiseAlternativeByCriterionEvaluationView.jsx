import { Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import PairwiseAlternativeMatrix from "./PairwiseAlternativeMatrix";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const PairwiseAlternativeByCriterionEvaluationView = ({
  alternatives = [],
  criterionNames = [],
  evaluationsByCriterion = {},
  collectiveEvaluationsByCriterion = {},
  permitEdit = false,
}) => {
  const theme = useTheme();
  const resolvedCriteria =
    Array.isArray(criterionNames) && criterionNames.length > 0
      ? criterionNames
      : Object.keys(isPlainObject(evaluationsByCriterion) ? evaluationsByCriterion : {});

  if (resolvedCriteria.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No pairwise evaluations found.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.2}>
      {resolvedCriteria.map((criterionName) => (
        <Paper
          key={criterionName}
          elevation={0}
          sx={{
            p: 1,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            bgcolor: alpha(theme.palette.common.white, 0.02),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 0.85 }}>
            {criterionName}
          </Typography>

          <PairwiseAlternativeMatrix
            alternatives={alternatives}
            evaluations={evaluationsByCriterion?.[criterionName] || []}
            setEvaluations={() => {}}
            collectiveEvaluations={collectiveEvaluationsByCriterion?.[criterionName] || []}
            permitEdit={permitEdit}
          />
        </Paper>
      ))}
    </Stack>
  );
};

export default PairwiseAlternativeByCriterionEvaluationView;
