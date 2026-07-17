import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import { Box, Chip, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material";

import { executionCardDescriptionSx, executionCardIconSx, executionCardSx } from "../models.styles.js";

const ExecutionCard = ({ execution, formattedComputedAt, onSelect, onRemove }) => {
  const isBase = execution.type === "base";

  return (
    <Box component="article" role="button" tabIndex={0} aria-pressed={execution.selected}
      onClick={() => onSelect(execution.key)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(execution.key);
        }
      }} sx={executionCardSx(execution.selected, execution.failed)}>
      <Stack direction="row" alignItems="flex-start" spacing={1.15}>
        <Box sx={executionCardIconSx}>{isBase ? <LayersRoundedIcon /> : <ShowChartRoundedIcon />}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.8} alignItems="center">
            <Typography noWrap title={execution.name} sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 950 }}>{execution.name}</Typography>
            {isBase ? <Chip size="small" color="secondary" variant="outlined" label="Base" sx={{ height: 23, fontWeight: 900 }} /> : null}
          </Stack>
          <Typography noWrap title={execution.modelName} sx={{ mt: 0.2, color: "secondary.light", fontSize: 13, fontWeight: 900 }}>{execution.modelName}</Typography>
        </Box>
        <Box sx={{ width: 40, minWidth: 40, display: "flex", justifyContent: "flex-end" }}>
          {execution.removable ? (
            <Tooltip title="Remove scenario">
              <IconButton
                size="small"
                color="error"
                aria-label={`Remove ${execution.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(execution.key);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") event.stopPropagation();
                }}
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Base execution cannot be removed">
              <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <IconButton size="small" disabled aria-label="Base execution cannot be removed">
                  <LockRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Stack>
      <Typography title={execution.description} sx={executionCardDescriptionSx}>{execution.description}</Typography>
      {execution.failed && execution.error ? <Typography title={execution.error} sx={{ mt: -0.7, mb: 1, color: "error.light", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{execution.error}</Typography> : null}
      <Box sx={{ mt: "auto", pt: 1.2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Stack direction="row" spacing={0.7} alignItems="center"><CalendarMonthRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <Box><Typography sx={{ color: "text.secondary", fontSize: 10.5, fontWeight: 800 }}>Computed at</Typography><Typography sx={{ fontSize: 12, fontWeight: 800 }}>{formattedComputedAt || "—"}</Typography></Box>
        </Stack>
        <Link href={execution.paperUrl} target="_blank" rel="noreferrer noopener" underline="none" onClick={(event) => event.stopPropagation()} sx={{ mt: 1, display: "inline-flex", alignItems: "center", gap: 0.55, color: "secondary.light", fontSize: 12.5, fontWeight: 900 }}>View paper <LaunchRoundedIcon sx={{ fontSize: 16 }} /></Link>
      </Box>
    </Box>
  );
};

export default ExecutionCard;
