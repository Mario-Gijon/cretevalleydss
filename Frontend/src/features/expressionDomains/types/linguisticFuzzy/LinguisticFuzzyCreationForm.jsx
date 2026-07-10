import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import { FuzzyPreviewChart } from "../../../../components/FuzzyPreviewChart/FuzzyPreviewChart";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import {
  buildAutomaticLinguisticLabels,
  DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
  getLinguisticMembershipDefinitionOrDefault,
  LINGUISTIC_MEMBERSHIP_FUNCTIONS,
  validateLinguisticLabelValues,
} from "../../../../utils/linguisticMembershipFunctions";
import { normalizeDraftName } from "../../expressionDomainFormFields";

const DEFAULT_LABEL_COUNT = 5;

const MEMBERSHIP_FUNCTION_OPTIONS = Object.values(LINGUISTIC_MEMBERSHIP_FUNCTIONS);

const normalizeDefinition = (value) =>
  value?.definition && typeof value.definition === "object" && !Array.isArray(value.definition)
    ? value.definition
    : {};

const parseLabelCount = (value) => {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const isValidLabelCount = (value) =>
  Number.isInteger(value) && value >= 3 && value % 2 === 1;

const resolveInitialLabelCount = (value) => {
  const definition = normalizeDefinition(value);
  const directCount = parseLabelCount(definition.labelCount);

  if (isValidLabelCount(directCount)) {
    return directCount;
  }

  const labelsLength = Array.isArray(definition.labels) ? definition.labels.length : null;
  if (isValidLabelCount(labelsLength)) {
    return labelsLength;
  }

  return DEFAULT_LABEL_COUNT;
};

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

const buildDraftLabelsFromExisting = ({
  labels = [],
  labelCount,
  membershipFunction,
  fallbackLabels = [],
}) => {
  const expectedValueCount =
    getLinguisticMembershipDefinitionOrDefault(membershipFunction).valueCount;

  return Array.from({ length: labelCount }, (_, index) => {
    const sourceLabel = labels[index];
    const fallbackLabel = fallbackLabels[index];
    const label = String(
      sourceLabel?.label ??
        fallbackLabel?.label ??
        `Label ${index + 1}`
    ).trim();

    return {
      key:
        sourceLabel?.key ||
        fallbackLabel?.key ||
        `linguistic_fuzzy_label_${index + 1}`,
      label: label || `Label ${index + 1}`,
      values: ensureValuesLength(
        sourceLabel?.values ?? fallbackLabel?.values,
        expectedValueCount
      ),
      index,
    };
  });
};

const buildAutomaticDraftLabels = ({
  labelCount,
  membershipFunction,
  previousLabels = [],
}) => {
  const generatedLabels = buildAutomaticLinguisticLabels({
    labelCount,
    membershipFunction,
    previousLabels,
  });

  return generatedLabels.map((labelItem, index) => ({
    key: previousLabels[index]?.key || `linguistic_fuzzy_label_${index + 1}`,
    label: String(labelItem?.label || "").trim() || `Label ${index + 1}`,
    values: Array.isArray(labelItem?.values) ? labelItem.values.map(Number) : [],
    index,
  }));
};

const normalizePayloadLabels = (labels = [], membershipFunction) => {
  const expectedValueCount =
    getLinguisticMembershipDefinitionOrDefault(membershipFunction).valueCount;

  return (Array.isArray(labels) ? labels : []).map((labelItem, index) => ({
    key:
      typeof labelItem?.key === "string" && labelItem.key.trim()
        ? labelItem.key.trim()
        : `linguistic_fuzzy_label_${index + 1}`,
    label: String(labelItem?.label || "").trim() || `Label ${index + 1}`,
    values: ensureValuesLength(labelItem?.values, expectedValueCount).map(Number),
    index,
  }));
};

const labelsUseManualValues = ({
  labels,
  labelCount,
  membershipFunction,
}) => {
  const normalizedLabels = normalizePayloadLabels(labels, membershipFunction);
  const automaticLabels = buildAutomaticDraftLabels({
    labelCount,
    membershipFunction,
    previousLabels: normalizedLabels,
  });

  return normalizedLabels.some((labelItem, index) => {
    const automaticValues = automaticLabels[index]?.values || [];
    return JSON.stringify(labelItem.values) !== JSON.stringify(automaticValues);
  });
};

const buildDraftPayload = ({
  value,
  name,
  membershipFunction,
  labelCount,
  labels,
}) => {
  const definition = normalizeDefinition(value);

  return {
    ...value,
    name: normalizeDraftName(name),
    typeKey: "linguisticFuzzy",
    definition: {
      ...definition,
      membershipFunction,
      labelCount,
      labels: normalizePayloadLabels(labels, membershipFunction),
    },
  };
};

const buildStateFromValue = (value) => {
  const definition = normalizeDefinition(value);
  const membershipFunction =
    String(definition.membershipFunction || "").trim() ||
    DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION;
  const labelCount = resolveInitialLabelCount(value);
  const existingLabels = Array.isArray(definition.labels) ? definition.labels : [];
  const hasExistingLabels = existingLabels.length > 0;
  const incomingLabels = buildDraftLabelsFromExisting({
    labels: existingLabels,
    labelCount,
    membershipFunction,
  });
  const manualMode = hasExistingLabels
    ? labelsUseManualValues({
        labels: incomingLabels,
        labelCount,
        membershipFunction,
      })
    : false;

  return {
    name: normalizeDraftName(value?.name),
    labelCountInput: String(labelCount),
    membershipFunction,
    manualMode,
    labels: manualMode
      ? incomingLabels
      : buildAutomaticDraftLabels({
          labelCount,
          membershipFunction,
          previousLabels: incomingLabels,
        }),
  };
};

const buildComparablePayloadSignature = (value) =>
  JSON.stringify({
    name: normalizeDraftName(value?.name),
    typeKey: String(value?.typeKey || "").trim(),
    definition: {
      ...normalizeDefinition(value),
      labels: normalizePayloadLabels(
        normalizeDefinition(value).labels,
        normalizeDefinition(value).membershipFunction ||
          DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION
      ),
    },
  });

export const LinguisticFuzzyCreationForm = ({
  value,
  onChange,
  disabled = false,
}) => {
  const initialState = useMemo(() => buildStateFromValue(value), [value]);
  const [name, setName] = useState(initialState.name);
  const [labelCountInput, setLabelCountInput] = useState(initialState.labelCountInput);
  const [membershipFunction, setMembershipFunction] = useState(
    initialState.membershipFunction
  );
  const [manualMode, setManualMode] = useState(initialState.manualMode);
  const [labels, setLabels] = useState(initialState.labels);
  const [confirmManualModeOpen, setConfirmManualModeOpen] = useState(false);
  const lastEmittedSignatureRef = useRef("");

  useEffect(() => {
    const incomingSignature = buildComparablePayloadSignature(value);

    if (incomingSignature === lastEmittedSignatureRef.current) {
      return;
    }

    const nextState = buildStateFromValue(value);
    setName(nextState.name);
    setLabelCountInput(nextState.labelCountInput);
    setMembershipFunction(nextState.membershipFunction);
    setManualMode(nextState.manualMode);
    setLabels(nextState.labels);
  }, [value]);

  const parsedLabelCount = parseLabelCount(labelCountInput);
  const hasInvalidLabelCount = !isValidLabelCount(parsedLabelCount);
  const effectiveLabelCount = isValidLabelCount(parsedLabelCount)
    ? parsedLabelCount
    : labels.length || DEFAULT_LABEL_COUNT;
  const membershipDefinition = useMemo(
    () => getLinguisticMembershipDefinitionOrDefault(membershipFunction),
    [membershipFunction]
  );

  const normalizedLabels = useMemo(
    () => normalizePayloadLabels(labels, membershipFunction),
    [labels, membershipFunction]
  );

  const emittedDraft = useMemo(
    () =>
      buildDraftPayload({
        value,
        name,
        membershipFunction,
        labelCount: effectiveLabelCount,
        labels: normalizedLabels,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveLabelCount, labels, membershipFunction, name, normalizedLabels, value]
  );

  useEffect(() => {
    const nextSignature = buildComparablePayloadSignature(emittedDraft);

    if (nextSignature === lastEmittedSignatureRef.current) {
      return;
    }

    lastEmittedSignatureRef.current = nextSignature;
    onChange?.(emittedDraft);
  }, [emittedDraft, onChange]);

  const regenerateAutomaticLabels = ({
    nextLabelCount = effectiveLabelCount,
    nextMembershipFunction = membershipFunction,
    previousLabels = labels,
  } = {}) => {
    setLabels(
      buildAutomaticDraftLabels({
        labelCount: nextLabelCount,
        membershipFunction: nextMembershipFunction,
        previousLabels,
      })
    );
  };

  const handleLabelCountChange = (event) => {
    const nextInput = event.target.value;
    const nextParsed = parseLabelCount(nextInput);

    setLabelCountInput(nextInput);

    if (!isValidLabelCount(nextParsed)) {
      return;
    }

    if (!manualMode) {
      regenerateAutomaticLabels({
        nextLabelCount: nextParsed,
      });
      return;
    }

    setLabels((previous) =>
      buildDraftLabelsFromExisting({
        labels: previous,
        labelCount: nextParsed,
        membershipFunction,
        fallbackLabels: previous,
      })
    );
  };

  const handleMembershipFunctionChange = (event) => {
    const nextMembershipFunction = event.target.value;
    setMembershipFunction(nextMembershipFunction);

    if (!manualMode) {
      regenerateAutomaticLabels({
        nextLabelCount: effectiveLabelCount,
        nextMembershipFunction,
      });
      return;
    }

    setLabels((previous) =>
      buildDraftLabelsFromExisting({
        labels: previous,
        labelCount: effectiveLabelCount,
        membershipFunction: nextMembershipFunction,
        fallbackLabels: previous,
      })
    );
  };

  const handleLabelChange = (labelIndex, nextLabel) => {
    setLabels((previous) =>
      previous.map((labelItem, index) =>
        index === labelIndex
          ? { ...labelItem, label: nextLabel }
          : labelItem
      )
    );
  };

  const handleManualValueChange = (labelIndex, valueIndex, inputValue) => {
    const parsed = Number(inputValue);

    setLabels((previous) =>
      previous.map((labelItem, index) => {
        if (index !== labelIndex) {
          return labelItem;
        }

        const nextValues = Array.isArray(labelItem.values)
          ? [...labelItem.values]
          : Array.from({ length: membershipDefinition.valueCount }, () => 0);

        nextValues[valueIndex] = Number.isFinite(parsed) ? parsed : inputValue;

        return {
          ...labelItem,
          values: nextValues,
        };
      })
    );
  };

  const handleManualModeToggle = (checked) => {
    if (checked) {
      setConfirmManualModeOpen(true);
      return;
    }

    setManualMode(false);
    regenerateAutomaticLabels();
  };

  const handleConfirmEnableManualMode = () => {
    setConfirmManualModeOpen(false);
    setManualMode(true);
    setLabels((previous) =>
      buildDraftLabelsFromExisting({
        labels: previous,
        labelCount: effectiveLabelCount,
        membershipFunction,
        fallbackLabels: previous,
      })
    );
  };

  const previewLabels = normalizedLabels.map((labelItem) => ({
    label: labelItem.label,
    values: labelItem.values,
  }));

  return (
    <>
      <Stack spacing={2.2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <TextField
            label="Name"
            color="info"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={disabled}
            fullWidth
          />

          <TextField
            label="NºLabels"
            color="info"
            type="number"
            value={labelCountInput}
            onChange={handleLabelCountChange}
            inputProps={{ min: 3, step: 2 }}
            error={hasInvalidLabelCount}
            helperText={hasInvalidLabelCount ? "Must be odd and ≥ 3" : ""}
            disabled={disabled}
            sx={{ width: { xs: "100%", sm: 130 } }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <TextField
            select
            label="Membership function"
            color="info"
            value={membershipFunction}
            onChange={handleMembershipFunctionChange}
            disabled={disabled}
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
          >
            {MEMBERSHIP_FUNCTION_OPTIONS.map((option) => (
              <MenuItem key={option.key} value={option.key}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={(
              <Switch
                color="info"
                checked={manualMode}
                onChange={(event) => handleManualModeToggle(event.target.checked)}
                disabled={disabled || hasInvalidLabelCount}
              />
            )}
            label="Edit membership values manually"
          />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          {labels.map((labelItem, labelIndex) => {
            const labelValuesAreValid = validateLinguisticLabelValues(
              labelItem.values,
              membershipDefinition.valueCount
            );

            return (
              <Stack key={labelIndex} spacing={0.9}>
                <TextField
                  label={`L${labelIndex + 1}`}
                  color="info"
                  value={labelItem.label}
                  onChange={(event) =>
                    handleLabelChange(labelIndex, event.target.value)
                  }
                  disabled={disabled}
                  size="small"
                />

                {manualMode ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8}>
                    {Array.from(
                      { length: membershipDefinition.valueCount },
                      (_, valueIndex) => (
                        <TextField
                          key={`${labelIndex}-${valueIndex}`}
                          color="info"
                          type="number"
                          size="small"
                          label={`v${valueIndex + 1}`}
                          inputProps={{ min: 0, max: 1, step: 0.01 }}
                          value={labelItem?.values?.[valueIndex] ?? ""}
                          onChange={(event) =>
                            handleManualValueChange(
                              labelIndex,
                              valueIndex,
                              event.target.value
                            )
                          }
                          disabled={disabled}
                          error={!labelValuesAreValid}
                          helperText={
                            !labelValuesAreValid && valueIndex === 0
                              ? "Values must be non-decreasing numbers between 0 and 1."
                              : ""
                          }
                        />
                      )
                    )}
                  </Stack>
                ) : null}
              </Stack>
            );
          })}
        </Stack>

        <Divider sx={{ my: 0.6 }} />

        <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
          Preview
        </Typography>
        <Box
          sx={{
            borderRadius: 2.5,
            maxWidth: 520,
            mx: "auto",
            px: { xs: 0.25, sm: 0.5 },
            py: 0.35,
            width: "100%",
          }}
        >
          <FuzzyPreviewChart
            labels={previewLabels}
            membershipFunction={membershipFunction}
          />
        </Box>
      </Stack>

      <ConfirmationDialog
        open={confirmManualModeOpen}
        onClose={() => setConfirmManualModeOpen(false)}
        tone="warning"
        title="Enable manual values?"
        subtitle="Editing membership values is an advanced option. Incorrect values may make this domain incompatible with some models or produce invalid fuzzy computations. If you are not sure, keep the automatically generated values."
        actions={[
          {
            id: "cancel-enable-manual-fuzzy-values",
            label: "Keep automatic",
            color: "secondary",
            onClick: () => setConfirmManualModeOpen(false),
          },
          {
            id: "confirm-enable-manual-fuzzy-values",
            label: "Enable manual",
            color: "warning",
            autoFocus: true,
            onClick: handleConfirmEnableManualMode,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </>
  );
};

export default LinguisticFuzzyCreationForm;
