import { useMemo, useState } from "react";
import {
  Button,
  TextField,
  List,
  Collapse,
  Stack,
  Divider,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { TransitionGroup } from "react-transition-group";
import AddIcon from "@mui/icons-material/Add";

import { removeCriteriaItemRecursively, updateCriterion, validateCriterion } from "../../../../../utils/createIssueUtils";
import { CriteriaItem } from "../../../../../components/CriteriaItem/CriteriaItem";
import { useSnackbarAlertContext } from "../../../../../context/snackbarAlert/snackbarAlert.context";
import { GlassDialog } from "../../../../../components/StyledComponents/GlassDialog";

const countLeafCriteria = (items) =>
  items.reduce((acc, item) => {
    if (!item.children || item.children.length === 0) return acc + 1;
    return acc + countLeafCriteria(item.children);
  }, 0);

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

export const CriteriaStep = ({ criteria, setCriteria, isMultiCriteria }) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();

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
    setCriteria((prev) => updateCriterion(prev, editingCriterion, editCriterionValue.trim(), editCriterionType));
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

    setCriteria((prev) => [...prev, { name: inputValue.trim(), type: selectedType, children: [] }]);
    setInputValue("");
    setInputError(false);
  };

  const handleRemoveCriteria = (item) => setCriteria((prev) => removeCriteriaItemRecursively(prev, item));

  const handleToggle = (itemName) => setOpenItems((prev) => ({ ...prev, [itemName]: !prev[itemName] }));

  const handleAddChild = () => {
    if (!childInputValue.trim()) return;

    if (!isMultiCriteria) {
      const tempCriteria = JSON.parse(JSON.stringify(criteria));

      const addChildSim = (items) =>
        items.map((item) => {
          if (item.name === selectedParent.name) {
            return {
              ...item,
              children: [...item.children, { name: childInputValue.trim(), type: selectedParent.type, children: [] }],
            };
          } else if (item.children?.length) {
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
            children: [...item.children, { name: childInputValue.trim(), type: selectedParent.type, children: [] }],
          };
        } else if (item.children?.length) {
          return { ...item, children: addChild(item.children) };
        }
        return item;
      });

    setCriteria((prev) => addChild(prev));
    setChildInputValue("");
    setChildInputError(false);
    setOpenDialog(false);
  };

  return (
    <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 1250, mx: "auto", minHeight: 0 }}>
      {/* Mini header */}
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Criteria
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {leafCount} leaf criteria • You can nest with child criteria
        </Typography>
      </Stack>

      {/* Input row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "flex-start" }}>
        <TextField
          variant="outlined"
          placeholder="Criterion"
          autoComplete="off"
          size="small"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setInputError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAddCriteria()}
          error={!!inputError}
          helperText={inputError}
          color="info"
          sx={{ flex: 1, ...inputSx(theme) }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel color="info">Type</InputLabel>
          <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} label="Type" color="info" sx={inputSx(theme)}>
            <MenuItem value="benefit">Benefit</MenuItem>
            <MenuItem value="cost">Cost</MenuItem>
          </Select>
        </FormControl>

        <Button startIcon={<AddIcon />} color="info" variant="outlined" onClick={handleAddCriteria} disabled={!inputValue.trim()}>
          Add
        </Button>
      </Stack>

      {/* List */}
      {criteria.length === 0 ? (
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
            No criteria yet. Add at least 1 leaf criterion.
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={listSx(theme)}>
          <TransitionGroup>
            {reversed.map((item, idx) => (
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
                  handleRemoveCriteria={handleRemoveCriteria}
                  setOpenDialog={setOpenDialog}
                />
                {idx !== reversed.length - 1 ? (
                  <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.07) }} />
                ) : null}
              </Collapse>
            ))}
          </TransitionGroup>
        </List>
      )}

      {/* Add child dialog (Glass) */}
      <GlassDialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>
          Add child criterion
          {selectedParent?.name ? (
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 900, mt: 0.25 }}>
              Parent: {selectedParent.name}
            </Typography>
          ) : null}
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            color="info"
            variant="outlined"
            label="Child name"
            value={childInputValue}
            onChange={(e) => {
              setChildInputValue(e.target.value);
              setChildInputError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
            fullWidth
            autoFocus
            error={!!childInputError}
            helperText={childInputError}
            sx={inputSx(theme)}
          />
        </DialogContent>

        <DialogActions sx={{ gap: 1 }}>
          <Button variant="outlined" color="warning" onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button variant="outlined" color="info" onClick={handleAddChild} disabled={!childInputValue.trim()}>
            Add
          </Button>
        </DialogActions>
      </GlassDialog>
    </Stack>
  );
};
