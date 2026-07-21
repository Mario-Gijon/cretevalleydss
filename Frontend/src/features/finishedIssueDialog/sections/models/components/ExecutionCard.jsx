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
      }} sx={executionCardSx(execution.selected)}>
      <Stack direction="row" alignItems="flex-start" spacing={1.15}>
        <Box sx={executionCardIconSx}>{isBase ? <LayersRoundedIcon /> : <ShowChartRoundedIcon />}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.8} alignItems="center">
            <Typography variant="h6" component="h2" noWrap title={execution.name}>{execution.name}</Typography>
            {isBase ? <Chip size="small" color="secondary" variant="outlined" label="Base" sx={{ height: 23, fontWeight: 900 }} /> : null}
          </Stack>
          <Typography variant="body2" noWrap title={execution.modelName} sx={{ mt: 0.2, color: "secondary.light", fontWeight: "fontWeightBold" }}>{execution.modelName}</Typography>
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
      <Typography variant="body2" title={execution.description} sx={executionCardDescriptionSx}>{execution.description}</Typography>
      <Box sx={{ mt: "auto", pt: 1.2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Stack direction="row" spacing={0.7} alignItems="center"><CalendarMonthRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <Box><Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "fontWeightBold" }}>Computed at</Typography><Typography variant="body2" sx={{ fontWeight: "fontWeightBold" }}>{formattedComputedAt || "—"}</Typography></Box>
        </Stack>
        <Link href={execution.paperUrl} target="_blank" rel="noreferrer noopener" underline="none" onClick={(event) => event.stopPropagation()} variant="body2" sx={{ mt: 1, display: "inline-flex", alignItems: "center", gap: 0.55, color: "secondary.light", fontWeight: "fontWeightBold" }}>View paper <LaunchRoundedIcon sx={{ fontSize: 16 }} /></Link>
      </Box>
    </Box>
  );
};

export default ExecutionCard;
