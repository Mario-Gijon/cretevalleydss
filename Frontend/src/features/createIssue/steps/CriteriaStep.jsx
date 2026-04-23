import { useMemo, useState } from "react";
import {
  Button,
  TextField,
  List,
  Collapse,
  Stack,
  Divider,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
} from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import AddIcon from "@mui/icons-material/Add";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme } from "@mui/material/styles";

import {
  countLeafCriteria,
  removeCriteriaItemRecursively,
  updateCriterion,
  validateCriterion,
} from "../../../utils/criteria.utils";
import { CriteriaItem } from "../components/CriteriaItem";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueSoftTopAuroraDialogPaperSx,
  getCreateIssueRowDividerSx,
  getCreateIssueStepEmptyStateSx,
  getCreateIssueStepInputSx,
  getCreateIssueStepScrollableSx,
} from "../styles/createIssueStep.styles";

export const CriteriaStep = () => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { criteria, setCriteria, selectedModel } = useCreateIssueContext();
  const isMultiCriteria = selectedModel?.isMultiCriteria;

  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  const [childInputValue, setChildInputValue] = useState("");
  const [childInputError, setChildInputError] = useState(false);

  const [openItems, setOpenItems] = useState({});
  const [selectedType, setSelectedType] = useState("benefit");

  const [editingCriterion, setEditingCriterion] = useState(null);
  const [editCriterionValue, setEditCriterionValue] = useState("");
  const [editCriterionType, setEditCriterionType] = useState("");
  const [editBlur, setEditBlur] = useState(true);
  const [editCriterionError, setEditCriterionError] = useState("");
  const [openRemoveCriterionDialog, setOpenRemoveCriterionDialog] = useState(false);
  const [criterionToRemove, setCriterionToRemove] = useState(null);

  const reversed = useMemo(() => criteria.slice().reverse(), [criteria]);
  const leafCount = useMemo(() => countLeafCriteria(criteria), [criteria]);

  const handleEditCriterion = (item) => {
    setEditingCriterion(item);
    setEditCriterionValue(item.name);
    setEditCriterionType(item.type);
  };

  const handleSaveCriterionEdit = () => {
    const error = validateCriterion(editCriterionValue, criteria, editingCriterion);
    if (error) {
      setEditCriterionError(error);
      return;
    }

    setCriteria((previous) =>
      updateCriterion(
        previous,
        editingCriterion,
        editCriterionValue.trim(),
        editCriterionType
      )
    );
    setEditingCriterion(null);
    setEditCriterionError("");
    setEditBlur(true);
  };

  const handleAddCriteria = () => {
    if (!inputValue.trim()) return;

    if (!isMultiCriteria) {
      const leaves = countLeafCriteria(criteria);
      if (leaves >= 1) {
        showSnackbarAlert("This model only allows one leaf criterion", "warning");
        return;
      }
    }

    const error = validateCriterion(inputValue, criteria);
    if (error) {
      setInputError(error);
      return;
    }

    setCriteria((previous) => [
      ...previous,
      { name: inputValue.trim(), type: selectedType, children: [] },
    ]);
    setInputValue("");
    setInputError(false);
  };

  const handleAskRemoveCriteria = (item) => {
    setCriterionToRemove(item);
    setOpenRemoveCriterionDialog(true);
  };

  const handleCancelRemoveCriteria = () => {
    setOpenRemoveCriterionDialog(false);
    setCriterionToRemove(null);
  };

  const handleConfirmRemoveCriteria = () => {
    if (!criterionToRemove) return;

    setCriteria((previous) => removeCriteriaItemRecursively(previous, criterionToRemove));
    handleCancelRemoveCriteria();
  };

  const handleToggle = (itemName) => {
    setOpenItems((previous) => ({ ...previous, [itemName]: !previous[itemName] }));
  };

  const handleAddChild = () => {
    if (!childInputValue.trim()) return;

    if (!isMultiCriteria) {
      const tempCriteria = JSON.parse(JSON.stringify(criteria));

      const addChildSim = (items) =>
        items.map((item) => {
          if (item.name === selectedParent.name) {
            return {
              ...item,
              children: [
                ...item.children,
                {
                  name: childInputValue.trim(),
                  type: selectedParent.type,
                  children: [],
                },
              ],
            };
          }

          if (item.children?.length) {
            return { ...item, children: addChildSim(item.children) };
          }

          return item;
        });

      const simulated = addChildSim(tempCriteria);
      const leavesAfter = countLeafCriteria(simulated);
      if (leavesAfter > 1) {
        showSnackbarAlert("This model only allows one leaf criterion", "warning");
        return;
      }
    }

    const error = validateCriterion(childInputValue, criteria);
    if (error) {
      setChildInputError(error);
      return;
    }

    const addChild = (items) =>
      items.map((item) => {
        if (item.name === selectedParent.name) {
          return {
            ...item,
            children: [
              ...item.children,
              {
                name: childInputValue.trim(),
                type: selectedParent.type,
                children: [],
              },
            ],
          };
        }

        if (item.children?.length) {
          return { ...item, children: addChild(item.children) };
        }

        return item;
      });

    setCriteria((previous) => addChild(previous));
    setChildInputValue("");
    setChildInputError(false);
    setOpenDialog(false);
  };

  return (
    <Stack spacing={1.5} sx={createIssueStepContainerSx}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Criteria
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {leafCount} leaf criteria • You can nest with child criteria
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
      >
        <TextField
          variant="outlined"
          placeholder="Criterion"
          autoComplete="off"
          size="small"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setInputError(false);
          }}
          onKeyDown={(event) => event.key === "Enter" && handleAddCriteria()}
          error={Boolean(inputError)}
          helperText={inputError}
          color="info"
          sx={{ flex: 1, ...getCreateIssueStepInputSx(theme) }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel color="info">Type</InputLabel>
          <Select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            label="Type"
            color="info"
            sx={getCreateIssueStepInputSx(theme)}
          >
            <MenuItem value="benefit">Benefit</MenuItem>
            <MenuItem value="cost">Cost</MenuItem>
          </Select>
        </FormControl>

        <Button
          startIcon={<AddIcon />}
          color="info"
          variant="outlined"
          onClick={handleAddCriteria}
          disabled={!inputValue.trim()}
        >
          Add
        </Button>
      </Stack>

      {criteria.length === 0 ? (
        <Box sx={getCreateIssueStepEmptyStateSx(theme)}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            No criteria yet. Add at least 1 leaf criterion.
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
              <Collapse key={item.name}>
                <CriteriaItem
                  item={item}
                  editingCriterion={editingCriterion}
                  editCriterionValue={editCriterionValue}
                  setEditCriterionValue={setEditCriterionValue}
                  editBlur={editBlur}
                  handleSaveCriterionEdit={handleSaveCriterionEdit}
                  editCriterionError={editCriterionError}
                  editCriterionType={editCriterionType}
                  setEditCriterionType={setEditCriterionType}
                  setEditBlur={setEditBlur}
                  handleEditCriterion={handleEditCriterion}
                  handleToggle={handleToggle}
                  openItems={openItems}
                  setSelectedParent={setSelectedParent}
                  handleRemoveCriteria={handleAskRemoveCriteria}
                  setOpenDialog={setOpenDialog}
                />
                {index !== reversed.length - 1 ? (
                  <Divider sx={getCreateIssueRowDividerSx(theme)} />
                ) : null}
              </Collapse>
            ))}
          </TransitionGroup>
        </List>
      )}

      <GlassDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: getCreateIssueSoftTopAuroraDialogPaperSx(theme) }}
      >
        <DialogContent sx={{ pt: 2, pb: 1.6 }}>
          <Stack spacing={2}>
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography fontWeight={900} fontSize={22}>
                  Add child criterion
                </Typography>
                {selectedParent?.name ? (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Parent: {selectedParent.name}
                  </Typography>
                ) : null}
              </Stack>

              <TextField
                color="info"
                variant="outlined"
                label="Child name"
                value={childInputValue}
                onChange={(event) => {
                  setChildInputValue(event.target.value);
                  setChildInputError(false);
                }}
                onKeyDown={(event) => event.key === "Enter" && handleAddChild()}
                fullWidth
                autoFocus
                error={Boolean(childInputError)}
                helperText={childInputError}
                sx={getCreateIssueStepInputSx(theme)}
              />
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={0.4}>
              <Button variant="text" color="warning" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="text"
                color="info"
                onClick={handleAddChild}
                disabled={!childInputValue.trim()}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </GlassDialog>

      <ConfirmationDialog
        open={openRemoveCriterionDialog}
        onClose={handleCancelRemoveCriteria}
        tone="error"
        title="Delete criterion?"
        subtitle={
          criterionToRemove?.name
            ? `Are you sure you want to delete "${criterionToRemove.name}"?`
            : "Are you sure you want to delete this criterion?"
        }
        actions={[
          {
            id: "cancel-delete-criterion",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCancelRemoveCriteria,
          },
          {
            id: "confirm-delete-criterion",
            label: "Delete",
            color: "error",
            icon: <DeleteOutlineIcon />,
            onClick: handleConfirmRemoveCriteria,
            autoFocus: true,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </Stack>
  );
};
