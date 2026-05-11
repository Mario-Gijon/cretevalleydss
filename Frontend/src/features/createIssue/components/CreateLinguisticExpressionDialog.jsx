import { useEffect, useMemo, useState } from "react";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import { FuzzyPreviewChart } from "../../../components/FuzzyPreviewChart/FuzzyPreviewChart";
import { createExpressionDomain, updateExpressionDomain } from "../../../services/issue.service";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import {
  getCreateIssueCompactDialogActionsSx,
  getCreateIssueCompactDialogContentSx,
  getCreateIssueCompactDialogTitleSx,
} from "../styles/createIssueStep.styles";
import {
  buildAutomaticLinguisticLabels,
  DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
  getLinguisticMembershipDefinitionOrDefault,
  LINGUISTIC_MEMBERSHIP_FUNCTIONS,
  validateLinguisticLabelValues,
} from "../../../utils/linguisticMembershipFunctions";

const normalizeLabelPayload = (labels = []) =>
  labels.map((labelItem, index) => ({
    label: String(labelItem?.label || "").trim() || `Label ${index + 1}`,
    values: (Array.isArray(labelItem?.values) ? labelItem.values : []).map((value) =>
      Number(value)
    ),
  }));

const ensureValuesLength = (values = [], targetLength) => {
  const numericValues = (Array.isArray(values) ? values : []).map((item) =>
    Number(item)
  );
  const safeValues = numericValues.map((item) =>
    Number.isFinite(item) ? item : 0
  );

  if (safeValues.length >= targetLength) {
    return safeValues.slice(0, targetLength);
  }

  const padValue = safeValues.length ? safeValues[safeValues.length - 1] : 0;
  const missing = Array.from(
    { length: targetLength - safeValues.length },
    () => padValue
  );

  return safeValues.concat(missing);
};

export const CreateLinguisticExpressionDialog = ({ open, editingDomain, onClose }) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { setExpressionDomains } = useIssuesDataContext();

  const [name, setName] = useState("");
  const [nLabels, setNLabels] = useState(5);
  const [membershipFunction, setMembershipFunction] = useState(
    DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION
  );
  const [valuesMode, setValuesMode] = useState("automatic");
  const [labels, setLabels] = useState(
    buildAutomaticLinguisticLabels({
      labelCount: 5,
      membershipFunction: DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
    })
  );
  const [openUpdateConfirmDialog, setOpenUpdateConfirmDialog] = useState(false);
  const [openCustomModeConfirmDialog, setOpenCustomModeConfirmDialog] = useState(false);

  const membershipDefinition = useMemo(
    () => getLinguisticMembershipDefinitionOrDefault(membershipFunction),
    [membershipFunction]
  );

  useEffect(() => {
    if (!open) return;

    if (editingDomain) {
      const initialMembershipFunction =
        editingDomain.membershipFunction || DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION;
      const initialValuesMode = editingDomain.valuesMode === "custom" ? "custom" : "automatic";
      const initialLabels = Array.isArray(editingDomain.linguisticLabels)
        ? editingDomain.linguisticLabels
        : [];

      setName(editingDomain.name || "");
      setNLabels(initialLabels.length || 5);
      setMembershipFunction(initialMembershipFunction);
      setValuesMode(initialValuesMode);
      setLabels(
        initialLabels.length
          ? initialLabels
          : buildAutomaticLinguisticLabels({
              labelCount: 5,
              membershipFunction: initialMembershipFunction,
            })
      );
      return;
    }

    setName("");
    setNLabels(5);
    setMembershipFunction(DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION);
    setValuesMode("automatic");
    setLabels(
      buildAutomaticLinguisticLabels({
        labelCount: 5,
        membershipFunction: DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
      })
    );
  }, [open, editingDomain]);

  const isCustomMode = valuesMode === "custom";

  const regenerateAutomaticLabels = ({
    nextLabelCount = nLabels,
    nextMembershipFunction = membershipFunction,
  } = {}) => {
    setLabels((previous) =>
      buildAutomaticLinguisticLabels({
        labelCount: nextLabelCount,
        membershipFunction: nextMembershipFunction,
        previousLabels: previous,
      })
    );
  };

  const handleNLabelsChange = (event) => {
    const nextValue = parseInt(event.target.value, 10);
    setNLabels(nextValue);

    if (!isCustomMode) {
      regenerateAutomaticLabels({ nextLabelCount: nextValue });
      return;
    }

    setLabels((previous) => {
      const safeCount = Number.isInteger(nextValue) && nextValue > 0 ? nextValue : 0;
      const resized = previous.slice(0, safeCount);

      while (resized.length < safeCount) {
        resized.push({
          label: `Label ${resized.length + 1}`,
          values: Array.from({ length: membershipDefinition.valueCount }, () => 0),
        });
      }

      return resized;
    });
  };

  const handleMembershipFunctionChange = (event) => {
    const nextMembershipFunction = event.target.value;
    const nextDefinition = getLinguisticMembershipDefinitionOrDefault(
      nextMembershipFunction
    );
    setMembershipFunction(nextMembershipFunction);

    if (!isCustomMode) {
      regenerateAutomaticLabels({ nextMembershipFunction });
      return;
    }

    setLabels((previous) =>
      previous.map((labelItem) => ({
        ...labelItem,
        values: ensureValuesLength(labelItem.values, nextDefinition.valueCount),
      }))
    );
  };

  const handleLabelChange = (index, nextLabel) => {
    setLabels((previous) => {
      const next = [...previous];
      next[index] = { ...next[index], label: nextLabel };
      return next;
    });
  };

  const handleLabelValueChange = (labelIndex, valueIndex, inputValue) => {
    const parsed = Number(inputValue);

    setLabels((previous) => {
      const next = [...previous];
      const nextValues = Array.isArray(next[labelIndex]?.values)
        ? [...next[labelIndex].values]
        : Array.from({ length: membershipDefinition.valueCount }, () => 0);

      nextValues[valueIndex] = Number.isFinite(parsed) ? parsed : inputValue;
      next[labelIndex] = {
        ...next[labelIndex],
        values: nextValues,
      };

      return next;
    });
  };

  const handleCustomModeToggle = (checked) => {
    if (checked) {
      setOpenCustomModeConfirmDialog(true);
      return;
    }

    setValuesMode("automatic");
    regenerateAutomaticLabels();
  };

  const handleConfirmEnableCustomMode = () => {
    setOpenCustomModeConfirmDialog(false);
    setValuesMode("custom");
  };

  const handleCancelEnableCustomMode = () => {
    setOpenCustomModeConfirmDialog(false);
  };

  const domainPayload = {
    name: name.trim(),
    type: "linguistic",
    membershipFunction,
    valuesMode,
    linguisticLabels: normalizeLabelPayload(labels),
  };

  const hasInvalidLabels = !domainPayload.linguisticLabels.every(
    (labelItem) =>
      Boolean(labelItem.label.trim()) &&
      validateLinguisticLabelValues(labelItem.values, membershipDefinition.valueCount)
  );

  const hasValidationErrors =
    !domainPayload.name ||
    !Number.isInteger(nLabels) ||
    nLabels < 3 ||
    nLabels % 2 === 0 ||
    domainPayload.linguisticLabels.length !== nLabels ||
    hasInvalidLabels;

  const hasDomainChanges = () => {
    if (!editingDomain) return true;

    const currentPayload = JSON.stringify(domainPayload);
    const originalPayload = JSON.stringify({
      name: editingDomain.name,
      type: "linguistic",
      membershipFunction:
        editingDomain.membershipFunction || DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
      valuesMode: editingDomain.valuesMode === "custom" ? "custom" : "automatic",
      linguisticLabels: editingDomain.linguisticLabels,
    });

    return currentPayload !== originalPayload;
  };

  const handleSave = async () => {
    if (hasValidationErrors) {
      showSnackbarAlert("There are invalid linguistic domain parameters", "error");
      return;
    }

    let result;

    if (editingDomain) {
      result = await updateExpressionDomain(editingDomain._id, domainPayload);

      if (result.success) {
        setExpressionDomains((previous) =>
          previous.map((item) => (item._id === editingDomain._id ? result.data : item))
        );
      }
    } else {
      result = await createExpressionDomain(domainPayload);

      if (result.success) {
        setExpressionDomains((previous) => [...previous, result.data]);
      }
    }

    if (result.success) {
      showSnackbarAlert(result?.message || "Domain saved successfully", "success");
      onClose();
      return;
    }

    showSnackbarAlert(result?.message || "Error saving domain", "error");
  };

  const handleRequestSave = () => {
    if (!editingDomain) {
      handleSave();
      return;
    }

    if (hasValidationErrors) {
      showSnackbarAlert("There are invalid linguistic domain parameters", "error");
      return;
    }

    if (!hasDomainChanges()) {
      return;
    }

    setOpenUpdateConfirmDialog(true);
  };

  const handleCancelUpdateConfirm = () => {
    setOpenUpdateConfirmDialog(false);
  };

  const handleConfirmUpdate = async () => {
    setOpenUpdateConfirmDialog(false);
    await handleSave();
  };

  return (
    <>
      <GlassDialog open={open} onClose={onClose} fullWidth>
        <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
          {editingDomain ? "Edit linguistic expression" : "New linguistic expression"}
        </DialogTitle>
        <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>
          <Stack spacing={2.2} sx={{ mt: 3, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                variant="outlined"
                color="info"
                label="Name"
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                helperText={nLabels < 3 || nLabels % 2 === 0 ? "Must be odd and ≥ 3" : ""}
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
                <InputLabel id="membership-function-label">Membership function</InputLabel>
                <Select
                  labelId="membership-function-label"
                  label="Membership function"
                  value={membershipFunction}
                  onChange={handleMembershipFunctionChange}
                >
                  {Object.values(LINGUISTIC_MEMBERSHIP_FUNCTIONS).map((item) => (
                    <MenuItem key={item.key} value={item.key}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={isCustomMode}
                    onChange={(event) => handleCustomModeToggle(event.target.checked)}
                    disabled={nLabels < 3 || nLabels % 2 === 0}
                  />
                }
                label="Edit membership values manually"
              />
            </Stack>

            {isCustomMode ? (
              <Alert severity="warning" variant="outlined">
                Editing membership values is an advanced option. Incorrect values may make this
                domain incompatible with some models or produce invalid fuzzy computations. If you
                are not sure, keep the automatically generated values.
              </Alert>
            ) : null}

            <Divider />

            <Stack spacing={2}>
              {labels.map((labelItem, labelIndex) => (
                <Stack key={labelIndex} spacing={0.9}>
                  <TextField
                    variant="outlined"
                    color="info"
                    label={`L${labelIndex + 1}`}
                    value={labelItem.label}
                    onChange={(event) => handleLabelChange(labelIndex, event.target.value)}
                    size="small"
                  />

                  {isCustomMode ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8}>
                      {Array.from(
                        { length: membershipDefinition.valueCount },
                        (_, valueIndex) => (
                          <TextField
                            key={`${labelIndex}-${valueIndex}`}
                            variant="outlined"
                            color="info"
                            type="number"
                            size="small"
                            label={`v${valueIndex + 1}`}
                            inputProps={{ min: 0, max: 1, step: 0.01 }}
                            value={labelItem?.values?.[valueIndex] ?? ""}
                            onChange={(event) =>
                              handleLabelValueChange(labelIndex, valueIndex, event.target.value)
                            }
                          />
                        )
                      )}
                    </Stack>
                  ) : null}
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 0.6 }} />

            <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
              Preview
            </Typography>
            <Box
              sx={{
                borderRadius: 2.5,
                p: 1,
              }}
            >
              <FuzzyPreviewChart
                labels={domainPayload.linguisticLabels}
                membershipFunction={membershipFunction}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
          <Button onClick={onClose} color="info" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleRequestSave}
            color={editingDomain ? "warning" : "success"}
            variant="outlined"
            disabled={hasValidationErrors || (Boolean(editingDomain) && !hasDomainChanges())}
          >
            {editingDomain ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </GlassDialog>

      <ConfirmationDialog
        open={openUpdateConfirmDialog}
        onClose={handleCancelUpdateConfirm}
        tone="warning"
        title="Update linguistic expression?"
        subtitle="Are you sure you want to update this expression domain?"
        actions={[
          {
            id: "cancel-update-expression-domain",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCancelUpdateConfirm,
          },
          {
            id: "confirm-update-expression-domain",
            label: "Update",
            color: "warning",
            icon: <UpdateIcon />,
            autoFocus: true,
            onClick: handleConfirmUpdate,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />

      <ConfirmationDialog
        open={openCustomModeConfirmDialog}
        onClose={handleCancelEnableCustomMode}
        tone="warning"
        title="Enable manual values?"
        subtitle="Editing membership values is an advanced option. Incorrect values may make this domain incompatible with some models or produce invalid fuzzy computations. If you are not sure, keep the automatically generated values."
        actions={[
          {
            id: "cancel-enable-custom-membership-values",
            label: "Keep automatic",
            color: "secondary",
            onClick: handleCancelEnableCustomMode,
          },
          {
            id: "confirm-enable-custom-membership-values",
            label: "Enable manual",
            color: "warning",
            autoFocus: true,
            onClick: handleConfirmEnableCustomMode,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </>
  );
};
