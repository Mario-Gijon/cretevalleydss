import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  applyModelForgeModelPackage,
  getModelForgeCatalog,
  previewModelForgeModelPackage,
} from "../../../services/admin.service";
import EmptyState from "../models/components/EmptyState";
import SectionCard from "../models/components/SectionCard";
import { getAdminIssueDetailCardSx } from "../issues/styles/adminIssues.styles";

const MODEL_KIND_OPTIONS = [
  { value: "issue", label: "Issue model" },
  { value: "criteriaWeighting", label: "Criteria weighting model" },
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

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseLiteralValue = (rawValue) => {
  const text = String(rawValue ?? "");
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;

  const parsedNumber = Number(trimmed);
  if (Number.isFinite(parsedNumber)) {
    return parsedNumber;
  }

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
  if (!text) {
    return undefined;
  }

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
  const parameterStructureKey = String(
    parameter?.parameterStructureKey || ""
  ).trim();

  if (!key) {
    throw new Error(`Parameter ${index + 1} is missing key`);
  }
  if (!label) {
    throw new Error(`Parameter ${index + 1} is missing label`);
  }
  if (!parameterStructureKey) {
    throw new Error(`Parameter ${index + 1} is missing parameterStructureKey`);
  }
  if (!PARAMETER_STRUCTURE_KEY_PATTERN.test(parameterStructureKey)) {
    throw new Error(
      `${identifier} parameterStructureKey must use lower camelCase`
    );
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
    if (allowed.length > 0) {
      restrictions = { allowed };
    }
  } else if (restrictionsMode === "customJson") {
    const parsed = parseJsonOrThrow(
      parameter?.restrictionsJsonText,
      `${identifier} restrictions`
    );

    if (parsed !== null && !isPlainObject(parsed)) {
      throw new Error(
        `${identifier} restrictions must be a JSON object or null`
      );
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
  const parameterStructureKey = String(
    parameter?.parameterStructureKey || ""
  ).trim();

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
    if (message.includes("parameterStructureKey")) {
      errors.parameterStructureKey = message;
    }
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
  if (status === "partial") return "warning";
  return "info";
};

const formatJsonPreview = (value) => {
  if (value === null || value === undefined) {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function AdminModelForgeSection() {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [formState, setFormState] = useState(buildInitialFormState);
  const [requestPayloadPreview, setRequestPayloadPreview] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [actionError, setActionError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const loadCatalog = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) {
        setLoadingCatalog(true);
      }

      setCatalogError("");

      try {
        const response = await getModelForgeCatalog();

        if (!response?.success) {
          const message =
            response?.message ||
            "ModelForge is not configured or not available. Start ModelForge and configure MODEL_FORGE_BASE_URL to use scaffold generation.";
          setCatalogError(message);
          showSnackbarAlert(message, "error");
          return false;
        }

        setCatalog(response.data || null);
        return true;
      } catch (error) {
        console.error(error);
        const message =
          "ModelForge is not configured or not available. Start ModelForge and configure MODEL_FORGE_BASE_URL to use scaffold generation.";
        setCatalogError(message);
        showSnackbarAlert(message, "error");
        return false;
      } finally {
        if (!quiet) {
          setLoadingCatalog(false);
        }
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

  const requiredParameterStructures = useMemo(() => {
    const seen = new Set();
    const keys = [];

    formState.parameters.forEach((parameter) => {
      const key = String(parameter?.parameterStructureKey || "").trim();
      if (!key || seen.has(key)) {
        return;
      }

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
    setActionError("");
  }, []);

  const setParameterField = useCallback((id, field, value) => {
    setFormState((current) => ({
      ...current,
      parameters: current.parameters.map((parameter) =>
        parameter.id === id ? { ...parameter, [field]: value } : parameter
      ),
    }));
    setPreviewResult(null);
    setApplyResult(null);
    setActionError("");
  }, []);

  const setParameterExpanded = useCallback((id, expanded) => {
    setFormState((current) => ({
      ...current,
      parameters: current.parameters.map((parameter) =>
        parameter.id === id
          ? { ...parameter, advancedExpanded: expanded }
          : parameter
      ),
    }));
    setPreviewResult(null);
    setApplyResult(null);
    setActionError("");
  }, []);

  const addParameter = useCallback(() => {
    setFormState((current) => ({
      ...current,
      parameters: [...current.parameters, buildEmptyParameterRow()],
    }));
    setPreviewResult(null);
    setApplyResult(null);
    setActionError("");
  }, []);

  const removeParameter = useCallback((id) => {
    setFormState((current) => ({
      ...current,
      parameters: current.parameters.filter((parameter) => parameter.id !== id),
    }));
    setPreviewResult(null);
    setApplyResult(null);
    setActionError("");
  }, []);

  const loadExample = useCallback(() => {
    setFormState(buildExampleFormState());
    setPreviewResult(null);
    setApplyResult(null);
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

    if (!apiModelKey) {
      throw new Error("apiModelKey is required");
    }
    if (!displayName) {
      throw new Error("displayName is required");
    }
    if (!smallDescription) {
      throw new Error("smallDescription is required");
    }
    if (!extendedDescription) {
      throw new Error("extendedDescription is required");
    }
    if (!evaluationStructureKey) {
      throw new Error("evaluationStructureKey is required");
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
          formState.modelKind === "issue"
            ? formState.usesFuzzyCriteriaWeights
            : false,
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
          : {
            evaluationStructureKey,
          },
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
      showSnackbarAlert(
        response.message || "Model Forge scaffold preview completed",
        "success"
      );
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
    if (!requestPayloadPreview) {
      return;
    }

    setApplyLoading(true);
    setActionError("");

    try {
      const response = await applyModelForgeModelPackage(requestPayloadPreview);

      if (!response?.success) {
        const message =
          response?.message || "Error applying Model Forge scaffold package.";
        setActionError(message);
        showSnackbarAlert(message, "error");
        return false;
      }

      setApplyResult(response.data || null);
      setApplyDialogOpen(false);
      showSnackbarAlert(
        response.message || "Model Forge scaffold package applied",
        "success"
      );
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
  }, [requestPayloadPreview, showSnackbarAlert]);

  return (
    <>
      <Stack spacing={1.25}>

        <SectionCard
          title="Model Forge"
          subtitle="Preview does not write files. Apply writes only missing scaffold files and skips existing items."
          action={(
            <Stack direction="row" spacing={0.8}>
              <Button
                size="small"
                variant="outlined"
                color="info"
                startIcon={<RefreshIcon />}
                onClick={() => loadCatalog()}
                disabled={loadingCatalog}
              >
                Reload catalog
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AutoFixHighIcon />}
                onClick={loadExample}
              >
                Load example
              </Button>
            </Stack>
          )}
        >
          <Stack spacing={1}>
            {/* <Alert severity="info" variant="outlined">
              Generated models start with <strong>implementationStatus scaffold</strong>
              {" "}and are not public usable until marked ready in code.
            </Alert>
            <Alert severity="info" variant="outlined">
              Existing model, evaluation structure, and parameter structure scaffolds are
              skipped. Partial states are reported during preview and abort apply.
            </Alert> */}
            {catalogError && (
              <Alert severity="warning" variant="outlined">
                ModelForge is not configured or not available. Start ModelForge and configure
                {" "}MODEL_FORGE_BASE_URL to use scaffold generation.
                {catalogError ? ` ${catalogError}` : ""}
              </Alert>
            )}
            {actionError && (
              <Alert severity="error" variant="outlined">
                {actionError}
              </Alert>
            )}
          </Stack>
        </SectionCard>

        <SectionCard title="Model identity" subtitle="Stable identifiers and public catalog metadata.">
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
            }}
          >
            <TextField
              label="apiModelKey"
              value={formState.apiModelKey}
              onChange={(event) => setField("apiModelKey", event.target.value)}
              helperText="snake_case. Used as folder name and endpoint path."
              color="info"
              fullWidth
            />
            <TextField
              label="Display name"
              value={formState.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
              color="info"
              fullWidth
            />
            <TextField
              label="Short description"
              value={formState.smallDescription}
              onChange={(event) => setField("smallDescription", event.target.value)}
              color="info"
              fullWidth
            />
            <TextField
              label="More info URL"
              value={formState.moreInfoUrl}
              onChange={(event) => setField("moreInfoUrl", event.target.value)}
              placeholder="https://example.com/docs"
              color="info"
              fullWidth
            />
            <TextField
              label="Extended description"
              value={formState.extendedDescription}
              onChange={(event) => setField("extendedDescription", event.target.value)}
              minRows={4}
              multiline
              fullWidth
              color="info"
              sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={formState.includeExamples}
                  onChange={(event) => setField("includeExamples", event.target.checked)}
                  color="info"
                />
              )}
              label="Include request/response example scaffolds"
            />
          </Box>
        </SectionCard>

        <SectionCard title="Model kind" subtitle="Controls capability flags and compatible evaluation structures.">
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
            }}
          >
            <Autocomplete
              options={MODEL_KIND_OPTIONS}
              value={
                MODEL_KIND_OPTIONS.find((item) => item.value === formState.modelKind) || null
              }
              onChange={(_event, value) => {
                const nextKind = value?.value || "issue";
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
                    nextKind === "issue"
                      ? current.usesFuzzyCriteriaWeights
                      : false,
                  supportsCreatorCriteriaWeighting:
                    nextKind === "criteriaWeighting"
                      ? current.supportsCreatorCriteriaWeighting
                      : false,
                  supportsExpertCriteriaWeighting:
                    nextKind === "criteriaWeighting"
                      ? current.supportsExpertCriteriaWeighting
                      : false,
                }));
                setPreviewResult(null);
                setApplyResult(null);
                setActionError("");
              }}
              color="info"
              getOptionLabel={(option) => option?.label || ""}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              renderInput={(params) => <TextField color="info" {...params} label="Model kind" />}
            />
          </Box>
        </SectionCard>

        <SectionCard title="Evaluation structure" subtitle="Catalog-backed selector with support for generating a new structure key.">
          <Stack spacing={1}>
            <Autocomplete
              freeSolo
              options={evaluationOptions}
              color="info"
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
                if (reason === "input") {
                  setField("evaluationStructureKey", value);
                }
              }}
              getOptionLabel={(option) =>
                typeof option === "string"
                  ? option
                  : option?.label
                    ? `${option.label} (${option.key})`
                    : option?.key || ""
              }
              renderTags={(value, getTagProps) =>
                value
                  ? [
                    <Chip
                      {...getTagProps({ index: 0 })}
                      key={typeof value === "string" ? value : value?.key}
                      label={
                        typeof value === "string"
                          ? value
                          : `${value?.label || value?.key} (${value?.status})`
                      }
                    />,
                  ]
                  : []
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  color="info"
                  label="evaluationStructureKey"
                  helperText={
                    formState.modelKind === "criteriaWeighting"
                      ? "Ready criteria-weighting structures are listed. Type a new key to scaffold one."
                      : "Ready issue evaluation structures are listed. Type a new key to scaffold one."
                  }
                />
              )}
            />

            {selectedEvaluationStructure?.status === "partial" && (
              <Alert severity="warning" variant="outlined">
                The selected evaluation structure exists only partially in the catalog.
                Preview will report the partial state and apply will abort until it is fixed.
              </Alert>
            )}

            {/* {formState.evaluationStructureKey.trim() &&
              !selectedEvaluationStructure && (
                <Alert severity="info" variant="outlined">
                  This evaluation structure key does not exist in the ready catalog.
                  Preview will include a new evaluation structure scaffold.
                </Alert>
              )} */}
          </Stack>
        </SectionCard>

        <SectionCard title="Capabilities" subtitle="Only the relevant flags for the selected model kind are shown.">
          <Box
            sx={{
              display: "grid",
              gap: 0.4,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
            }}
          >
            {formState.modelKind === "issue" && (
              <>
                <FormControlLabel
                  control={(
                    <Switch
                      checked={formState.supportsConsensus}
                      onChange={(event) =>
                        setField("supportsConsensus", event.target.checked)
                      }
                      color="info"
                    />
                  )}
                  label="Supports consensus"
                />
                <FormControlLabel
                  control={(
                    <Switch
                      checked={formState.isMultiCriteria}
                      color="info"
                      onChange={(event) =>
                        setField("isMultiCriteria", event.target.checked)
                      }
                    />
                  )}
                  label="Is multi criteria"
                />
                <FormControlLabel
                  control={(
                    <Switch
                      checked={formState.usesCriteriaWeights}
                      color="info"
                      onChange={(event) =>
                        setField("usesCriteriaWeights", event.target.checked)
                      }
                    />
                  )}
                  label="Uses criteria weights"
                />
                <FormControlLabel
                  control={(
                    <Switch
                      checked={formState.usesFuzzyCriteriaWeights}
                      color="info"
                      onChange={(event) =>
                        setField("usesFuzzyCriteriaWeights", event.target.checked)
                      }
                    />
                  )}
                  label="Uses fuzzy criteria weights"
                />
              </>
            )}

            {formState.modelKind === "criteriaWeighting" && (
              <>
                <FormControlLabel
                  control={(
                    <Switch
                      color="info"
                      checked={formState.supportsCreatorCriteriaWeighting}
                      onChange={(event) =>
                        setField(
                          "supportsCreatorCriteriaWeighting",
                          event.target.checked
                        )
                      }
                    />
                  )}
                  label="Supports creator criteria weighting"
                />
                <FormControlLabel
                  control={(
                    <Switch
                      color="info"
                      checked={formState.supportsExpertCriteriaWeighting}
                      onChange={(event) =>
                        setField(
                          "supportsExpertCriteriaWeighting",
                          event.target.checked
                        )
                      }
                    />
                  )}
                  label="Supports expert criteria weighting"
                />
              </>
            )}

            <FormControlLabel
              control={(
                <Switch
                  color="info"
                  checked={formState.supportsConsensusSimulation}
                  onChange={(event) =>
                    setField("supportsConsensusSimulation", event.target.checked)
                  }
                />
              )}
              label="Supports consensus simulation"
            />
            <FormControlLabel
              control={(
                <Switch
                  color="info"
                  checked={formState.usesExpertWeights}
                  onChange={(event) => setField("usesExpertWeights", event.target.checked)}
                />
              )}
              label="Uses expert weights"
            />
            <FormControlLabel
              control={(
                <Switch
                  color="info"
                  checked={formState.usesCriterionTypes}
                  onChange={(event) => setField("usesCriterionTypes", event.target.checked)}
                />
              )}
              label="Uses criterion types"
            />
          </Box>
        </SectionCard>

        <SectionCard title="Supported domains" subtitle="Stored as supportedDomains: string[].">
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.6}>
            {DOMAIN_OPTIONS.map((domain) => {
              const checked = formState.supportedDomains.includes(domain);

              return (
                <FormControlLabel
                  key={domain}
                  control={(
                    <Checkbox
                      color="info"
                      checked={checked}
                      onChange={(event) => {
                        const nextDomains = event.target.checked
                          ? [...formState.supportedDomains, domain]
                          : formState.supportedDomains.filter((item) => item !== domain);
                        setField(
                          "supportedDomains",
                          Array.from(new Set(nextDomains))
                        );
                      }}
                    />
                  )}
                  label={domain}
                />
              );
            })}
          </Stack>
        </SectionCard>

        <SectionCard
          title="Parameters"
          subtitle="Editable scaffold rows. parameterStructureKey can reference an existing ready structure or a new key."
          action={(
            <Button
              size="small"
              variant="outlined"
              color="info"
              startIcon={<AddCircleOutlineIcon />}
              onClick={addParameter}
            >
              Add parameter
            </Button>
          )}
        >
          {formState.parameters.length === 0 ? (
            <EmptyState>No parameters added yet.</EmptyState>
          ) : (
            <Stack spacing={1}>
              {formState.parameters.map((parameter, index) => {
                const selectedParameterStructure =
                  parameterStructureMap.get(
                    String(parameter.parameterStructureKey || "").trim()
                  ) || null;
                const parameterErrors = getParameterRowValidation(parameter, index);

                return (
                  <Paper
                    key={parameter.id}
                    elevation={0}
                    sx={(currentTheme) => ({
                      ...getAdminIssueDetailCardSx(currentTheme),
                      p: 1,
                      bgcolor: alpha(currentTheme.palette.common.white, 0.03),
                    })}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                          Parameter {index + 1}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => removeParameter(parameter.id)}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <Box
                        sx={{
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: {
                            xs: "1fr",
                            lg: "repeat(2, minmax(0, 1fr))",
                          },
                        }}
                      >
                        <TextField
                          label="key"
                          value={parameter.key}
                          onChange={(event) =>
                            setParameterField(parameter.id, "key", event.target.value)
                          }
                          error={Boolean(parameterErrors.key)}
                          helperText={parameterErrors.key || "Stored as parameter.key"}
                          fullWidth
                          color="info"
                        />
                        <TextField
                          label="label"
                          value={parameter.label}
                          onChange={(event) =>
                            setParameterField(parameter.id, "label", event.target.value)
                          }
                          error={Boolean(parameterErrors.label)}
                          helperText={parameterErrors.label || "Display label"}
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
                          color="info"
                          onChange={(_event, value) =>
                            setParameterField(
                              parameter.id,
                              "parameterStructureKey",
                              typeof value === "string" ? value : value?.key || ""
                            )
                          }
                          onInputChange={(_event, value, reason) => {
                            if (reason === "input") {
                              setParameterField(
                                parameter.id,
                                "parameterStructureKey",
                                value
                              );
                            }
                          }}
                          getOptionLabel={(option) =>
                            typeof option === "string" ? option : option?.key || ""
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="parameterStructureKey"
                              error={Boolean(parameterErrors.parameterStructureKey)}
                              helperText={
                                parameterErrors.parameterStructureKey ||
                                "Catalog-backed. New lower camelCase keys are allowed."
                              }
                              color="info"
                              fullWidth
                            />
                          )}
                        />
                        <FormControlLabel
                          control={(
                            <Switch
                              color="info"
                              checked={parameter.required === true}
                              onChange={(event) =>
                                setParameterField(
                                  parameter.id,
                                  "required",
                                  event.target.checked
                                )
                              }
                            />
                          )}
                          label="Required"
                        />
                        <Autocomplete
                          options={DEFAULT_MODE_OPTIONS}
                          color="info"
                          value={
                            DEFAULT_MODE_OPTIONS.find(
                              (item) => item.value === (parameter.defaultMode || "null")
                            ) || DEFAULT_MODE_OPTIONS[0]
                          }
                          onChange={(_event, value) =>
                            setParameterField(
                              parameter.id,
                              "defaultMode",
                              value?.value || "null"
                            )
                          }
                          getOptionLabel={(option) => option?.label || ""}
                          isOptionEqualToValue={(option, value) => option.value === value.value}
                          renderInput={(params) => (
                            <TextField color="info" {...params} label="Default mode" fullWidth />
                          )}
                        />
                        {(parameter.defaultMode || "null") === "literal" && (
                          <TextField
                          color="info"
                            label="Default literal value"
                            value={parameter.defaultLiteralText || ""}
                            onChange={(event) =>
                              setParameterField(
                                parameter.id,
                                "defaultLiteralText",
                                event.target.value
                              )
                            }
                            helperText={parameterErrors.default || 'Numbers and "true"/"false" are parsed.'}
                            error={Boolean(parameterErrors.default)}
                            fullWidth
                          />
                        )}
                        {(parameter.defaultMode || "null") === "customJson" && (
                          <TextField
                          color="info"
                            label="Default custom JSON"
                            value={parameter.defaultJsonText || ""}
                            onChange={(event) =>
                              setParameterField(
                                parameter.id,
                                "defaultJsonText",
                                event.target.value
                              )
                            }
                            minRows={4}
                            multiline
                            helperText={parameterErrors.default || "Any valid JSON value."}
                            error={Boolean(parameterErrors.default)}
                            fullWidth
                            sx={{ gridColumn: { xs: "auto", lg: "1 / -1" } }}
                          />
                        )}
                        <Autocomplete
                          options={RESTRICTIONS_MODE_OPTIONS}
                          value={
                            RESTRICTIONS_MODE_OPTIONS.find(
                              (item) =>
                                item.value === (parameter.restrictionsMode || "none")
                            ) || RESTRICTIONS_MODE_OPTIONS[0]
                          }
                          onChange={(_event, value) =>
                            setParameterField(
                              parameter.id,
                              "restrictionsMode",
                              value?.value || "none"
                            )
                          }
                          color="info"
                          getOptionLabel={(option) => option?.label || ""}
                          isOptionEqualToValue={(option, value) => option.value === value.value}
                          renderInput={(params) => (
                            <TextField {...params} label="Restrictions mode" fullWidth />
                          )}
                        />
                        {(parameter.restrictionsMode || "none") === "minMax" && (
                          <>
                            <TextField
                              label="Min"
                              value={parameter.restrictionsMinText || ""}
                              color="info"
                              onChange={(event) =>
                                setParameterField(
                                  parameter.id,
                                  "restrictionsMinText",
                                  event.target.value
                                )
                              }
                              error={Boolean(parameterErrors.restrictions)}
                              helperText={parameterErrors.restrictions || "Optional"}
                              fullWidth
                            />
                            <TextField
                              label="Max"
                              color="info"
                              value={parameter.restrictionsMaxText || ""}
                              onChange={(event) =>
                                setParameterField(
                                  parameter.id,
                                  "restrictionsMaxText",
                                  event.target.value
                                )
                              }
                              error={Boolean(parameterErrors.restrictions)}
                              helperText={parameterErrors.restrictions || "Optional"}
                              fullWidth
                            />
                          </>
                        )}
                        {(parameter.restrictionsMode || "none") === "options" && (
                          <TextField
                            label="Options"
                            color="info"
                            value={parameter.restrictionsOptionsText || ""}
                            onChange={(event) =>
                              setParameterField(
                                parameter.id,
                                "restrictionsOptionsText",
                                event.target.value
                              )
                            }
                            minRows={4}
                            multiline
                            helperText={
                              parameterErrors.restrictions ||
                              "Comma or newline separated. Strings, numbers, and booleans are supported."
                            }
                            error={Boolean(parameterErrors.restrictions)}
                            fullWidth
                            sx={{ gridColumn: { xs: "auto", lg: "1 / -1" } }}
                          />
                        )}
                        {(parameter.restrictionsMode || "none") === "customJson" && (
                          <TextField
                          color="info"
                            label="Restrictions custom JSON"
                            value={parameter.restrictionsJsonText || ""}
                            onChange={(event) =>
                              setParameterField(
                                parameter.id,
                                "restrictionsJsonText",
                                event.target.value
                              )
                            }
                            minRows={4}
                            multiline
                            helperText={
                              parameterErrors.restrictions ||
                              "Must be a JSON object or null."
                            }
                            error={Boolean(parameterErrors.restrictions)}
                            fullWidth
                            sx={{ gridColumn: { xs: "auto", lg: "1 / -1" } }}
                          />
                        )}
                      </Box>

                      <Accordion
                        disableGutters
                        expanded={parameter.advancedExpanded === true}
                        onChange={(_event, expanded) =>
                          setParameterExpanded(parameter.id, expanded)
                        }
                        sx={{
                          bgcolor: alpha(theme.palette.common.white, 0.02),
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                          "&:before": { display: "none" },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>
                            Advanced JSON
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TextField
                          color="info"
                            label="Advanced JSON"
                            value={parameter.advancedJsonText || ""}
                            onChange={(event) =>
                              setParameterField(
                                parameter.id,
                                "advancedJsonText",
                                event.target.value
                              )
                            }
                            minRows={4}
                            multiline
                            helperText={
                              parameterErrors.advanced ||
                              "Optional JSON object merged into the parameter. Protected fields cannot be overridden."
                            }
                            error={Boolean(parameterErrors.advanced)}
                            fullWidth
                          />
                        </AccordionDetails>
                      </Accordion>

                      {selectedParameterStructure?.status === "partial" && (
                        <Alert severity="warning" variant="outlined">
                          parameterStructureKey <strong>{selectedParameterStructure.key}</strong>
                          {" "}exists only partially. Preview will report the partial state.
                        </Alert>
                      )}

                      {String(parameter.parameterStructureKey || "").trim() &&
                        !selectedParameterStructure &&
                        !parameterErrors.parameterStructureKey && (
                          <Alert severity="info" variant="outlined">
                            parameterStructureKey <strong>{parameter.parameterStructureKey}</strong>
                            {" "}is not in the ready catalog. Preview will include a new parameter structure scaffold.
                          </Alert>
                        )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title="Request payload"
          subtitle="Payload that will be sent to Backend → Model Forge on preview/apply."
        >
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.common.black, 0.22),
              color: "text.secondary",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {requestPayloadPreview
              ? formatJsonPreview(requestPayloadPreview)
              : "Run Preview scaffold to see the normalized request payload."}
          </Box>
        </SectionCard>

        <SectionCard
          title="Actions"
          subtitle="Preview does not write files. Apply writes only missing scaffold files."
        >
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
            >
              Preview scaffold
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RocketLaunchIcon />}
              onClick={() => setApplyDialogOpen(true)}
              disabled={!previewResult || previewLoading || applyLoading}
            >
              Apply scaffold
            </Button>
          </Stack>
        </SectionCard>

        <SectionCard title="Preview result" subtitle="Generated files are shown inline for review before writing.">
          {!previewResult ? (
            <EmptyState>No preview has been generated yet.</EmptyState>
          ) : (
            <Stack spacing={1}>
              {(previewResult.items || []).map((item) => (
                <Accordion
                  key={`${item.kind}-${item.key}`}
                  disableGutters
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.03),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                    borderRadius: 2,
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          label={item.kind}
                          color="info"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={item.status}
                          color={formatStatusSeverity(item.status)}
                          variant="filled"
                        />
                        <Chip size="small" label={item.key} variant="outlined" />
                        <Chip
                          size="small"
                          label={`${item.files?.length || 0} files`}
                          variant="outlined"
                        />
                      </Stack>
                      {item.reason && (
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                          {item.reason}
                        </Typography>
                      )}
                      {item.targetBasePath && (
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                          Target: {item.targetBasePath}
                        </Typography>
                      )}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    {!item.files?.length ? (
                      <EmptyState>No files attached for this item.</EmptyState>
                    ) : (
                      <Stack spacing={1}>
                        {item.files.map((file) => (
                          <Box key={file.path}>
                            <Typography variant="body2" sx={{ fontWeight: 950, mb: 0.45 }}>
                              {file.path}
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                m: 0,
                                p: 1,
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.common.black, 0.24),
                                color: "text.secondary",
                                fontSize: 12,
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {file.content}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Apply result" subtitle="Existing items are skipped. Partial states abort the write operation.">
          {!applyResult ? (
            <EmptyState>No scaffold package has been applied yet.</EmptyState>
          ) : (
            <Stack spacing={1}>
              <Alert severity="info" variant="outlined">
                After applying a new model scaffold, run Manifest Sync manually if you
                want it to appear in the admin model catalog. Generated models start as
                scaffold and are not public usable.
              </Alert>

              {(applyResult.items || []).map((item) => (
                <Paper
                  key={`${item.kind}-${item.key}`}
                  elevation={0}
                  sx={(currentTheme) => ({
                    ...getAdminIssueDetailCardSx(currentTheme),
                    p: 1,
                  })}
                >
                  <Stack spacing={0.7}>
                    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={item.kind} variant="outlined" />
                      <Chip
                        size="small"
                        label={item.status}
                        color={formatStatusSeverity(item.status)}
                      />
                      <Chip size="small" label={item.key} variant="outlined" />
                    </Stack>
                    {item.reason && (
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        {item.reason}
                      </Typography>
                    )}
                    {item.targetBasePath && (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        Target: {item.targetBasePath}
                      </Typography>
                    )}
                    {item.writtenFiles?.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 950, mb: 0.4 }}>
                          Written files
                        </Typography>
                        <Stack spacing={0.35}>
                          {item.writtenFiles.map((file) => (
                            <Typography key={file.path} variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                              {file.path}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {item.skippedFiles?.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 950, mb: 0.4 }}>
                          Skipped files
                        </Typography>
                        <Stack spacing={0.35}>
                          {item.skippedFiles.map((file) => (
                            <Typography key={file.path} variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                              {file.path}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </SectionCard>
      </Stack>

      <ConfirmationDialog
        open={applyDialogOpen}
        onClose={() => {
          if (!applyLoading) {
            setApplyDialogOpen(false);
          }
        }}
        title="Apply scaffold package?"
        subtitle="This will write missing scaffold files to the project. Existing items will be skipped. Partial states will abort. Continue?"
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
