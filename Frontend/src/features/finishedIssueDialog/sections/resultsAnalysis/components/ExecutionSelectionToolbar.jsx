import { useState } from "react";
import { Box, Button, Checkbox, Chip, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";

import { executionSelectionToolbarSx } from "../resultsAnalysis.styles.js";

const ExecutionSelectionToolbar = ({ data, selectedExecutionKeys, onToggleExecution, onRemoveExecution }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const selectedSet = new Set(selectedExecutionKeys);

  return <Box sx={executionSelectionToolbarSx}>
    <Stack direction="row" spacing={0.8} alignItems="center">
      <CompareArrowsRoundedIcon sx={{ color: "secondary.light" }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>{data.selection.label}</Typography>
    </Stack>
    <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" sx={{ minWidth: 0, flex: 1 }}>
      {data.selected.map((execution) => <Chip key={execution.key} label={execution.displayLabel} title={execution.displayLabel} onDelete={data.selected.length > 1 ? () => onRemoveExecution(execution.key) : undefined} variant="outlined" sx={{ maxWidth: 260, borderColor: execution.color, color: "text.primary", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />)}
    </Stack>
    <Tooltip title={data.selection.canAddMore ? "Select executions" : "Maximum three executions"}>
      <span><Button size="small" color="secondary" variant="outlined" startIcon={<AddRoundedIcon />} disabled={!data.selection.canAddMore && !anchorEl} onClick={(event) => setAnchorEl(event.currentTarget)}>Executions</Button></span>
    </Tooltip>
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} slotProps={{ paper: { sx: { maxHeight: 360, minWidth: 300 } } }}>
      {data.selectableOptions.map((option) => {
        const selected = selectedSet.has(option.key);
        const disabled = !option.selectable || (!selected && !data.selection.canAddMore) || (selected && selectedExecutionKeys.length === 1);
        return <MenuItem key={option.key} disabled={disabled} onClick={() => onToggleExecution(option.key)}>
          <Checkbox color="secondary" checked={selected} disabled={disabled} />
          <ListItemText primary={option.displayLabel} secondary={option.selectable ? null : option.unavailableReason || "Ranking unavailable"} />
        </MenuItem>;
      })}
    </Menu>
  </Box>;
};

export default ExecutionSelectionToolbar;
