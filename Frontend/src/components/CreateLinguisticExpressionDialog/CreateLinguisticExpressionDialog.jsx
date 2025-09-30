import { useEffect, useState } from "react";
import { buildFuzzyTriangles } from "../../utils/createIssueUtils";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { Button, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from "@mui/material";
import { FuzzyPreviewChart } from "../FuzzyPreviewChart/FuzzyPreviewChart";
import { createExpressionDomain, updateExpressionDomain } from "../../controllers/issueController";
import { useIssuesDataContext } from "../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";

export const CreateLinguisticExpressionDialog = ({ open, editingDomain, onClose }) => {

  const {showSnackbarAlert} = useSnackbarAlertContext();

  const { setExpressionDomains } = useIssuesDataContext();

  const [name, setName] = useState("");
  const [nLabels, setNLabels] = useState(5);
  const [labels, setLabels] = useState(buildFuzzyTriangles(5));

  // inicializar al abrir
  useEffect(() => {
    if (open) {
      if (editingDomain) {
        setName(editingDomain.name);
        setNLabels(editingDomain.linguisticLabels.length);
        setLabels(editingDomain.linguisticLabels);
      } else {
        setName("");
        setNLabels(5);
        setLabels(buildFuzzyTriangles(5));
      }
    }
  }, [open, editingDomain]);

  const handleNLabelsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setNLabels(value);
    setLabels(buildFuzzyTriangles(value));
  };

  const handleLabelChange = (index, newName) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], label: newName };
    setLabels(newLabels);
  };

  const isValidDomain = () => {
    if (!name.trim()) return false;
    if (nLabels < 3 || nLabels % 2 === 0) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isValidDomain()) {
      showSnackbarAlert("There are invalid model parameters", "error");
      return;
    }

    const domain = {
      name,
      type: "linguistic",
      linguisticLabels: labels,
    };

    let result;

    if (editingDomain) {
      // 🔄 actualización
      result = await updateExpressionDomain(editingDomain._id, domain);

      if (result.success) {
        setExpressionDomains((prev) =>
          prev.map((d) => (d.name === editingDomain.name ? result.data : d))
        );
      }
    } else {
      // ➕ creación
      result = await createExpressionDomain(domain);

      if (result.success) {
        setExpressionDomains((prev) => [...prev, result.data]);
      }
    }

    if (result.success) {
      showSnackbarAlert(result.msg, "success");
      onClose();
    } else {
      showSnackbarAlert(result?.msg || "Error saving domain", "error");
    }
  };

  return (
    <GlassDialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>
        {editingDomain ? "Edit linguistic expression" : "New linguistic expression"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              color="secondary"
              helperText={!name.trim() ? "Name is required" : ""}
            />
            <TextField
              type="number"
              label="NºLabels"
              value={nLabels}
              onChange={handleNLabelsChange}
              inputProps={{ min: 3, step: 2 }}
              color="secondary"
              error={nLabels < 3 || nLabels % 2 === 0}
              sx={{ width: 100 }}
              helperText={
                nLabels < 3 || nLabels % 2 === 0 ? "Must be odd and ≥ 3" : ""
              }
            />
          </Stack>

          <Divider />

          <Stack spacing={3}>
            {labels.map((lbl, i) => (
              <TextField
                key={i}
                label={`L${i + 1}`}
                value={lbl.label}
                onChange={(e) => handleLabelChange(i, e.target.value)}
                color="secondary"
              />
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1">Preview</Typography>
          <FuzzyPreviewChart labels={labels} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error">
          Cancel
        </Button>
        <Button onClick={handleSave} color="success" disabled={!isValidDomain()}>
          {editingDomain ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};
