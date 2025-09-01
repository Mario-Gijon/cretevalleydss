import { useState } from "react";
import { Button, TextField, List, Collapse, Stack, Divider, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import AddIcon from "@mui/icons-material/Add";
import { removeCriteriaItemRecursively, updateCriterion, validateCriterion } from "../../../../src/utils/createIssueUtils";
import { CriteriaItem } from "../../../../src/components/CriteriaItem/CriteriaItem";
import { GlassPaper } from "../../../activeIssues/customStyles/StyledCard";

export const CriteriaStep = ({ criteria, setCriteria }) => {
  const [inputValue, setInputValue] = useState(""); // Para el criterio principal
  const [inputError, setInputError] = useState("");
  const [childInputValue, setChildInputValue] = useState(""); // Para el criterio hijo
  const [openDialog, setOpenDialog] = useState(false); // Estado para abrir el dialog
  const [selectedParent, setSelectedParent] = useState(null); // Estado para el criterio padre
  const [openItems, setOpenItems] = useState({});
  const [childInputError, setChildInputError] = useState(false);
  const [selectedType, setSelectedType] = useState("benefit"); // "benefit" por defecto
  const [editingCriterion, setEditingCriterion] = useState(null); // Estado para el criterio en edición
  const [editCriterionValue, setEditCriterionValue] = useState(""); // Valor del criterio editado
  const [editCriterionType, setEditCriterionType] = useState(""); // Tipo del criterio editado
  const [editBlur, setEditBlur] = useState(true); // Estado para el criterio en edición
  const [editCriterionError, setEditCriterionError] = useState(""); // Estado para errores en edición

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
    const error = validateCriterion(inputValue, criteria);
    if (error) {
      setInputError(error);
      return;
    }

    setCriteria((prev) => [...prev, { name: inputValue.trim(), type: selectedType, children: [] }]);
    setInputValue("");
    setInputError(false);
  };

  const handleRemoveCriteria = (item) => {
    setCriteria((prev) => removeCriteriaItemRecursively(prev, item));
  };

  const handleAddChild = () => {
    const error = validateCriterion(childInputValue, criteria);
    if (error) {
      setChildInputError(error);
      return;
    }

    const addChild = (items) => {
      return items.map((item) => {
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
    };

    setCriteria((prev) => addChild(prev));
    setChildInputValue("");
    setChildInputError(false);
    setOpenDialog(false);
  };

  const handleToggle = (itemName) => {
    setOpenItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  return (
    <GlassPaper
      variant="elevation"
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        borderRadius: 2,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        maxWidth: "95vw",
        width: { xs: "95vw", sm: "auto" },
      }}
    >
      <Stack justifyContent="center" useFlexGap spacing={criteria.length > 0 ? { xs: 0, sm: 2 } : { xs: 0, sm: 0 }}>
        <Stack useFlexGap direction={{ xs: "column", sm: "row" }} justifyContent="center" alignItems="flex-start" gap={2}>
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
            error={inputError}
            helperText={inputError}
            flexGrow={1}
            color="info"
            sx={{ flex: 1, width: { xs: "100%", sm: 350 } }}
          />
          <FormControl size="small" sx={{ minWidth: 120, width: { xs: "100%", sm: "auto" } }}>
            <InputLabel color="info">Type</InputLabel>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              label="Type"
              color="info"
            >
              <MenuItem value="benefit">Benefit</MenuItem>
              <MenuItem value="cost">Cost</MenuItem>
            </Select>
          </FormControl>

          <Button startIcon={<AddIcon />} flexGrow={1} sx={{ width: { xs: "100%", sm: "auto" } }} color="info" variant="outlined" onClick={handleAddCriteria} disabled={!inputValue.trim()}>
            Add Criterion
          </Button>
        </Stack>
        <Stack>
          {criteria.length > 0 &&
            <List sx={{ flexGrow: 1, maxHeight: "50vh", minHeight: 0, overflowY: "auto", }}>
              <TransitionGroup>
                {criteria.slice().reverse().map((item) => (
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
                    <Divider sx={{ display: item === criteria[0] ? "none" : "flex" }} />
                  </Collapse>
                ))}
              </TransitionGroup>
            </List>}
        </Stack>
      </Stack>

      {/* Dialog to add child criterion */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add Child Criterion</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 2 }}
            color="info"
            variant="outlined"
            label="Child name"
            value={childInputValue}
            onChange={(e) => {
              setChildInputValue(e.target.value);
              setChildInputError(false);
            }}
            onKeyDown={(e) => { e.key === 'Enter' && handleAddChild() }}
            fullWidth
            autoFocus
            error={childInputError}
            helperText={childInputError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="error">
            Exit
          </Button>
          <Button onClick={handleAddChild} color="info" disabled={!childInputValue.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </GlassPaper>
  );
};