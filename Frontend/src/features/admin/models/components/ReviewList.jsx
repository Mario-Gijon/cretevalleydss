import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { getAdminIssueDetailCardSx } from "../../issues/styles/adminIssues.styles";
import { asArray } from "../utils/modelManifest.formatters";
import StatusChip from "./StatusChip";

export default function ReviewList({
  title,
  items,
  renderItem,
  emptyText = "No review items detected.",
}) {
  const list = asArray(items);

  return (
    <Accordion
      defaultExpanded={list.length > 0}
      disableGutters
      sx={(theme) => ({
        bgcolor: alpha(theme.palette.common.white, 0.035),
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        borderRadius: 2,
        "&:before": { display: "none" },
      })}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 980 }}>
            {title}
          </Typography>
          <StatusChip label={String(list.length)} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {list.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            {emptyText}
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {list.map((item, index) => (
              <Paper
                key={`${title}-${index}`}
                elevation={0}
                sx={(theme) => ({ ...getAdminIssueDetailCardSx(theme), p: 1 })}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: 850, overflowWrap: "anywhere" }}
                >
                  {renderItem(item)}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
