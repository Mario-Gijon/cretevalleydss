import { AddOutlined, DeleteOutline } from "@mui/icons-material";
import { Button, IconButton, Stack, TextField } from "@mui/material";
import {
  buildUniqueLabelKey,
  normalizeDraftName,
} from "../../helpers";

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
      index,
    };
  });
};

const ensureDraftLabels = (value) => {
  const rawLabels = value?.definition?.labels;
  const draftLabels = buildDraftLabels(rawLabels);

  return draftLabels.length > 0
    ? draftLabels
    : buildDraftLabels([{ label: "Low" }, { label: "High" }]);
};

const buildNextValue = (value, labels, name = value?.name) => {
  const definition = value?.definition && typeof value.definition === "object"
    ? value.definition
    : {};

  return {
    ...value,
    name: normalizeDraftName(name),
    typeKey: "linguisticOrdinal",
    definition: {
      ...definition,
      labels: buildDraftLabels(labels),
    },
  };
};

export const LinguisticOrdinalCreationForm = ({
  value,
  onChange,
  disabled = false,
}) => {
  const labels = ensureDraftLabels(value);

  const updateLabels = (nextLabels, nextName = value?.name) => {
    onChange?.(buildNextValue(value, nextLabels, nextName));
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Name"
        color="info"
        value={normalizeDraftName(value?.name)}
        onChange={(event) => updateLabels(labels, event.target.value)}
        disabled={disabled}
        fullWidth
      />

      {labels.map((labelItem, index) => (
        <Stack key={`${labelItem.key}-${index}`} direction="row" spacing={1}>
          <TextField
            label={`Label ${index + 1}`}
            color="info"
            value={labelItem.label}
            onChange={(event) => {
              const nextLabels = labels.map((item, itemIndex) =>
                itemIndex === index
                  ? { ...item, label: event.target.value }
                  : item
              );
              updateLabels(nextLabels);
            }}
            disabled={disabled}
            fullWidth
          />

          <IconButton
            onClick={() => updateLabels(labels.filter((_, itemIndex) => itemIndex !== index))}
            disabled={disabled || labels.length <= 2}
            color="error"
          >
            <DeleteOutline />
          </IconButton>
        </Stack>
      ))}

      <Button
        variant="outlined"
        color="info"
        startIcon={<AddOutlined />}
        onClick={() =>
          updateLabels([...labels, { label: `Label ${labels.length + 1}` }])
        }
        disabled={disabled}
      >
        Add label
      </Button>
    </Stack>
  );
};

export default LinguisticOrdinalCreationForm;
