import { useMemo, useState } from "react";
import { Stack, TextField, Button, List, Divider, Collapse, Typography, Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import { TransitionGroup } from "react-transition-group";

import { addAlternative, removeAlternative, saveEditAlternative } from "../../../../src/utils/createIssueUtils.js";
import { AlternativeItem } from "../../../../src/components/AlternativeItem/AlternativeItem.jsx";

const inputSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: alpha(theme.palette.common.white, 0.04),
  },
});

const listSx = (theme) => ({
  borderRadius: 4,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.02),
  overflow: "hidden",
  maxHeight: "52vh",
  minHeight: 0,
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.common.white, 0.16),
    borderRadius: 999,
    border: `2px solid transparent`,
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: alpha(theme.palette.common.white, 0.24) },
});

export const AlternativesStep = ({ alternatives, setAlternatives }) => {
  const theme = useTheme();

  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [editingAlternative, setEditingAlternative] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(null);

  const reversed = useMemo(() => alternatives.slice().reverse(), [alternatives]);

  const handleAddAlternative = () => {
    addAlternative(inputValue, alternatives, setAlternatives, setInputValue, setInputError);
  };

  const handleRemoveAlternative = (item) => removeAlternative(item, setAlternatives);

  const handleSaveEdit = () => {
    saveEditAlternative(editValue, editingAlternative, alternatives, setAlternatives, setEditingAlternative, setEditValue, setEditError);
  };

  const handleEditAlternative = (item) => {
    setEditingAlternative(item);
    setEditValue(item);
    setEditError(null);
  };

  return (
    <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 1250, mx: "auto", minHeight: 0 }}>
      {/* Mini header (sin caja) */}
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Alternatives
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {alternatives.length} added
        </Typography>
      </Stack>

      {/* Input row (plano) */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
      >
        <TextField
          variant="outlined"
          placeholder="Alternative"
          autoComplete="off"
          size="small"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setInputError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAddAlternative()}
          error={!!inputError}
          helperText={inputError}
          color="info"
          sx={{ flex: 1, ...inputSx(theme) }}
        />

        <Button
          startIcon={<AddIcon />}
          sx={{ width: { xs: "100%", sm: "auto" } }}
          color="info"
          variant="outlined"
          onClick={handleAddAlternative}
          disabled={!inputValue.trim()}
        >
          Add
        </Button>
      </Stack>

      {/* Lista (UNA sola “superficie”) */}
      {alternatives.length === 0 ? (
        <Box
          sx={{
            mt: 0.5,
            borderRadius: 4,
            border: `1px dashed ${alpha(theme.palette.common.white, 0.14)}`,
            bgcolor: alpha(theme.palette.common.white, 0.015),
            p: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            No alternatives yet. Add at least 2 to compare properly.
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={listSx(theme)}>
          <TransitionGroup>
            {reversed.map((item, idx) => (
              <Collapse key={item}>
                <AlternativeItem
                  item={item}
                  editingAlternative={editingAlternative}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  setEditError={setEditError}
                  editError={editError}
                  handleSaveEdit={handleSaveEdit}
                  handleEditAlternative={handleEditAlternative}
                  handleRemoveAlternative={handleRemoveAlternative}
                />
                {idx !== reversed.length - 1 ? (
                  <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.07) }} />
                ) : null}
              </Collapse>
            ))}
          </TransitionGroup>
        </List>
      )}
    </Stack>
  );
};
