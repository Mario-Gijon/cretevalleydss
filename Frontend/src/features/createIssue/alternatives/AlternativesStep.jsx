import { useMemo, useState } from "react";
import {
  Stack,
  TextField,
  Button,
  List,
  Divider,
  Collapse,
  Typography,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { TransitionGroup } from "react-transition-group";

import {
  addAlternative,
  removeAlternative,
  saveEditAlternative,
} from "../logic/createIssueAlternatives";
import { AlternativeItem } from "./components/AlternativeItem.jsx";
import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueRowDividerSx,
  getCreateIssueStepEmptyStateSx,
  getCreateIssueStepInputSx,
  getCreateIssueStepScrollableSx,
} from "../styles/createIssueStep.styles";

export const AlternativesStep = () => {
  const theme = useTheme();
  const { alternatives, setAlternatives } = useCreateIssueContext();

  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [editingAlternative, setEditingAlternative] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(null);
  const [openRemoveAlternativeDialog, setOpenRemoveAlternativeDialog] = useState(false);
  const [alternativeToRemove, setAlternativeToRemove] = useState("");

  const reversed = useMemo(() => alternatives.slice().reverse(), [alternatives]);

  const handleAddAlternative = () => {
    addAlternative(
      inputValue,
      alternatives,
      setAlternatives,
      setInputValue,
      setInputError
    );
  };

  const handleAskRemoveAlternative = (item) => {
    setAlternativeToRemove(item);
    setOpenRemoveAlternativeDialog(true);
  };

  const handleCancelRemoveAlternative = () => {
    setOpenRemoveAlternativeDialog(false);
    setAlternativeToRemove("");
  };

  const handleConfirmRemoveAlternative = () => {
    if (!alternativeToRemove) return;

    removeAlternative(alternativeToRemove, setAlternatives);
    handleCancelRemoveAlternative();
  };

  const handleSaveEdit = () => {
    saveEditAlternative(
      editValue,
      editingAlternative,
      alternatives,
      setAlternatives,
      setEditingAlternative,
      setEditValue,
      setEditError
    );
  };

  const handleEditAlternative = (item) => {
    setEditingAlternative(item);
    setEditValue(item);
    setEditError(null);
  };

  return (
    <Stack spacing={1.5} sx={createIssueStepContainerSx}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Alternatives
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {alternatives.length} added
        </Typography>
      </Stack>

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
          onChange={(event) => {
            setInputValue(event.target.value);
            setInputError("");
          }}
          onKeyDown={(event) => event.key === "Enter" && handleAddAlternative()}
          error={Boolean(inputError)}
          helperText={inputError}
          color="info"
          sx={{ flex: 1, ...getCreateIssueStepInputSx(theme) }}
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

      {alternatives.length === 0 ? (
        <Box sx={getCreateIssueStepEmptyStateSx(theme)}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            No alternatives yet. Add at least 2 to compare properly.
          </Typography>
        </Box>
      ) : (
        <List
          disablePadding
          sx={{
            ...getCreateIssueStepScrollableSx(theme, "52vh"),
            overflow: "hidden",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <TransitionGroup>
            {reversed.map((item, index) => (
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
                  handleRemoveAlternative={handleAskRemoveAlternative}
                />
                {index !== reversed.length - 1 ? (
                  <Divider sx={getCreateIssueRowDividerSx(theme)} />
                ) : null}
              </Collapse>
            ))}
          </TransitionGroup>
        </List>
      )}

      <ConfirmationDialog
        open={openRemoveAlternativeDialog}
        onClose={handleCancelRemoveAlternative}
        tone="warning"
        title="Delete alternative?"
        subtitle={
          alternativeToRemove
            ? `Are you sure you want to delete "${alternativeToRemove}"?`
            : "Are you sure you want to delete this alternative?"
        }
        actions={[
          {
            id: "cancel-delete-alternative",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCancelRemoveAlternative,
          },
          {
            id: "confirm-delete-alternative",
            label: "Delete",
            color: "error",
            icon: <DeleteOutlineIcon />,
            onClick: handleConfirmRemoveAlternative,
            autoFocus: true,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </Stack>
  );
};
