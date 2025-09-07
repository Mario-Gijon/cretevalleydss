import { useState } from "react";
import { Stack, TextField, Button, List, Divider, Collapse } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
/* import DomainVerificationIcon from '@mui/icons-material/DomainVerification'; */
import { TransitionGroup } from "react-transition-group";
import { addAlternative, removeAlternative, saveEditAlternative } from "../../../../src/utils/createIssueUtils.js";
import { AlternativeItem } from "../../../../src/components/AlternativeItem/AlternativeItem.jsx";
import { GlassPaper } from "../../../../src/components/StyledComponents/GlassPaper.jsx";

export const AlternativesStep = ({ alternatives, setAlternatives }) => {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [editingAlternative, setEditingAlternative] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(null);

  const handleAddAlternative = () => {
    addAlternative(inputValue, alternatives, setAlternatives, setInputValue, setInputError);
  };

  const handleRemoveAlternative = (item) => {
    removeAlternative(item, setAlternatives);
  };

  const handleSaveEdit = () => {
    saveEditAlternative(editValue, editingAlternative, alternatives, setAlternatives, setEditingAlternative, setEditValue, setEditError);
  };

  const handleEditAlternative = (item) => {
    setEditingAlternative(item); // Activar modo edición para esta alternativa
    setEditValue(item); // Inicializar el valor de edición con el nombre actual
    setEditError(null)
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
        boxShadow: "0 8px 24px rgba(29, 82, 81, 0.1)",
      }}
    >
      <Stack justifyContent="center" useFlexGap spacing={alternatives.length > 0 ? { xs: 0, sm: 2 } : { xs: 0, sm: 0 }}>
        <Stack useFlexGap flexGrow={1} width={"100%"} direction={{ xs: "column", sm: "row" }} justifyContent="center" alignItems="flex-start" spacing={2}>
          <TextField
            variant="outlined"
            placeholder="Alternative"
            autoComplete="off"
            size="small"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputError(""); // Eliminar error al escribir
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAddAlternative()}
            error={!!inputError}
            helperText={inputError}
            flexGrow={1}
            color="info"
            sx={{ flex: 1, width: { xs: "100%", sm: 350 } }}
          />
          <Button
            startIcon={<AddIcon />}
            flexGrow={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
            color="info"
            variant="outlined"
            onClick={handleAddAlternative}
            disabled={!inputValue.trim()}
          >
            Add Alternative
          </Button>
        </Stack>
        <Stack>
          {alternatives.length > 0 && (
            <List
              sx={{
                flexGrow: 1,
                maxHeight: "50vh",
                minHeight: 0,
                overflowY: "auto",
              }}
            >
              <TransitionGroup>
                {alternatives.slice().reverse().map((item) => (
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
                    <Divider sx={{ display: item === alternatives[0] ? "none" : "flex" }} />
                  </Collapse>
                ))}
              </TransitionGroup>
            </List>
          )}
        </Stack>
      </Stack>
    </GlassPaper>
  );
};