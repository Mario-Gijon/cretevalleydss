import { Chip, Stack, Typography } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";

import OverviewCardShell, { MetaText } from "../OverviewCardShell";

const ResultsSummaryCard = ({ results, onViewResults }) => (
  <OverviewCardShell title="Results summary" icon={<AssessmentIcon fontSize="small" />} actionLabel="View full ranking" onAction={onViewResults}>
    {results.available ? (
      <Stack spacing={0.6}>
        {results.items.map((item, index) => (
          <Stack key={item.id || index} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 850, minWidth: 0 }}>{index + 1}. {item.name || "—"}</Typography>
            {item.score !== undefined ? <Chip size="small" variant="outlined" color={index === 0 ? "success" : "secondary"} label={item.formattedScore} /> : null}
          </Stack>
        ))}
        <MetaText>{results.phaseLabel}</MetaText>
      </Stack>
    ) : (
      <Typography variant="body2" color="text.secondary">No ranking output is available for this execution.</Typography>
    )}
  </OverviewCardShell>
);

export default ResultsSummaryCard;
