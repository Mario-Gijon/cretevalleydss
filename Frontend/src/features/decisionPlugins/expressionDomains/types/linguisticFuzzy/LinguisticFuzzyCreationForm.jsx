import { AddOutlined, DeleteOutline } from "@mui/icons-material";
import {
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import {
  DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
  LINGUISTIC_MEMBERSHIP_FUNCTIONS,
  getLinguisticMembershipDefinitionOrDefault,
} from "../../../../../utils/linguisticMembershipFunctions";
import {
  buildUniqueLabelKey,
  normalizeDraftName,
} from "../../helpers";

const MEMBERSHIP_FUNCTION_OPTIONS = Object.values(LINGUISTIC_MEMBERSHIP_FUNCTIONS);

const parseCommaSeparatedValues = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .map((item) => Number(item));

const formatValues = (values = []) =>
  (Array.isArray(values) ? values : []).join(", ");

const buildDraftLabels = (labels = []) => {
  const usedKeys = new Set();

  return (Array.isArray(labels) ? labels : []).map((labelItem, index) => {
    const label = String(labelItem?.label || "").trim();

    return {
      key: buildUniqueLabelKey({
        label,
        index,
        usedKeys,
      }),
      label: label || `Label ${index + 1}`,
      values: Array.isArray(labelItem?.values) ? labelItem.values : [],
      index,
    };
  });
};

const ensureValueCount = (values = [], count) => {
  const normalized = (Array.isArray(values) ? values : []).slice(0, count);

  while (normalized.length < count) {
    normalized.push(0);
  }

  return normalized;
};

const ensureDraftLabels = (value) => {
  const membershipFunction =
    value?.definition?.membershipFunction ||
    DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION;
  const expectedCount =
    getLinguisticMembershipDefinitionOrDefault(membershipFunction).valueCount;
  const rawLabels = value?.definition?.labels;
  const labels = buildDraftLabels(rawLabels).map((labelItem) => ({
    ...labelItem,
    values: ensureValueCount(labelItem.values, expectedCount),
  }));

  return labels.length > 0
    ? labels
    : [
        {
          key: "low",
          label: "Low",
          values: ensureValueCount([], expectedCount),
          index: 0,
        },
        {
          key: "high",
          label: "High",
          values: ensureValueCount([], expectedCount),
          index: 1,
        },
      ];
};

const buildNextValue = ({
  value,
  labels,
  name = value?.name,
  membershipFunction = value?.definition?.membershipFunction,
}) => ({
  ...value,
  name: normalizeDraftName(name),
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction:
      membershipFunction || DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
    labels: buildDraftLabels(labels).map((labelItem) => ({
      ...labelItem,
      values: Array.isArray(labelItem.values) ? labelItem.values : [],
    })),
  },
});

export const LinguisticFuzzyCreationForm = ({
  value,
  onChange,
  disabled = false,
}) => {
  const membershipFunction =
    value?.definition?.membershipFunction ||
    DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION;
  const expectedValueCount =
    getLinguisticMembershipDefinitionOrDefault(membershipFunction).valueCount;
  const labels = ensureDraftLabels(value);

  const updateValue = (next) => {
    onChange?.(buildNextValue(next));
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Name"
        value={normalizeDraftName(value?.name)}
        onChange={(event) =>
          updateValue({
            value,
            labels,
            name: event.target.value,
            membershipFunction,
          })}
        disabled={disabled}
        fullWidth
      />

      <TextField
        select
        label="Membership function"
        value={membershipFunction}
        onChange={(event) => {
          const nextMembershipFunction = event.target.value;
          const nextValueCount =
            getLinguisticMembershipDefinitionOrDefault(
              nextMembershipFunction
            ).valueCount;
          const nextLabels = labels.map((labelItem) => ({
            ...labelItem,
            values: ensureValueCount(labelItem.values, nextValueCount),
          }));

          updateValue({
            value,
            labels: nextLabels,
            membershipFunction: nextMembershipFunction,
          });
        }}
        disabled={disabled}
        fullWidth
      >
        {MEMBERSHIP_FUNCTION_OPTIONS.map((option) => (
          <MenuItem key={option.key} value={option.key}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {labels.map((labelItem, index) => (
        <Stack key={`${labelItem.key}-${index}`} direction="row" spacing={1}>
          <TextField
            label={`Label ${index + 1}`}
            value={labelItem.label}
            onChange={(event) => {
              const nextLabels = labels.map((item, itemIndex) =>
                itemIndex === index
                  ? { ...item, label: event.target.value }
                  : item
              );

              updateValue({
                value,
                labels: nextLabels,
                membershipFunction,
              });
            }}
            disabled={disabled}
            fullWidth
          />

          <TextField
            label={`Values (${expectedValueCount})`}
            value={formatValues(labelItem.values)}
            onChange={(event) => {
              const nextLabels = labels.map((item, itemIndex) =>
                itemIndex === index
                  ? {
                      ...item,
                      values: ensureValueCount(
                        parseCommaSeparatedValues(event.target.value),
                        expectedValueCount
                      ),
                    }
                  : item
              );

              updateValue({
                value,
                labels: nextLabels,
                membershipFunction,
              });
            }}
            disabled={disabled}
            fullWidth
          />

          <IconButton
            onClick={() =>
              updateValue({
                value,
                labels: labels.filter((_, itemIndex) => itemIndex !== index),
                membershipFunction,
              })}
            disabled={disabled || labels.length <= 1}
            color="error"
          >
            <DeleteOutline />
          </IconButton>
        </Stack>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddOutlined />}
        onClick={() =>
          updateValue({
            value,
            labels: [
              ...labels,
              {
                label: `Label ${labels.length + 1}`,
                values: ensureValueCount([], expectedValueCount),
              },
            ],
            membershipFunction,
          })}
        disabled={disabled}
      >
        Add label
      </Button>
    </Stack>
  );
};

export default LinguisticFuzzyCreationForm;

