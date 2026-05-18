import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import ModelsSectionParametersForm from "./ModelsSectionParametersForm";
import { Pill } from "../shared/FinishedIssueDialogPrimitives";
import { getFinishedIssueDialogAuroraBg } from "../../styles/finishedIssueDialog.styles";
import {
  getCompatReason,
  isModelCompatible,
} from "../../utils/finishedIssueDialog.utils";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

/**
 * Dialogo auxiliar para agregar nuevos model runs.
 *
 * @returns {JSX.Element}
 */
const ModelsSectionAddDialog = () => {
  const theme = useTheme();

  const { modelsSection } = useFinishedIssueDialogContext();
  const { addDialog } = modelsSection;

  return (
    <Dialog
      open={addDialog.addOpen}
      onClose={addDialog.closeAddDialog}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 5,
          bgcolor: alpha("#0B1118", 0.72),
          ...getFinishedIssueDialogAuroraBg(theme, 0.1),
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.10)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 980 }}>Add model</DialogTitle>

      <DialogContent>
        <Stack spacing={1.4} sx={{ pt: 1 }}>
          <TextField
            label="Run name (optional)"
            value={addDialog.scenarioName}
            onChange={(event) => addDialog.setScenarioName(event.target.value)}
            size="small"
            fullWidth
          />

          <FormControl size="small" fullWidth>
            <InputLabel color="info">Model</InputLabel>
            <Select
              value={addDialog.selectedModelId}
              label="Model"
              color="info"
              onChange={(event) => addDialog.setSelectedModelId(event.target.value)}
            >
              {addDialog.useSchemaAdd
                ? (Array.isArray(addDialog.availableModels) ? addDialog.availableModels : []).map((model) => {
                    const disabled = !isModelCompatible(model);
                    const reason = getCompatReason(model, addDialog.domainType);
                    const label = model?.name || "—";
                    const modelId = model?.id || "";

                    return (
                      <MenuItem key={modelId || label} value={modelId} disabled={disabled}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ width: "100%", minWidth: 0 }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 900,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </Typography>

                          <Box sx={{ flex: 1 }} />

                          {disabled ? (
                            <Tooltip title={reason || "Incompatible"} arrow>
                              <Box>
                                <Pill tone="error">Not compatible</Pill>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Pill tone="success">Compatible</Pill>
                          )}
                        </Stack>
                      </MenuItem>
                    );
                  })
                : (addDialog.modelsCatalog || []).map((model) => {
                    const name = model.name || model.model || model.id;
                    const modelId = model.id || name;

                    return (
                      <MenuItem key={modelId} value={modelId}>
                        {model.label || name}
                      </MenuItem>
                    );
                  })}
            </Select>
          </FormControl>
          {addDialog.useSchemaAdd && (!Array.isArray(addDialog.availableModels) || addDialog.availableModels.length === 0) ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              No scenario candidate models are available for this issue yet.
            </Typography>
          ) : null}
          {addDialog.useSchemaAdd &&
          addDialog.selectedModelFromSchema &&
          !addDialog.selectedModelCompatible ? (
            <Typography variant="caption" color="error">
              {getCompatReason(addDialog.selectedModelFromSchema, addDialog.domainType) ||
                "Selected model is not compatible with this issue scenario."}
            </Typography>
          ) : null}

          {addDialog.useSchemaAdd ? (
            <>
              {addDialog.selectedModelFromSchema ? (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={addDialog.restoreScenarioDefaults}
                  >
                    Restore defaults
                  </Button>
                </Stack>
              ) : null}

              <ModelsSectionParametersForm
                model={addDialog.selectedModelFromSchema}
                values={addDialog.scenarioParamValues}
                setValues={addDialog.setScenarioParamValues}
                leafNames={addDialog.leafNames}
              />

              {addDialog.selectedModelFromSchema &&
              Array.isArray(addDialog.selectedModelFromSchema.parameters) &&
              addDialog.selectedModelFromSchema.parameters.length ? (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.25,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.10)",
                    bgcolor: alpha(theme.palette.background.paper, 0.06),
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                    Tip: empty fields will use defaults (if any). Arrays must be complete.
                  </Typography>
                </Box>
              ) : null}
            </>
          ) : (
            <>
              <TextField
                label="Parameters (JSON)"
                value={addDialog.paramsJson}
                onChange={(event) => addDialog.setParamsJson(event.target.value)}
                size="small"
                fullWidth
                multiline
                minRows={6}
                placeholder={`{\n  "alpha": 0.5,\n  "maxIter": 200,\n  "weights": [0.5, 0.5]\n}`}
              />

              {addDialog.modelsLoading ? (
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  Loading models…
                </Typography>
              ) : null}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.25, pb: 2 }}>
        <Button onClick={addDialog.closeAddDialog} variant="outlined" color="warning">
          Cancel
        </Button>
        <Button
          onClick={addDialog.handleAddModelRun}
          variant="outlined"
          color="secondary"
          disabled={
            addDialog.addLoading ||
            (addDialog.useSchemaAdd &&
              addDialog.selectedModelFromSchema &&
              !addDialog.selectedModelCompatible)
          }
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelsSectionAddDialog;
