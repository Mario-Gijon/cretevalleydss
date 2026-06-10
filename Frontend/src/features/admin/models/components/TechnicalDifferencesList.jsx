import { Paper, Stack, Typography } from "@mui/material";

import { getAdminIssueDetailCardSx } from "../../issues/styles/adminIssues.styles";
import { asArray, valueToText } from "../utils/modelManifest.formatters";
import EmptyState from "./EmptyState";

export default function TechnicalDifferencesList({ differences }) {
  const items = asArray(differences);

  if (items.length === 0) return <EmptyState>No technical differences.</EmptyState>;

  return (
    <Stack spacing={0.75}>
      {items.map((difference, index) => (
        <Paper
          key={`${difference?.field || "field"}-${index}`}
          elevation={0}
          sx={(theme) => ({ ...getAdminIssueDetailCardSx(theme), p: 1 })}
        >
          <Stack spacing={0.35}>
            <Typography variant="body2" sx={{ fontWeight: 950 }}>
              {difference?.field || "Unknown field"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
              Mongo: {valueToText(difference?.mongoValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
              Manifest: {valueToText(difference?.manifestValue)}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
