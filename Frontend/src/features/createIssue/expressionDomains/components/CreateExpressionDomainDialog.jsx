import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  getExpressionDomainTypeEntry,
  listExpressionDomainTypeEntries,
} from "../../../decisionPlugins/expressionDomains";

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
  const typeEntries = useMemo(() => listExpressionDomainTypeEntries(), []);
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

  const selectedTypeEntry = getExpressionDomainTypeEntry(selectedTypeKey);
  const SelectedCreationForm = selectedTypeEntry?.CreationForm || null;

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
      maxWidth="md"
    >
      <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
        {editingDomain ? "Edit expression domain" : "Create expression domain"}
      </DialogTitle>

      <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>
        <Stack spacing={2.2} sx={{ mt: 2.5, mb: 1.5 }}>
          {!hasTypeEntries ? (
            <Alert severity="error">
              No expression domain types are available in the frontend registry.
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
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                Select domain type
              </Typography>

              <Stack spacing={1}>
                {typeEntries.map((entry) => {
                  const selected = entry.key === selectedTypeKey;

                  return (
                    <Box
                      key={entry.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTypeSelect(entry.key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleTypeSelect(entry.key);
                        }
                      }}
                      sx={{
                        p: 1.35,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: selected
                          ? alpha(theme.palette.info.main, 0.72)
                          : alpha(theme.palette.common.white, 0.12),
                        background: selected
                          ? alpha(theme.palette.info.main, 0.09)
                          : alpha(theme.palette.common.white, 0.02),
                        cursor: "pointer",
                        transition: "border-color 140ms ease, background 140ms ease",
                        "&:hover": {
                          borderColor: alpha(theme.palette.info.main, 0.48),
                          background: alpha(theme.palette.info.main, selected ? 0.11 : 0.045),
                        },
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Stack spacing={0.3} sx={{ flex: 1, minWidth: 0 }}>
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

                        <Chip
                          size="small"
                          label={entry.family}
                          color={selected ? "info" : "default"}
                          variant={selected ? "filled" : "outlined"}
                        />
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          ) : null}

          {SelectedCreationForm ? (
            <SelectedCreationForm
              key={`${selectedTypeKey}-${editingDomain?._id || "new"}`}
              value={draft}
              onChange={handleDraftChange}
              disabled={saveLoading}
            />
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
        <Button
          onClick={onClose}
          color="secondary"
          variant="outlined"
          disabled={saveLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="info"
          variant="contained"
          disabled={!canSubmit}
        >
          {editingDomain ? "Save changes" : "Create domain"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default CreateExpressionDomainDialog;

