import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { formatWeightValue } from "../adminIssues.utils";
import AdminInfoRow from "./AdminInfoRow";

/**
 * Vista de solo lectura para pesos del experto en admin issues.
 *
 * @param {object} props
 * @param {object} props.data
 * @returns {JSX.Element}
 */
const AdminReadOnlyWeights = ({
  data,
  leafCriteria = [],
  finalWeights = {},
}) => {
  const theme = useTheme();

  if (!data?.weights) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No weights information available.
      </Typography>
    );
  }

  const { weights } = data;
  const kind = weights.kind;
  const expertWeightsByCriterion = weights.manualWeights || weights.singleLeafAutoWeights || null;
  const criteriaWeightsStatus = weights?.status || "notSubmitted";
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

  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>
        {weights?.structureLabel || "Criteria weights"}
      </Typography>

      {Array.isArray(criteriaRows) && criteriaRows.length > 0 ? (
        <TableContainer
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            bgcolor: alpha(theme.palette.common.white, 0.02),
            overflowX: "auto",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf", minWidth: 160 }}>
                  Criterion
                </TableCell>
                <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf", minWidth: 140 }}>
                  Expert weight
                </TableCell>
                <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf", minWidth: 140 }}>
                  Final weight
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {criteriaRows.map((criterion) => {
                const criterionName = criterion?.name || "—";
                const expertRawValue = expertWeightsByCriterion?.[criterionName];
                const hasExpertValue = Number.isFinite(Number(expertRawValue));

                return (
                  <TableRow key={criterion?.id || criterionName}>
                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        {criterionName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 850 }}>
                        {hasExpertValue
                          ? formatWeightValue(Number(expertRawValue))
                          : criteriaWeightsStatus === "notRequired"
                            ? "Not required"
                            : criteriaWeightsStatus === "notSubmitted"
                              ? "Not submitted"
                              : criteriaWeightsStatus === "draft"
                                ? "Draft"
                                : "Unavailable"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 850 }}>
                        {formatWeightValue(finalWeights?.[criterionName])}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {kind === "bestWorstCriteria" ? (
        <Stack spacing={1.1}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            Per-criterion expert weights are unavailable for this structure.
          </Typography>
          <AdminInfoRow label="Best criterion" value={weights?.bwmData?.bestCriterion || "—"} />
          <AdminInfoRow label="Worst criterion" value={weights?.bwmData?.worstCriterion || "—"} />
        </Stack>
      ) : null}
    </Stack>
  );
};

export default AdminReadOnlyWeights;
