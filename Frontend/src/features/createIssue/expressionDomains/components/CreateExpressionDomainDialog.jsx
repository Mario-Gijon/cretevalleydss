import { useEffect, useMemo, useState } from "react";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import {
  createExpressionDomain,
  updateExpressionDomain,
} from "../../../../services/issue.service";
import {
  getCreateIssueCompactDialogActionsSx,
  getCreateIssueCompactDialogContentSx,
  getCreateIssueCompactDialogTitleSx,
} from "../../styles/createIssueStep.styles";
import {
  getExpressionDomainType,
  listExpressionDomainTypes,
} from "../../../expressionDomains";

const normalizeDefinition = (definition) =>
  definition && typeof definition === "object" && !Array.isArray(definition)
    ? definition
    : {};

const buildCreateDraft = (typeKey) => ({
  name: "",
  typeKey,
  definition: {},
});

const buildEditDraft = (editingDomain) => ({
  name: typeof editingDomain?.name === "string" ? editingDomain.name : "",
  typeKey: typeof editingDomain?.typeKey === "string" ? editingDomain.typeKey : "",
  definition: normalizeDefinition(editingDomain?.definition),
});

export const CreateExpressionDomainDialog = ({
  open,
  onClose,
  onCreated,
  editingDomain = null,
}) => {
  const theme = useTheme();
  const { setExpressionDomains } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const typeEntries = useMemo(() => listExpressionDomainTypes(), []);
  const defaultTypeKey = typeEntries[0]?.key || "";

  const [selectedTypeKey, setSelectedTypeKey] = useState(defaultTypeKey);
  const [draft, setDraft] = useState(buildCreateDraft(defaultTypeKey));
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingDomain) {
      const nextDraft = buildEditDraft(editingDomain);
      setSelectedTypeKey(nextDraft.typeKey);
      setDraft(nextDraft);
      return;
    }

    setSelectedTypeKey(defaultTypeKey);
    setDraft(buildCreateDraft(defaultTypeKey));
  }, [defaultTypeKey, editingDomain, open]);

  const selectedTypeEntry = getExpressionDomainType(selectedTypeKey);
  const SelectedCreationForm = selectedTypeEntry?.CreationForm || null;
  const numericTypeEntries = typeEntries.filter((entry) =>
    ["numericContinuous", "numericDiscrete"].includes(entry.key)
  );
  const linguisticTypeEntries = typeEntries.filter((entry) =>
    ["linguisticOrdinal", "linguistic2Tuple", "linguisticFuzzy"].includes(entry.key)
  );

  const payload = {
    name: String(draft?.name || "").trim(),
    typeKey: selectedTypeKey,
    definition: normalizeDefinition(draft?.definition),
  };

  const hasTypeEntries = typeEntries.length > 0;
  const hasUnsupportedEditingType =
    Boolean(editingDomain) &&
    Boolean(selectedTypeKey) &&
    !selectedTypeEntry;
  const canSubmit =
    !saveLoading &&
    hasTypeEntries &&
    Boolean(selectedTypeEntry) &&
    payload.name.length > 0;

  const handleTypeSelect = (typeKey) => {
    if (!typeKey || typeKey === selectedTypeKey) {
      return;
    }

    setSelectedTypeKey(typeKey);
    setDraft((previous) => ({
      name: typeof previous?.name === "string" ? previous.name : "",
      typeKey,
      definition: {},
    }));
  };

  const handleDraftChange = (nextValue) => {
    setDraft({
      name: typeof nextValue?.name === "string" ? nextValue.name : "",
      typeKey: selectedTypeKey,
      definition: normalizeDefinition(nextValue?.definition),
    });
  };

  const renderTypeSelector = (entry) => {
    const selected = entry.key === selectedTypeKey;

    return (
      <Box
        key={entry.key}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={() => handleTypeSelect(entry.key)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleTypeSelect(entry.key);
          }
        }}
        sx={{
          p: 1,
          borderRadius: 2,
          border: "1px solid",
          borderColor: selected
            ? alpha(theme.palette.info.main, 0.72)
            : alpha(theme.palette.common.white, 0.12),
          background: selected
            ? alpha(theme.palette.info.main, 0.09)
            : alpha(theme.palette.common.white, 0.02),
          cursor: "pointer",
          transition: "border-color 140ms ease, background 140ms ease, box-shadow 140ms ease",
          "&:hover": {
            borderColor: alpha(theme.palette.info.main, 0.48),
            background: alpha(
              theme.palette.info.main,
              selected ? 0.11 : 0.045
            ),
          },
          "&:focus-visible": {
            outline: "none",
            borderColor: alpha(theme.palette.info.main, 0.72),
            boxShadow: `0 0 0 2px ${alpha(theme.palette.info.main, 0.22)}`,
          },
        }}
      >
        <Stack spacing={0.2} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            {entry.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 750 }}
          >
            {entry.description}
          </Typography>
        </Stack>
      </Box>
    );
  };

  const handleSave = async () => {
    if (!canSubmit) {
      showSnackbarAlert("Expression domain name and type are required.", "error");
      return;
    }

    setSaveLoading(true);

    const result = editingDomain?._id
      ? await updateExpressionDomain(editingDomain._id, payload)
      : await createExpressionDomain(payload);

    setSaveLoading(false);

    if (!result?.success) {
      showSnackbarAlert(result?.message || "Error saving domain", "error");
      return;
    }

    setExpressionDomains((previous) =>
      editingDomain?._id
        ? previous.map((item) => (item._id === editingDomain._id ? result.data : item))
        : [...previous, result.data]
    );

    onCreated?.(result.data);
    showSnackbarAlert(result?.message || "Domain saved successfully", "success");
    onClose?.();
  };

  return (
    <GlassDialog
      open={open}
      onClose={saveLoading ? undefined : onClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
        {editingDomain ? "Edit expression domain" : "Create expression domain"}
      </DialogTitle>

      <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>
        <Stack spacing={2.2} sx={{ mt: 2.5, mb: 1.5 }}>
          {!hasTypeEntries ? (
            <Alert severity="error">
              No expression domain types are available in the frontend catalog.
            </Alert>
          ) : null}

          {hasUnsupportedEditingType ? (
            <Alert severity="error">
              This expression domain uses an unsupported frontend type:
              {" "}
              <strong>{selectedTypeKey}</strong>
              . Select another type to continue editing.
            </Alert>
          ) : null}

          {hasTypeEntries ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                Select domain type
              </Typography>

              <Grid2 container spacing={1.1} data-testid="expression-domain-type-selector">
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.8}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                      Numeric domains
                    </Typography>
                    <Stack spacing={0.8}>
                      {numericTypeEntries.map(renderTypeSelector)}
                    </Stack>
                  </Stack>
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.8}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
                      Linguistic domains
                    </Typography>
                    <Stack spacing={0.8}>
                      {linguisticTypeEntries.map(renderTypeSelector)}
                    </Stack>
                  </Stack>
                </Grid2>
              </Grid2>

              {SelectedCreationForm ? (
                <Box data-testid="expression-domain-selected-form">
                  <SelectedCreationForm
                    value={draft}
                    onChange={handleDraftChange}
                    disabled={saveLoading}
                  />
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
        <Button
          onClick={onClose}
          color="warning"
          variant="outlined"
          disabled={saveLoading}
          startIcon={<CancelOutlinedIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="info"
          variant="outlined"
          disabled={!canSubmit}
          startIcon={<SaveOutlinedIcon />}
        >
          {editingDomain ? "Save changes" : "Create domain"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default CreateExpressionDomainDialog;
