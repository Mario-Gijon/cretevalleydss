import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import {
  formatDateTime,
  formatWeightValue,
  objectEntriesSafe,
} from "../adminIssues.utils";
import AdminInfoRow from "./AdminInfoRow";
import AdminMetaChip from "./AdminMetaChip";

/**
 * Vista de solo lectura para pesos del experto en admin issues.
 *
 * @param {object} props
 * @param {object} props.data
 * @returns {JSX.Element}
 */
const AdminReadOnlyWeights = ({ data }) => {
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

  const renderMapRows = (obj) => {
    const entries = objectEntriesSafe(obj);

    if (!entries.length) {
      return (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          No data.
        </Typography>
      );
    }

    return (
      <Stack spacing={0.75}>
        {entries.map(([key, value]) => (
          <Stack
            key={key}
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{
              p: 0.85,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.common.white, 0.03),
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>
              {key}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 850 }}>
              {formatWeightValue(value)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <AdminMetaChip tone="secondary">{kind || "unknown"}</AdminMetaChip>
        {weights?.weightDoc?.completed ? <AdminMetaChip tone="success">Completed</AdminMetaChip> : <AdminMetaChip tone="warning">Draft / pending</AdminMetaChip>}
        {weights?.weightDoc?.updatedAt ? (
          <AdminMetaChip tone="info">{formatDateTime(weights.weightDoc.updatedAt)}</AdminMetaChip>
        ) : null}
      </Stack>

      {kind === "singleLeaf" ? renderMapRows(weights.singleLeafAutoWeights || {}) : null}

      {kind === "manualConsensus" ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
            Manual weights
          </Typography>
          {renderMapRows(weights.manualWeights || {})}
        </Box>
      ) : null}

      {kind === "bwm" ? (
        <Stack spacing={1.1}>
          <AdminInfoRow label="Best criterion" value={weights?.bwmData?.bestCriterion || "—"} />
          <AdminInfoRow label="Worst criterion" value={weights?.bwmData?.worstCriterion || "—"} />

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
              Best to others
            </Typography>
            {renderMapRows(weights?.bwmData?.bestToOthers || {})}
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
              Others to worst
            </Typography>
            {renderMapRows(weights?.bwmData?.othersToWorst || {})}
          </Box>
        </Stack>
      ) : null}

      {weights?.resolvedWeights ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
            Resolved / final weights in issue
          </Typography>
          {renderMapRows(weights.resolvedWeights)}
        </Box>
      ) : null}
    </Stack>
  );
};

export default AdminReadOnlyWeights;
