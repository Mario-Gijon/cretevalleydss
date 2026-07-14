import { Chip, List, ListItem, Stack, Typography } from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";

const OutcomePanel = ({ context, outcome }) => (
  <SectionCard title="Outcome" icon={<AssignmentTurnedInIcon fontSize="small" />}>
    <Stack spacing={1.1}>
      <Typography variant="body2" color="text.secondary">{context.executionLabel} · {context.phaseLabel}</Typography>
      {!outcome.available ? <Typography variant="body2" color="text.secondary">No ranking output is available for this execution.</Typography> : <List sx={{ width: "100%" }} disablePadding>{outcome.ranking.map((item) => <ListItem key={item.id} sx={{ px: 0, py: 0.9 }}><Stack direction="row" justifyContent="space-between" alignItems="center" width="100%" spacing={2}><Stack spacing={0.15} sx={{ minWidth: 0 }}><Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap title={item.name}>{item.position}. {item.name}</Typography>{item.description ? <Typography variant="caption" color="text.secondary">{item.description}</Typography> : null}</Stack>{item.score !== undefined ? <Chip label={item.formattedScore} variant="outlined" color={item.position === 1 ? "success" : "secondary"} /> : null}</Stack></ListItem>)}</List>}
    </Stack>
  </SectionCard>
);

export default OutcomePanel;
