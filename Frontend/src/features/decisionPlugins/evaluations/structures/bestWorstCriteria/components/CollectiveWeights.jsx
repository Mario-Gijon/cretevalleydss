import { Stack, Typography } from "@mui/material";

import { formatCollectiveDisplayValue } from "../../../shared/formatCollectiveDisplayValue";
import { collectiveWeightsSx } from "./CollectiveWeights.styles";

const CollectiveWeights = ({ criteria, weightsByCriterion }) => (
  <Stack spacing={0.65} sx={collectiveWeightsSx.container}>
    <Typography variant="subtitle1" sx={collectiveWeightsSx.title}>
      Collective criterion weights
    </Typography>
    {criteria.map((criterion) => (
      <Stack
        key={criterion.id}
        direction="row"
        spacing={2}
        sx={collectiveWeightsSx.row}
      >
        <Typography variant="body2" sx={collectiveWeightsSx.label}>
          {criterion.name}
        </Typography>
        <Typography variant="body2" sx={collectiveWeightsSx.value}>
          {formatCollectiveDisplayValue(weightsByCriterion[criterion.id])}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

export default CollectiveWeights;
