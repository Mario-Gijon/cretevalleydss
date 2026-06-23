import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useNavigate } from "react-router-dom";

import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  applyModelForgeModelPackage,
  getBackendHealth,
  getModelForgeCatalog,
  previewModelForgeModelPackage,
} from "../../../services/admin.service";
import { setPendingBackendChange } from "../../../utils/pendingBackendChange.js";
import EmptyState from "../models/components/EmptyState";
import { getAdminIssueDetailCardSx } from "../issues/styles/adminIssues.styles";

const MODEL_KIND_OPTIONS = [
  { value: "issue", label: "Issue model" },
  { value: "criteriaWeighting", label: "Criteria weighting" },
];

const DOMAIN_OPTIONS = [
  "numericContinuous",
  "numericDiscrete",
  "linguistic",
];

const PARAMETER_STRUCTURE_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/;

const PROTECTED_ADVANCED_FIELDS = new Set([
  "key",
  "label",
  "parameterStructureKey",
  "required",
  "default",
  "restrictions",
  "type",
]);

const DEFAULT_MODE_OPTIONS = [
  { value: "null", label: "Null" },
  { value: "emptyObject", label: "Empty object {}" },
  { value: "emptyArray", label: "Empty array []" },
  { value: "literal", label: "Literal value" },
  { value: "customJson", label: "Custom JSON" },
];

const RESTRICTIONS_MODE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "minMax", label: "Min / Max" },
  { value: "options", label: "Options" },
  { value: "customJson", label: "Custom JSON" },
];

const modelKeyPattern = /^[a-z][a-z0-9_]*$/;
const lowerCamelCasePattern = /^[a-z][A-Za-z0-9]*$/;
const BACKEND_CHANGE_SUCCESS_MESSAGE =
  "Scaffold package created and Backend restarted successfully.";
const BACKEND_CHANGE_DESTINATION_PATH =
  "/dashboard/admin/models?tab=manifest-sync";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseLiteralValue = (rawValue) => {
  const text = String(rawValue ?? "");
  const trimmed = text.trim();

  if (!trimmed) return "";

  const lowered = trimmed.toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;

  const parsedNumber = Number(trimmed);
  if (Number.isFinite(parsedNumber)) return parsedNumber;

  return text;
};

const parseJsonOrThrow = (rawValue, label) => {
  try {
    return JSON.parse(String(rawValue ?? "").trim());
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
};

const parseOptionalFiniteNumberOrThrow = (rawValue, label) => {
  const text = String(rawValue ?? "").trim();
  if (!text) return undefined;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a finite number`);
  }

  return parsed;
};

const parseOptionsList = (rawValue) =>
  String(rawValue ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parseLiteralValue(item));

const buildParameterIdentifier = (parameter, index) =>
  String(parameter?.key || "").trim() || `Parameter ${index + 1}`;

const buildParameterRowPayloadOrThrow = (parameter, index) => {
  const identifier = buildParameterIdentifier(parameter, index);
  const key = String(parameter?.key || "").trim();
  const label = String(parameter?.label || "").trim();
  const parameterStructureKey = String(parameter?.parameterStructureKey || "").trim();

  if (!key) throw new Error(`Parameter ${index + 1} is missing key`);
  if (!label) throw new Error(`Parameter ${index + 1} is missing label`);
  if (!parameterStructureKey) {
    throw new Error(`Parameter ${index + 1} is missing parameterStructureKey`);
  }
  if (!PARAMETER_STRUCTURE_KEY_PATTERN.test(parameterStructureKey)) {
    throw new Error(`${identifier} parameterStructureKey must use lower camelCase`);
  }

  let defaultValue = null;
  const defaultMode = parameter?.defaultMode || "null";

  if (defaultMode === "emptyObject") {
    defaultValue = {};
  } else if (defaultMode === "emptyArray") {
    defaultValue = [];
  } else if (defaultMode === "literal") {
    defaultValue = parseLiteralValue(parameter?.defaultLiteralText);
  } else if (defaultMode === "customJson") {
    defaultValue = parseJsonOrThrow(
      parameter?.defaultJsonText,
      `${identifier} default`
    );
  }

  let restrictions;
  const restrictionsMode = parameter?.restrictionsMode || "none";

  if (restrictionsMode === "minMax") {
    const min = parseOptionalFiniteNumberOrThrow(
      parameter?.restrictionsMinText,
      `${identifier} minimum`
    );
    const max = parseOptionalFiniteNumberOrThrow(
      parameter?.restrictionsMaxText,
      `${identifier} maximum`
    );

    if (min !== undefined || max !== undefined) {
      restrictions = {};
      if (min !== undefined) restrictions.min = min;
      if (max !== undefined) restrictions.max = max;
    }
  } else if (restrictionsMode === "options") {
    const allowed = parseOptionsList(parameter?.restrictionsOptionsText);
    if (allowed.length > 0) restrictions = { allowed };
  } else if (restrictionsMode === "customJson") {
    const parsed = parseJsonOrThrow(
      parameter?.restrictionsJsonText,
      `${identifier} restrictions`
    );

    if (parsed !== null && !isPlainObject(parsed)) {
      throw new Error(`${identifier} restrictions must be a JSON object or null`);
    }

    if (isPlainObject(parsed) && Object.keys(parsed).length > 0) {
      restrictions = parsed;
    }
  }

  let advanced = {};
  const advancedText = String(parameter?.advancedJsonText || "").trim();

  if (advancedText) {
    const parsedAdvanced = parseJsonOrThrow(
      advancedText,
      `${identifier} advanced JSON`
    );

    if (!isPlainObject(parsedAdvanced)) {
      throw new Error(`${identifier} advanced JSON must be a JSON object`);
    }

    for (const protectedField of PROTECTED_ADVANCED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(parsedAdvanced, protectedField)) {
        throw new Error(
          `${identifier} advanced JSON cannot override '${protectedField}'`
        );
      }
    }

    advanced = parsedAdvanced;
  }

  const payload = {
    key,
    label,
    parameterStructureKey,
    required: parameter?.required === true,
    default: defaultValue,
  };

  if (restrictions !== undefined) {
    payload.restrictions = restrictions;
  }

  return {
    ...payload,
    ...advanced,
  };
};

const getParameterRowValidation = (parameter, index) => {
  const errors = {};
  const parameterStructureKey = String(parameter?.parameterStructureKey || "").trim();

  if (
    parameterStructureKey &&
    !PARAMETER_STRUCTURE_KEY_PATTERN.test(parameterStructureKey)
  ) {
    errors.parameterStructureKey = "Use lower camelCase.";
  }

  try {
    buildParameterRowPayloadOrThrow(parameter, index);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid parameter";
    if (message.includes("default")) errors.default = message;
    if (message.includes("restrictions")) errors.restrictions = message;
    if (message.includes("advanced JSON")) errors.advanced = message;
    if (message.includes("parameterStructureKey")) errors.parameterStructureKey = message;
    if (message.includes("missing key")) errors.key = message;
    if (message.includes("missing label")) errors.label = message;
  }

  return errors;
};

const buildEmptyParameterRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  key: "",
  label: "",
  parameterStructureKey: "",
  required: false,
  defaultMode: "null",
  defaultLiteralText: "",
  defaultJsonText: "",
  restrictionsMode: "none",
  restrictionsMinText: "",
  restrictionsMaxText: "",
  restrictionsOptionsText: "",
  restrictionsJsonText: "",
  advancedJsonText: "",
  advancedExpanded: false,
});

const buildInitialFormState = () => ({
  apiModelKey: "",
  displayName: "",
  smallDescription: "",
  extendedDescription: "",
  moreInfoUrl: "",
  includeExamples: true,
  modelKind: "issue",
  evaluationStructureKey: "",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  isMultiCriteria: true,
  usesCriteriaWeights: true,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: true,
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  supportedDomains: ["numericContinuous", "numericDiscrete"],
  parameters: [],
});

const buildExampleFormState = () => ({
  apiModelKey: "sample_scaffold_model",
  displayName: "Sample Scaffold Model",
  smallDescription: "Sample model generated with Model Forge.",
  extendedDescription:
    "Generated sample scaffold used to validate the Model Forge preview and apply flow.",
  moreInfoUrl: "",
  includeExamples: true,
  modelKind: "issue",
  evaluationStructureKey: "sampleEvaluationStructure",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  isMultiCriteria: true,
  usesCriteriaWeights: true,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: true,
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  supportedDomains: ["numericContinuous", "numericDiscrete"],
  parameters: [
    {
      id: "sample-param",
      key: "sample_param",
      label: "Sample parameter",
      parameterStructureKey: "sampleParameterGlobal",
      required: true,
      defaultMode: "literal",
      defaultLiteralText: "0.5",
      defaultJsonText: "",
      restrictionsMode: "minMax",
      restrictionsMinText: "0",
      restrictionsMaxText: "1",
      restrictionsOptionsText: "",
      restrictionsJsonText: "",
      advancedJsonText: "",
      advancedExpanded: false,
    },
  ],
});

const formatStatusSeverity = (status) => {
  if (status === "toGenerate" || status === "written") return "success";
  if (status === "passed") return "success";
  if (status === "partial") return "warning";
  if (status === "failed") return "error";
  if (status === "skipped" || status === "exists") return "info";
  return "default";
};

const formatJsonPreview = (value) => {
  if (value === null || value === undefined) return "null";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const codeBlockSx = (theme) => ({
  m: 0,
  p: 1.15,
  borderRadius: 2,
  bgcolor: alpha(theme.palette.common.black, 0.25),
  color: "text.secondary",
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});

const quietPanelSx = () => ({
  p: 0,
  bgcolor: "transparent",
});

const pagePanelSx = (theme) => ({
  ...getAdminIssueDetailCardSx(theme),
  p: { xs: 1.35, md: 1.75 },
  borderRadius: 3,
});

const flatAccordionSx = (theme) => ({
  bgcolor: alpha(theme.palette.common.white, 0.018),
  borderRadius: 2,
  boxShadow: "none",
  overflow: "hidden",
  "&:before": { display: "none" },
  "&.Mui-expanded": {
    my: 0,
  },
});

const flatAccordionSummarySx = {
  minHeight: 42,
  px: 1.25,
  "&.Mui-expanded": {
    minHeight: 42,
  },
  "& .MuiAccordionSummary-content": {
    my: 0.65,
  },
  "& .MuiAccordionSummary-content.Mui-expanded": {
    my: 0.65,
  },
};

const flatAccordionDetailsSx = {
  px: 1.25,
  pt: 0,
  pb: 1.25,
};

const sectionDividerSx = (theme) => ({
  borderColor: alpha(theme.palette.common.white, 0.085),
});

const parameterCardSx = () => ({
  py: { xs: 1.2, md: 1.35 },
  px: 0,
  bgcolor: "transparent",
  boxShadow: "none",
});

const sectionBlockSx = {
  py: { xs: 2.15, md: 2.75 },
};

const modelFieldsGridSx = {
  display: "grid",
  gap: { xs: 1.55, md: 1.8 },
  gridTemplateColumns: {
    xs: "1fr",
    md: "repeat(2, minmax(0, 1fr))",
  },
};

const parameterTopGridSx = {
  display: "grid",
  gap: { xs: 1.25, md: 1.55 },
  gridTemplateColumns: {
    xs: "1fr",
    md: "minmax(180px, 0.9fr) minmax(220px, 1.1fr) minmax(240px, 1fr)",
  },
};

const getEvaluationStatus = ({ value, selectedStructure }) => {
  const key = String(value || "").trim();
  if (!key) return null;
  if (!selectedStructure) return { label: "New scaffold", color: "success" };
  if (selectedStructure.status === "partial") return { label: "Partial", color: "warning" };
  if (selectedStructure.status === "scaffold") return { label: "Scaffold", color: "info" };
  return { label: "Ready", color: "info" };
};

const getParameterStructureStatus = ({ value, selectedStructure, hasError }) => {
  const key = String(value || "").trim();
  if (!key || hasError) return null;
  if (!selectedStructure) return { label: "New scaffold", color: "success" };
  if (selectedStructure.status === "partial") return { label: "Partial", color: "warning" };
  if (selectedStructure.status === "scaffold") return { label: "Scaffold", color: "info" };
  return { label: "Ready", color: "info" };
};

const getCatalogKeyLabel = (option) => {
  if (typeof option === "string") return option;
  return option?.key || "";
};

const summarizeValidationChecks = (validation) => {
  const checks = Array.isArray(validation?.checks) ? validation.checks : [];

  return checks.reduce(
    (summary, check) => {
      if (check?.status === "passed") summary.passed += 1;
      if (check?.status === "failed") summary.failed += 1;
      if (check?.status === "skipped") summary.skipped += 1;
      return summary;
    },
    { passed: 0, failed: 0, skipped: 0 }
  );
};

const ResultItemSummary = ({ item }) => (
  <Stack spacing={0.35} sx={{ minWidth: 0 }}>
    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
      <Chip size="small" label={item.kind} color="info" variant="outlined" />
      <Chip
        size="small"
        label={item.status}
        color={formatStatusSeverity(item.status)}
        variant="outlined"
      />
      <Chip size="small" label={item.key} variant="outlined" />
      {"files" in item && (
        <Chip size="small" label={`${item.files?.length || 0} files`} variant="outlined" />
      )}
    </Stack>
    {item.reason && (
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
        {item.reason}
      </Typography>
    )}
    {item.targetBasePath && (
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
        {item.targetBasePath}
      </Typography>
    )}
  </Stack>
);

const ValidationPanel = ({
  theme,
  title,
  validation,
  emptyMessage,
  showFrontendSkippedNote = false,
}) => {
  if (!validation) {
    return (
      <Box sx={{ py: 0.4 }}>
        <EmptyState>{emptyMessage}</EmptyState>
      </Box>
    );
  }

  const summary = summarizeValidationChecks(validation);
  const checks = Array.isArray(validation.checks) ? validation.checks : [];
  const frontendBuildSkipped = checks.some(
    (check) => check?.name === "Frontend full build" && check?.status === "skipped"
  );

  return (
    <Stack spacing={1.15}>
      <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={`validation ${validation.status || "skipped"}`}
          color={formatStatusSeverity(validation.status)}
          variant="outlined"
        />
        <Chip size="small" label={`${summary.passed} passed`} variant="outlined" />
        <Chip size="small" label={`${summary.failed} failed`} variant="outlined" />
        <Chip size="small" label={`${summary.skipped} skipped`} variant="outlined" />
      </Stack>

      {showFrontendSkippedNote && frontendBuildSkipped && (
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
          Frontend build was not run automatically.
        </Typography>
      )}

      {checks.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <Stack spacing={0} divider={<Divider flexItem sx={sectionDividerSx(theme)} />}>
          {checks.map((check, index) => (
            <Box key={`${check.name}-${index}`} sx={{ py: 1 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={title} variant="outlined" />
                  <Chip
                    size="small"
                    label={check.status}
                    color={formatStatusSeverity(check.status)}
                    variant="outlined"
                  />
                </Stack>

                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  {check.name}
                </Typography>

                {check.details && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
                    {check.details}
                  </Typography>
                )}

                {check.command && (
                  <Box component="pre" sx={codeBlockSx(theme)}>
                    {check.command}
                  </Box>
                )}

                {(check.cwd || check.exitCode != null || check.stdout || check.stderr) && (
                  <Box component="pre" sx={codeBlockSx(theme)}>
                    {formatJsonPreview({
                      cwd: check.cwd || null,
                      exitCode: check.exitCode ?? null,
                      stdout: check.stdout || null,
                      stderr: check.stderr || null,
                    })}
                  </Box>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

const CapabilityToggle = ({ label, checked, onChange }) => {
  const theme = useTheme();

  return (
    <Button
      variant="outlined"
      color={checked ? "info" : "inherit"}
      onClick={() => onChange(!checked)}
      sx={{
        justifyContent: "center",
        minHeight: 34,
        minWidth: { xs: "100%", sm: 170 },
        px: 1.35,
        borderRadius: 999,
        textTransform: "none",
        fontWeight: 850,
        color: checked ? "info.main" : "text.secondary",
        borderColor: checked
          ? alpha(theme.palette.info.main, 0.55)
          : alpha(theme.palette.common.white, 0.1),
        bgcolor: checked
          ? alpha(theme.palette.info.main, 0.13)
          : alpha(theme.palette.common.white, 0.018),
        "&:hover": {
          bgcolor: checked
            ? alpha(theme.palette.info.main, 0.18)
            : alpha(theme.palette.common.white, 0.045),
          borderColor: checked
            ? alpha(theme.palette.info.main, 0.75)
            : alpha(theme.palette.common.white, 0.18),
        },
      }}
    >
      {label}
    </Button>
  );
};

const ParameterDefaultFields = ({ parameter, parameterErrors, setParameterField }) => {
  const defaultMode = parameter.defaultMode || "null";

  return (
    <Stack spacing={0.85}>
      <Autocomplete
        options={DEFAULT_MODE_OPTIONS}
        value={
          DEFAULT_MODE_OPTIONS.find((item) => item.value === defaultMode) ||
          DEFAULT_MODE_OPTIONS[0]
        }
        onChange={(_event, value) =>
          setParameterField(parameter.id, "defaultMode", value?.value || "null")
        }
        getOptionLabel={(option) => option?.label || ""}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={(params) => (
          <TextField {...params} color="info" label="Default" size="small" fullWidth />
        )}
      />

      {defaultMode === "literal" && (
        <TextField
          color="info"
          label="Value"
          size="small"
          value={parameter.defaultLiteralText || ""}
          onChange={(event) =>
            setParameterField(parameter.id, "defaultLiteralText", event.target.value)
          }
          error={Boolean(parameterErrors.default)}
          helperText={parameterErrors.default || ""}
          fullWidth
        />
      )}

      {defaultMode === "customJson" && (
        <TextField
          color="info"
          label="Default JSON"
          value={parameter.defaultJsonText || ""}
          onChange={(event) =>
            setParameterField(parameter.id, "defaultJsonText", event.target.value)
          }
          minRows={4}
          multiline
          error={Boolean(parameterErrors.default)}
          helperText={parameterErrors.default || ""}
          fullWidth
        />
      )}
    </Stack>
  );
};

const ParameterRestrictionsFields = ({ parameter, parameterErrors, setParameterField }) => {
  const restrictionsMode = parameter.restrictionsMode || "none";

  return (
    <Stack spacing={0.85}>
      <Autocomplete
        options={RESTRICTIONS_MODE_OPTIONS}
        value={
          RESTRICTIONS_MODE_OPTIONS.find((item) => item.value === restrictionsMode) ||
          RESTRICTIONS_MODE_OPTIONS[0]
        }
        onChange={(_event, value) =>
          setParameterField(parameter.id, "restrictionsMode", value?.value || "none")
        }
        getOptionLabel={(option) => option?.label || ""}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={(params) => (
          <TextField {...params} color="info" label="Restrictions" size="small" fullWidth />
        )}
      />

      {restrictionsMode === "minMax" && (
        <Box
          sx={{
            display: "grid",
            gap: 0.8,
            justifyContent: "start",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(2, 120px)",
            },
          }}
        >
          <TextField
            label="Min"
            value={parameter.restrictionsMinText || ""}
            color="info"
            size="small"
            onChange={(event) =>
              setParameterField(parameter.id, "restrictionsMinText", event.target.value)
            }
            error={Boolean(parameterErrors.restrictions)}
            helperText={parameterErrors.restrictions || ""}
          />
          <TextField
            label="Max"
            color="info"
            size="small"
            value={parameter.restrictionsMaxText || ""}
            onChange={(event) =>
              setParameterField(parameter.id, "restrictionsMaxText", event.target.value)
            }
            error={Boolean(parameterErrors.restrictions)}
            helperText={parameterErrors.restrictions || ""}
          />
        </Box>
      )}

      {restrictionsMode === "options" && (
        <TextField
          label="Options"
          color="info"
          value={parameter.restrictionsOptionsText || ""}
          onChange={(event) =>
            setParameterField(parameter.id, "restrictionsOptionsText", event.target.value)
          }
          minRows={3}
          multiline
          helperText={parameterErrors.restrictions || "Comma or newline separated."}
          error={Boolean(parameterErrors.restrictions)}
          fullWidth
        />
      )}

      {restrictionsMode === "customJson" && (
        <TextField
          color="info"
          label="Restrictions JSON"
          value={parameter.restrictionsJsonText || ""}
          onChange={(event) =>
            setParameterField(parameter.id, "restrictionsJsonText", event.target.value)
          }
          minRows={4}
          multiline
          helperText={parameterErrors.restrictions || ""}
          error={Boolean(parameterErrors.restrictions)}
          fullWidth
        />
      )}
    </Stack>
  );
};

const ParameterCard = ({
  parameter,
  index,
  theme,
  parameterStructureOptions,
  parameterStructureMap,
  setParameterField,
  setParameterExpanded,
  removeParameter,
}) => {
  const selectedParameterStructure =
    parameterStructureMap.get(String(parameter.parameterStructureKey || "").trim()) || null;
  const parameterErrors = getParameterRowValidation(parameter, index);
  const structureStatus = getParameterStructureStatus({
    value: parameter.parameterStructureKey,
    selectedStructure: selectedParameterStructure,
    hasError: Boolean(parameterErrors.parameterStructureKey),
  });

  return (
    <Box sx={parameterCardSx}>
      <Stack spacing={1.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
              Parameter {index + 1}
            </Typography>
            {structureStatus && (
              <Chip
                size="small"
                label={structureStatus.label}
                color={structureStatus.color}
                variant="outlined"
              />
            )}
          </Stack>

          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => removeParameter(parameter.id)}
            sx={{ textTransform: "none", fontWeight: 900 }}
          >
            Remove
          </Button>
        </Stack>

        <Box sx={parameterTopGridSx}>
          <TextField
            label="Key"
            size="small"
            value={parameter.key}
            onChange={(event) => setParameterField(parameter.id, "key", event.target.value)}
            error={Boolean(parameterErrors.key)}
            helperText={parameterErrors.key || ""}
            fullWidth
            color="info"
          />
          <TextField
            label="Label"
            size="small"
            value={parameter.label}
            onChange={(event) => setParameterField(parameter.id, "label", event.target.value)}
            error={Boolean(parameterErrors.label)}
            helperText={parameterErrors.label || ""}
            fullWidth
            color="info"
          />
          <Autocomplete
            freeSolo
            options={parameterStructureOptions}
            value={
              parameter.parameterStructureKey
                ? parameterStructureOptions.find(
                  (item) => item.key === parameter.parameterStructureKey
                ) || parameter.parameterStructureKey
                : null
            }
            onChange={(_event, value) =>
              setParameterField(
                parameter.id,
                "parameterStructureKey",
                typeof value === "string" ? value : value?.key || ""
              )
            }
            onInputChange={(_event, value, reason) => {
              if (reason === "input") {
                setParameterField(parameter.id, "parameterStructureKey", value);
              }
            }}
            getOptionLabel={getCatalogKeyLabel}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Structure"
                size="small"
                error={Boolean(parameterErrors.parameterStructureKey)}
                helperText={parameterErrors.parameterStructureKey || ""}
                color="info"
                fullWidth
              />
            )}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.35, md: 1.65 },
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(260px, 0.8fr) minmax(320px, 1.2fr)",
            },
          }}
        >
          <Box sx={quietPanelSx}>
            <ParameterDefaultFields
              parameter={parameter}
              parameterErrors={parameterErrors}
              setParameterField={setParameterField}
            />
          </Box>

          <Box sx={quietPanelSx}>
            <ParameterRestrictionsFields
              parameter={parameter}
              parameterErrors={parameterErrors}
              setParameterField={setParameterField}
            />
          </Box>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <FormControlLabel
            sx={{ m: 0 }}
            control={(
              <Switch
                color="info"
                checked={parameter.required === true}
                onChange={(event) =>
                  setParameterField(parameter.id, "required", event.target.checked)
                }
              />
            )}
            label="Required"
          />

          {selectedParameterStructure?.status === "partial" && (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`${selectedParameterStructure.key} is partial`}
            />
          )}
        </Stack>

        <Accordion
          disableGutters
          expanded={parameter.advancedExpanded === true}
          onChange={(_event, expanded) => setParameterExpanded(parameter.id, expanded)}
          sx={flatAccordionSx(theme)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={flatAccordionSummarySx}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              Advanced JSON
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={flatAccordionDetailsSx}>
            <TextField
              color="info"
              label="Advanced JSON"
              value={parameter.advancedJsonText || ""}
              onChange={(event) =>
                setParameterField(parameter.id, "advancedJsonText", event.target.value)
              }
              minRows={4}
              multiline
              helperText={parameterErrors.advanced || ""}
              error={Boolean(parameterErrors.advanced)}
              fullWidth
            />
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
};

const ResultAccordion = ({ item, theme }) => (
  <Accordion
    disableGutters
    sx={{
      bgcolor: "transparent",
      borderRadius: 0,
      boxShadow: "none",
      borderTop: `1px solid ${alpha(theme.palette.common.white, 0.075)}`,
      "&:before": { display: "none" },
      "&.Mui-expanded": { my: 0 },
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <ResultItemSummary item={item} />
    </AccordionSummary>
    <AccordionDetails>
      {!item.files?.length ? (
        <EmptyState>No files attached for this item.</EmptyState>
      ) : (
        <Stack spacing={0.8}>
          {item.files.map((file) => (
            <Accordion
              key={file.path}
              disableGutters
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.018),
                borderRadius: 1.5,
                boxShadow: "none",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 900, wordBreak: "break-word" }}>
                  {file.path}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box component="pre" sx={codeBlockSx(theme)}>
                  {file.content}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </AccordionDetails>
  </Accordion>
);

const InlineSection = ({ title, subtitle = null, action = null, children }) => (
  <Box sx={sectionBlockSx}>
    <Stack spacing={1.35}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 750 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
      {children}
    </Stack>
  </Box>
);

const SectionDivider = ({ theme }) => (
  <Divider
    flexItem
    sx={{
      ...sectionDividerSx(theme),
      my: { xs: 0.35, md: 0.55 },
    }}
  />
);

export default function AdminModelForgeSection() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [formState, setFormState] = useState(buildInitialFormState);
  const [requestPayloadPreview, setRequestPayloadPreview] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [applyValidationResult, setApplyValidationResult] = useState(null);
  const [actionError, setActionError] = useState("");
  const [runFullFrontendBuild, setRunFullFrontendBuild] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [backendRestartRequired, setBackendRestartRequired] = useState(false);

  const loadCatalog = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoadingCatalog(true);

      setCatalogError("");

      try {
        const response = await getModelForgeCatalog();

        if (!response?.success) {
          const message =
            response?.message ||
            "ModelForge is not configured or not available.";
          setCatalogError(message);
          showSnackbarAlert(message, "error");
          return false;
        }

        setCatalog(response.data || null);
        return true;
      } catch (error) {
        console.error(error);
        const message = "ModelForge is not configured or not available.";
        setCatalogError(message);
        showSnackbarAlert(message, "error");
        return false;
      } finally {
        if (!quiet) setLoadingCatalog(false);
      }
    },
    [showSnackbarAlert]
  );

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const evaluationStructures = useMemo(
    () => (Array.isArray(catalog?.evaluationStructures) ? catalog.evaluationStructures : []),
    [catalog]
  );

  const parameterStructures = useMemo(
    () => (Array.isArray(catalog?.parameterStructures) ? catalog.parameterStructures : []),
    [catalog]
  );

  const evaluationStructureMap = useMemo(
    () => new Map(evaluationStructures.map((item) => [item.key, item])),
    [evaluationStructures]
  );

  const parameterStructureMap = useMemo(
    () => new Map(parameterStructures.map((item) => [item.key, item])),
    [parameterStructures]
  );

  const evaluationOptions = useMemo(() => {
    if (formState.modelKind === "criteriaWeighting") {
      return evaluationStructures.filter(
        (item) => item.availableForCriteriaWeighting === true
      );
    }

    return evaluationStructures.filter(
      (item) => item.availableForAlternativeEvaluation === true
    );
  }, [evaluationStructures, formState.modelKind]);

  const parameterStructureOptions = useMemo(
    () => parameterStructures.filter((item) => item.available === true),
    [parameterStructures]
  );

  const selectedEvaluationStructure = useMemo(
    () => evaluationStructureMap.get(formState.evaluationStructureKey.trim()) || null,
    [evaluationStructureMap, formState.evaluationStructureKey]
  );

  const evaluationStatus = useMemo(
    () =>
      getEvaluationStatus({
        value: formState.evaluationStructureKey,
        selectedStructure: selectedEvaluationStructure,
      }),
    [formState.evaluationStructureKey, selectedEvaluationStructure]
  );

  const requiredParameterStructures = useMemo(() => {
    const seen = new Set();
    const keys = [];

    formState.parameters.forEach((parameter) => {
      const key = String(parameter?.parameterStructureKey || "").trim();
      if (!key || seen.has(key)) return;

      seen.add(key);
      const structure = parameterStructureMap.get(key);
      if (!structure || structure.available !== true) {
        keys.push(key);
      }
    });

    return keys;
  }, [formState.parameters, parameterStructureMap]);

  const setField = useCallback((field, value) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
    setPreviewResult(null);
    setApplyResult(null);
    setApplyValidationResult(null);
    setActionError("");
  }, []);

  const resetActionState = useCallback(() => {
    setPreviewResult(null);
    setApplyResult(null);
    setApplyValidationResult(null);
    setActionError("");
    setBackendRestartRequired(false);
  }, []);

  const setParameterField = useCallback((id, field, value) => {
    setFormState((current) => ({
      ...current,
      parameters: current.parameters.map((parameter) =>
        parameter.id === id ? { ...parameter, [field]: value } : parameter
      ),
    }));
    resetActionState();
  }, [resetActionState]);

  const setParameterExpanded = useCallback((id, expanded) => {
    setFormState((current) => ({
      ...current,
      parameters: current.parameters.map((parameter) =>
        parameter.id === id ? { ...parameter, advancedExpanded: expanded } : parameter
      ),
    }));
    resetActionState();
  }, [resetActionState]);

  const addParameter = useCallback(() => {
    setFormState((current) => ({
      ...current,
      parameters: [...current.parameters, buildEmptyParameterRow()],
    }));
    resetActionState();
  }, [resetActionState]);

  const removeParameter = useCallback((id) => {
    setFormState((current) => ({
      ...current,
      parameters: current.parameters.filter((parameter) => parameter.id !== id),
    }));
    resetActionState();
  }, [resetActionState]);

  const loadExample = useCallback(() => {
    setFormState(buildExampleFormState());
    setPreviewResult(null);
    setApplyResult(null);
    setApplyValidationResult(null);
    setActionError("");
    setRequestPayloadPreview(null);
    showSnackbarAlert("Sample scaffold form loaded", "success");
  }, [showSnackbarAlert]);

  const buildRequestPayload = useCallback(() => {
    const apiModelKey = formState.apiModelKey.trim();
    const displayName = formState.displayName.trim();
    const smallDescription = formState.smallDescription.trim();
    const extendedDescription = formState.extendedDescription.trim();
    const evaluationStructureKey = formState.evaluationStructureKey.trim();

    if (!apiModelKey) throw new Error("apiModelKey is required");
    if (!modelKeyPattern.test(apiModelKey)) {
      throw new Error("apiModelKey must use snake_case");
    }
    if (!displayName) throw new Error("displayName is required");
    if (!smallDescription) throw new Error("smallDescription is required");
    if (!extendedDescription) throw new Error("extendedDescription is required");
    if (!evaluationStructureKey) throw new Error("evaluationStructureKey is required");
    if (!lowerCamelCasePattern.test(evaluationStructureKey)) {
      throw new Error("evaluationStructureKey must use lower camelCase");
    }

    const parsedParameters = formState.parameters.map((parameter, index) =>
      buildParameterRowPayloadOrThrow(parameter, index)
    );

    const evaluationStructureCatalogItem =
      evaluationStructureMap.get(evaluationStructureKey) || null;

    return {
      model: {
        apiModelKey,
        displayName,
        smallDescription,
        extendedDescription,
        moreInfoUrl: formState.moreInfoUrl.trim() || null,
        modelKind: formState.modelKind,
        evaluationStructureKey,
        supportsConsensus:
          formState.modelKind === "issue" ? formState.supportsConsensus : false,
        supportsConsensusSimulation: formState.supportsConsensusSimulation,
        isMultiCriteria:
          formState.modelKind === "issue" ? formState.isMultiCriteria : true,
        usesCriteriaWeights:
          formState.modelKind === "issue" ? formState.usesCriteriaWeights : false,
        usesExpertWeights: formState.usesExpertWeights,
        usesFuzzyCriteriaWeights:
          formState.modelKind === "issue" ? formState.usesFuzzyCriteriaWeights : false,
        usesCriterionTypes: formState.usesCriterionTypes,
        supportsCreatorCriteriaWeighting:
          formState.modelKind === "criteriaWeighting"
            ? formState.supportsCreatorCriteriaWeighting
            : false,
        supportsExpertCriteriaWeighting:
          formState.modelKind === "criteriaWeighting"
            ? formState.supportsExpertCriteriaWeighting
            : false,
        supportedDomains: formState.supportedDomains,
        parameters: parsedParameters,
        includeExamples: formState.includeExamples,
      },
      evaluationStructure:
        evaluationStructureCatalogItem?.status === "ready"
          ? null
          : { evaluationStructureKey },
      parameterStructures: requiredParameterStructures.map((key) => ({
        parameterStructureKey: key,
      })),
    };
  }, [
    evaluationStructureMap,
    formState,
    requiredParameterStructures,
  ]);

  const runPreview = useCallback(async () => {
    let payload = null;

    try {
      payload = buildRequestPayload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid form data";
      setActionError(message);
      showSnackbarAlert(message, "error");
      return false;
    }

    setPreviewLoading(true);
    setActionError("");
    setApplyResult(null);
    setApplyValidationResult(null);

    try {
      const response = await previewModelForgeModelPackage(payload);

      if (!response?.success) {
        const message =
          response?.message || "Error previewing Model Forge scaffold package.";
        setActionError(message);
        showSnackbarAlert(message, "error");
        return false;
      }

      setRequestPayloadPreview(payload);
      setPreviewResult(response.data || null);
      showSnackbarAlert(response.message || "Scaffold preview completed", "success");
      return true;
    } catch (error) {
      console.error(error);
      const message = "Unexpected error previewing Model Forge scaffold package.";
      setActionError(message);
      showSnackbarAlert(message, "error");
      return false;
    } finally {
      setPreviewLoading(false);
    }
  }, [buildRequestPayload, showSnackbarAlert]);

  const runApply = useCallback(async () => {
    if (!requestPayloadPreview) return false;

    setApplyLoading(true);
    setActionError("");
    setApplyValidationResult(null);

    try {
      const response = await applyModelForgeModelPackage({
        ...requestPayloadPreview,
        runFullFrontendBuild,
      });

      if (!response?.success) {
        const message =
          response?.message || "Error applying Model Forge scaffold package.";
        setApplyValidationResult(response?.error?.details?.validation || null);
        setActionError(message);
        showSnackbarAlert(message, "error");
        return false;
      }

      setApplyResult(response.data || null);
      setApplyValidationResult(response?.data?.validation || null);
      setApplyDialogOpen(false);
      setBackendRestartRequired(true);
      showSnackbarAlert(response.message || "Scaffold package applied", "success");
      return true;
    } catch (error) {
      console.error(error);
      const message = "Unexpected error applying Model Forge scaffold package.";
      setActionError(message);
      showSnackbarAlert(message, "error");
      return false;
    } finally {
      setApplyLoading(false);
    }
  }, [requestPayloadPreview, runFullFrontendBuild, showSnackbarAlert]);

  const handleApplyBackendChanges = useCallback(async () => {
    setActionError("");

    try {
      const healthResponse = await getBackendHealth();

      if (!healthResponse?.success) {
        const message =
          healthResponse?.message || "Could not read Backend health status.";
        setActionError(message);
        showSnackbarAlert(message, "error");
        return false;
      }

      const pendingChange = {
        type: "modelForgeScaffoldApply",
        createdAt: Date.now(),
        restartRequested: false,
        backendStartedAtBefore: healthResponse?.data?.startedAt || null,
        successMessage: BACKEND_CHANGE_SUCCESS_MESSAGE,
        destinationPath: BACKEND_CHANGE_DESTINATION_PATH,
      };

      setPendingBackendChange(pendingChange);

      navigate("/system/applying-changes");
      return true;
    } catch (error) {
      console.error(error);
      const message = "Could not prepare Backend change flow.";
      setActionError(message);
      showSnackbarAlert(message, "error");
      return false;
    }
  }, [navigate, showSnackbarAlert]);

  const updateModelKind = useCallback((nextKind) => {
    if (!nextKind) return;

    setFormState((current) => ({
      ...current,
      modelKind: nextKind,
      supportsConsensus:
        nextKind === "issue" ? current.supportsConsensus : false,
      isMultiCriteria:
        nextKind === "issue" ? current.isMultiCriteria : true,
      usesCriteriaWeights:
        nextKind === "issue" ? current.usesCriteriaWeights : false,
      usesFuzzyCriteriaWeights:
        nextKind === "issue" ? current.usesFuzzyCriteriaWeights : false,
      supportsCreatorCriteriaWeighting:
        nextKind === "criteriaWeighting"
          ? current.supportsCreatorCriteriaWeighting
          : false,
      supportsExpertCriteriaWeighting:
        nextKind === "criteriaWeighting"
          ? current.supportsExpertCriteriaWeighting
          : false,
    }));
    resetActionState();
  }, [resetActionState]);

  return (
    <>
      <Box elevation={0} sx={pagePanelSx}>
        <Stack spacing={0}>
          <InlineSection
            title="Registry tamplates"
            subtitle="Preview first, then apply missing scaffold files."
            action={(
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadCatalog()}
                  disabled={loadingCatalog}
                  sx={{ textTransform: "none", fontWeight: 900 }}
                >
                  Reload
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={loadExample}
                  sx={{ textTransform: "none", fontWeight: 900 }}
                >
                  Load example
                </Button>
              </Stack>
            )}
          >
            <Stack spacing={1}>
              {catalogError && (
                <Alert severity="warning" variant="outlined">
                  {catalogError}
                </Alert>
              )}
              {actionError && (
                <Alert severity="error" variant="outlined">
                  {actionError}
                </Alert>
              )}
            </Stack>
          </InlineSection>

          <SectionDivider theme={theme} />

          <InlineSection title="Model">
            <Stack spacing={1.65}>
              <Box sx={modelFieldsGridSx}>
                <TextField
                  label="apiModelKey"
                  value={formState.apiModelKey}
                  onChange={(event) => setField("apiModelKey", event.target.value)}
                  helperText="snake_case"
                  color="info"
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Display name"
                  value={formState.displayName}
                  onChange={(event) => setField("displayName", event.target.value)}
                  color="info"
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Short description"
                  value={formState.smallDescription}
                  onChange={(event) => setField("smallDescription", event.target.value)}
                  color="info"
                  size="small"
                  fullWidth
                />
                <TextField
                  label="More info URL"
                  value={formState.moreInfoUrl}
                  onChange={(event) => setField("moreInfoUrl", event.target.value)}
                  color="info"
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Extended description"
                  value={formState.extendedDescription}
                  onChange={(event) => setField("extendedDescription", event.target.value)}
                  minRows={3}
                  multiline
                  fullWidth
                  color="info"
                  size="small"
                  sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 1.2, md: 1.4 },
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "minmax(260px, 0.72fr) minmax(360px, 1.28fr)",
                  },
                  alignItems: "center",
                }}
              >
                <ToggleButtonGroup
                  exclusive
                  color="info"
                  value={formState.modelKind}
                  onChange={(_event, value) => updateModelKind(value)}
                  size="small"
                  sx={{
                    width: "100%",
                    p: 0.25,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.common.white, 0.025),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.07)}`,
                    "& .MuiToggleButton-root": {
                      flex: 1,
                      border: 0,
                      borderRadius: 1.6,
                      color: "text.secondary",
                      textTransform: "none",
                      fontWeight: 900,
                      px: 1,
                    },
                    "& .Mui-selected": {
                      color: "info.main",
                      bgcolor: `${alpha(theme.palette.info.main, 0.13)} !important`,
                    },
                  }}
                >
                  {MODEL_KIND_OPTIONS.map((option) => (
                    <ToggleButton key={option.value} value={option.value}>
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Autocomplete
                  freeSolo
                  options={evaluationOptions}
                  value={
                    formState.evaluationStructureKey
                      ? evaluationOptions.find(
                        (item) => item.key === formState.evaluationStructureKey
                      ) || formState.evaluationStructureKey
                      : null
                  }
                  onChange={(_event, value) => {
                    if (typeof value === "string") {
                      setField("evaluationStructureKey", value);
                      return;
                    }

                    setField("evaluationStructureKey", value?.key || "");
                  }}
                  onInputChange={(_event, value, reason) => {
                    if (reason === "input") setField("evaluationStructureKey", value);
                  }}
                  getOptionLabel={getCatalogKeyLabel}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      color="info"
                      label="evaluationStructureKey"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {evaluationStatus && (
                              <Chip
                                size="small"
                                color={evaluationStatus.color}
                                variant="outlined"
                                label={evaluationStatus.label}
                                sx={{ mr: 0.5 }}
                              />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <FormControlLabel
                sx={{ m: 0 }}
                control={(
                  <Switch
                    checked={formState.includeExamples}
                    onChange={(event) => setField("includeExamples", event.target.checked)}
                    color="info"
                  />
                )}
                label="Include examples"
              />

              {selectedEvaluationStructure?.status === "partial" && (
                <Alert severity="warning" variant="outlined">
                  Selected evaluation structure is partial.
                </Alert>
              )}
            </Stack>
          </InlineSection>

          <SectionDivider theme={theme} />

          <InlineSection title="Capabilities">
            <Stack spacing={1.55}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.9,
                  alignItems: "center",
                }}
              >
                {formState.modelKind === "issue" && (
                  <>
                    <CapabilityToggle
                      label="Supports consensus"
                      checked={formState.supportsConsensus}
                      onChange={(checked) => setField("supportsConsensus", checked)}
                    />
                    <CapabilityToggle
                      label="Is multi criteria"
                      checked={formState.isMultiCriteria}
                      onChange={(checked) => setField("isMultiCriteria", checked)}
                    />
                    <CapabilityToggle
                      label="Uses criteria weights"
                      checked={formState.usesCriteriaWeights}
                      onChange={(checked) => setField("usesCriteriaWeights", checked)}
                    />
                    <CapabilityToggle
                      label="Uses fuzzy criteria weights"
                      checked={formState.usesFuzzyCriteriaWeights}
                      onChange={(checked) => setField("usesFuzzyCriteriaWeights", checked)}
                    />
                  </>
                )}

                {formState.modelKind === "criteriaWeighting" && (
                  <>
                    <CapabilityToggle
                      label="Creator weighting"
                      checked={formState.supportsCreatorCriteriaWeighting}
                      onChange={(checked) => setField("supportsCreatorCriteriaWeighting", checked)}
                    />
                    <CapabilityToggle
                      label="Expert weighting"
                      checked={formState.supportsExpertCriteriaWeighting}
                      onChange={(checked) => setField("supportsExpertCriteriaWeighting", checked)}
                    />
                  </>
                )}

                <CapabilityToggle
                  label="Consensus simulation"
                  checked={formState.supportsConsensusSimulation}
                  onChange={(checked) => setField("supportsConsensusSimulation", checked)}
                />
                <CapabilityToggle
                  label="Expert weights"
                  checked={formState.usesExpertWeights}
                  onChange={(checked) => setField("usesExpertWeights", checked)}
                />
                <CapabilityToggle
                  label="Criterion types"
                  checked={formState.usesCriterionTypes}
                  onChange={(checked) => setField("usesCriterionTypes", checked)}
                />
              </Box>

              <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={0.8}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 900, mr: 0.5 }}>
                  Domains
                </Typography>
                {DOMAIN_OPTIONS.map((domain) => {
                  const checked = formState.supportedDomains.includes(domain);

                  return (
                    <FormControlLabel
                      key={domain}
                      sx={{ m: 0, mr: 1 }}
                      control={(
                        <Checkbox
                          color="info"
                          size="small"
                          checked={checked}
                          onChange={(event) => {
                            const nextDomains = event.target.checked
                              ? [...formState.supportedDomains, domain]
                              : formState.supportedDomains.filter((item) => item !== domain);
                            setField("supportedDomains", Array.from(new Set(nextDomains)));
                          }}
                        />
                      )}
                      label={domain}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </InlineSection>

          <SectionDivider theme={theme} />

          <InlineSection
            title="Parameters"
            action={(
              <Button
                size="small"
                variant="outlined"
                color="info"
                startIcon={<AddCircleOutlineIcon />}
                onClick={addParameter}
                sx={{ textTransform: "none", fontWeight: 900 }}
              >
                Add parameter
              </Button>
            )}
          >
            {formState.parameters.length === 0 ? (
              <EmptyState>No parameters added yet.</EmptyState>
            ) : (
              <Stack spacing={0} divider={<Divider flexItem sx={sectionDividerSx(theme)} />}>
                {formState.parameters.map((parameter, index) => (
                  <ParameterCard
                    key={parameter.id}
                    parameter={parameter}
                    index={index}
                    theme={theme}
                    parameterStructureOptions={parameterStructureOptions}
                    parameterStructureMap={parameterStructureMap}
                    setParameterField={setParameterField}
                    setParameterExpanded={setParameterExpanded}
                    removeParameter={removeParameter}
                  />
                ))}
              </Stack>
            )}
          </InlineSection>

          <SectionDivider theme={theme} />

          <InlineSection
            title="Run"
            action={(
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<PlayArrowIcon />}
                  onClick={runPreview}
                  disabled={previewLoading}
                  sx={{ textTransform: "none", fontWeight: 900 }}
                >
                  Preview
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={() => setApplyDialogOpen(true)}
                  disabled={!previewResult || previewLoading || applyLoading}
                  sx={{ textTransform: "none", fontWeight: 900 }}
                >
                  Apply
                </Button>
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={(
                    <Checkbox
                      color="info"
                      size="small"
                      checked={runFullFrontendBuild}
                      onChange={(event) => setRunFullFrontendBuild(event.target.checked)}
                    />
                  )}
                  label="Run full frontend build after apply"
                />
              </Stack>
            )}
          >
            <Stack
              spacing={2.35}
              divider={<Divider flexItem sx={{ ...sectionDividerSx(theme), my: 0.25 }} />}
            >
              <Accordion
                disableGutters
                defaultExpanded={false}
                sx={flatAccordionSx(theme)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={flatAccordionSummarySx}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                    Request payload
                  </Typography>
                </AccordionSummary>

                <AccordionDetails sx={flatAccordionDetailsSx}>
                  <Box
                    component="pre"
                    sx={{
                      ...codeBlockSx(theme),
                      p: 1.45,
                      minHeight: 44,
                      borderRadius: 1.5,
                    }}
                  >
                    {requestPayloadPreview
                      ? formatJsonPreview(requestPayloadPreview)
                      : "Run Preview to see the normalized request payload."}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1.15 }}>
                  Preview result
                </Typography>

                {!previewResult ? (
                  <Box sx={{ py: 0.4 }}>
                    <EmptyState>No preview has been generated yet.</EmptyState>
                  </Box>
                ) : (
                  <Stack
                    spacing={0}
                    divider={<Divider flexItem sx={sectionDividerSx(theme)} />}
                  >
                    {(previewResult.items || []).map((item) => (
                      <Box key={`${item.kind}-${item.key}`} sx={{ py: 1 }}>
                        <ResultAccordion item={item} theme={theme} />
                      </Box>
                    ))}
                  </Stack>
                )}

                <Box sx={{ pt: 1.35 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1.15 }}>
                    Preview validation
                  </Typography>
                  <ValidationPanel
                    theme={theme}
                    title="preview"
                    validation={previewResult?.validation || null}
                    emptyMessage="No preview validation available yet."
                  />
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1.35 }}>Apply results</Typography>

                {!applyResult ? (
                  <Box sx={{ py: 0.4 }}>
                    <EmptyState>No scaffold package has been applied yet.</EmptyState>
                  </Box>
                ) : (
                  <Stack spacing={1.25}>
                    <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                      Run Manifest Sync manually if you want newly generated models to appear in
                      the admin catalog.
                    </Alert>

                    {backendRestartRequired && (
                      <Alert
                        severity="warning"
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                        action={(
                          <Button
                            color="warning"
                            variant="outlined"
                            size="small"
                            onClick={handleApplyBackendChanges}
                            sx={{ textTransform: "none", fontWeight: 900 }}
                          >
                            Apply backend changes
                          </Button>
                        )}
                      >
                        <AlertTitle>Backend restart required</AlertTitle>
                        Generated backend runtime files are written, but the Backend must restart
                        to load them.
                      </Alert>
                    )}

                    <Stack
                      spacing={0}
                      divider={<Divider flexItem sx={sectionDividerSx(theme)} />}
                    >
                      {(applyResult.items || []).map((item) => (
                        <Box key={`${item.kind}-${item.key}`} sx={{ py: 1.15 }}>
                          <Stack spacing={1}>
                            <ResultItemSummary item={item} />

                            {item.writtenFiles?.length > 0 && (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 950, mb: 0.5 }}>
                                  Written files
                                </Typography>

                                <Stack spacing={0.45}>
                                  {item.writtenFiles.map((file) => (
                                    <Typography
                                      key={file.path}
                                      variant="caption"
                                      sx={{
                                        color: "text.secondary",
                                        fontWeight: 800,
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {file.path}
                                    </Typography>
                                  ))}
                                </Stack>
                              </Box>
                            )}

                            {item.skippedFiles?.length > 0 && (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 950, mb: 0.5 }}>
                                  Skipped files
                                </Typography>

                                <Stack spacing={0.45}>
                                  {item.skippedFiles.map((file) => (
                                    <Typography
                                      key={file.path}
                                      variant="caption"
                                      sx={{
                                        color: "text.secondary",
                                        fontWeight: 800,
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {file.path}
                                    </Typography>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                )}

                <Box sx={{ pt: 1.35 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1.15 }}>
                    Apply validation
                  </Typography>
                  <ValidationPanel
                    theme={theme}
                    title="apply"
                    validation={applyValidationResult}
                    emptyMessage="No apply validation available yet."
                    showFrontendSkippedNote
                  />
                </Box>
              </Box>
            </Stack>
          </InlineSection>
        </Stack>
      </Box>

      <ConfirmationDialog
        open={applyDialogOpen}
        onClose={() => {
          if (!applyLoading) setApplyDialogOpen(false);
        }}
        title="Apply scaffold package?"
        subtitle="This will write missing scaffold files to the project. Existing items are skipped."
        tone="warning"
        actions={[
          {
            id: "cancel-apply-model-forge",
            label: "Cancel",
            onClick: () => setApplyDialogOpen(false),
            disabled: applyLoading,
          },
          {
            id: "confirm-apply-model-forge",
            label: "Apply scaffold",
            color: "warning",
            variant: "contained",
            onClick: runApply,
            loading: applyLoading,
            autoFocus: true,
          },
        ]}
      />
    </>
  );

}
