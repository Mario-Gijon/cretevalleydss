import {
  Stack,
  Typography,
} from "@mui/material";
import { EVALUATION_STAGES } from "../../../decisionPlugins/evaluations/evaluationStages";
import EvaluationStructureRenderer from "../../../issueEvaluation/components/EvaluationStructureRenderer";

/**
 * Vista de solo lectura para pesos del experto en admin issues.
 *
 * @param {object} props
 * @param {object} props.data
 * @returns {JSX.Element}
 */
const AdminIssueReadOnlyWeights = ({
  data,
  leafCriteria = [],
}) => {
  if (!data?.weights) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No weights information available.
      </Typography>
    );
  }

  const { weights } = data;
  const criteriaRows =
    Array.isArray(weights?.leafCriteriaDetailed) && weights.leafCriteriaDetailed.length > 0
      ? weights.leafCriteriaDetailed.map((criterion) => ({
        id: criterion.criterionId,
        name: criterion.criterionName,
        type: criterion.type,
        expressionDomain: criterion.expressionDomain,
      }))
      : leafCriteria.map((criterion) => ({
        id: criterion?.id || criterion?._id || criterion?.name,
        name: criterion?.name,
        type: criterion?.type || null,
        expressionDomain: criterion?.expressionDomain || null,
      }));
  const hasCanonicalPayload =
    weights?.payload &&
    typeof weights.payload === "object" &&
    !Array.isArray(weights.payload);

  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>
        {weights?.structureLabel || "Criteria weights"}
      </Typography>

      {!weights?.structureKey || !hasCanonicalPayload ? (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          {weights?.status === "notRequired"
            ? "Criteria weights are not required for this issue."
            : weights?.kind === "singleLeaf"
              ? "Single-criterion weights are resolved automatically."
              : "No criteria-weight payload available."}
        </Typography>
      ) : !weights?.structureKey ? (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          Criteria-weighting structure does not expose a reusable renderer.
        </Typography>
      ) : (
        <EvaluationStructureRenderer
          evaluationContext={weights?.evaluationContext || null}
          issue={{
            criteria: criteriaRows.map((criterion) => ({
              ...criterion,
              children: [],
            })),
          }}
          stage={EVALUATION_STAGES.CRITERIA_WEIGHTING}
          structureKey={weights?.structureKey || ""}
          backendPayload={weights.payload}
          readOnly
        />
      )}
    </Stack>
  );
};

export default AdminIssueReadOnlyWeights;
