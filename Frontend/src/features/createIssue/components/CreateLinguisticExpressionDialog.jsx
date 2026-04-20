import { useEffect, useState } from "react";
import { buildFuzzyTriangles } from "../utils/createIssue.utils";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { FuzzyPreviewChart } from "../../../components/FuzzyPreviewChart/FuzzyPreviewChart";
import { createExpressionDomain, updateExpressionDomain } from "../../../services/issue.service";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  getCreateIssueCompactDialogActionsSx,
  getCreateIssueCompactDialogContentSx,
  getCreateIssueCompactDialogTitleSx,
} from "../styles/createIssueStep.styles";

export const CreateLinguisticExpressionDialog = ({ open, editingDomain, onClose }) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const { setExpressionDomains } = useIssuesDataContext();

  const [name, setName] = useState("");
  const [nLabels, setNLabels] = useState(5);
  const [labels, setLabels] = useState(buildFuzzyTriangles(5));
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
      result = await updateExpressionDomain(editingDomain._id, domain);

      if (result.success) {
        setExpressionDomains((prev) =>
          prev.map((d) => (d.name === editingDomain.name ? result.data : d))
        );
      }
    } else {
      result = await createExpressionDomain(domain);

      if (result.success) {
        setExpressionDomains((prev) => [...prev, result.data]);
      }
    }

    if (result.success) {
      showSnackbarAlert(result?.message || "Domain saved successfully", "success");
      onClose();
    } else {
      showSnackbarAlert(result?.message || "Error saving domain", "error");
    }
  };

  return (
    <GlassDialog open={open} onClose={onClose} fullWidth>
      <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
        {editingDomain ? "Edit linguistic expression" : "New linguistic expression"}
      </DialogTitle>
      <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>
        <Stack spacing={2.2} sx={{ mt: 3, mb:2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <TextField
              variant="outlined"
              color="info"
              label="Name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              helperText={!name.trim() ? "Name is required" : ""}
              size="small"
            />
            <TextField
              variant="outlined"
              type="number"
              label="NºLabels"
              value={nLabels}
              onChange={handleNLabelsChange}
              inputProps={{ min: 3, step: 2 }}
              color="info"
              error={nLabels < 3 || nLabels % 2 === 0}
              sx={{ width: { xs: "100%", sm: 130 } }}
              helperText={
                nLabels < 3 || nLabels % 2 === 0 ? "Must be odd and ≥ 3" : ""
              }
              size="small"
            />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            {labels.map((lbl, i) => (
              <TextField
                key={i}
                variant="outlined"
                color="info"
                label={`L${i + 1}`}
                value={lbl.label}
                onChange={(e) => handleLabelChange(i, e.target.value)}
                size="small"
              />
            ))}
          </Stack>

          <Divider sx={{ my: 0.6 }} />

          <Typography variant="subtitle1" sx={{color: "text.secondary" }}>
            Preview
          </Typography>
          <Box
            sx={{
              borderRadius: 2.5,
              p: 1,
              bgcolor: alpha(theme.palette.common.white, 0.015),
            }}
          >
            <FuzzyPreviewChart labels={labels} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
        <Button onClick={onClose} color="warning" variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="success"
          variant="outlined"
          disabled={!isValidDomain()}
        >
          {editingDomain ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};
