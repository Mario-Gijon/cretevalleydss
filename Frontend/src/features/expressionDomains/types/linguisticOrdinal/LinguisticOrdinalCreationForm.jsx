import { AddOutlined, DeleteOutline } from "@mui/icons-material";
import {
  Box,
  Button,
  Collapse,
  IconButton,
  List,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import {
  buildUniqueLabelKey,
  normalizeDraftName,
} from "../../expressionDomainFormFields";

const DEFAULT_ORDINAL_LABELS = Object.freeze([
  { label: "Low" },
  { label: "Medium" },
  { label: "High" },
]);

const buildDraftLabels = (labels = []) => {
  const usedKeys = new Set();

  return (Array.isArray(labels) ? labels : []).map((labelItem, index) => {
    const hasExplicitLabel = typeof labelItem?.label === "string";
    const rawLabel = hasExplicitLabel
      ? labelItem.label
      : String(labelItem?.label || "");
    const label = rawLabel.trim();
    const fallbackLabel = labelItem == null ? `Label ${index + 1}` : "";
    const preservedKey =
      typeof labelItem?.key === "string" && labelItem.key.trim()
        ? labelItem.key.trim()
        : null;
    if (preservedKey) {
      usedKeys.add(preservedKey);
    }

    return {
      key:
        preservedKey ||
        buildUniqueLabelKey({
          label,
          index,
          usedKeys,
        }),
      label: hasExplicitLabel ? rawLabel : label || fallbackLabel,
      index,
    };
  });
};

const ensureDraftLabels = (value) => {
  const rawLabels = value?.definition?.labels;
  const draftLabels = buildDraftLabels(rawLabels);

  return draftLabels.length > 0
    ? draftLabels
    : buildDraftLabels(DEFAULT_ORDINAL_LABELS);
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

const formatOrdinalPosition = (position) => {
  const mod100 = position % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${position}th`;
  }

  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
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
        size="small"
        value={normalizeDraftName(value?.name)}
        onChange={(event) => updateLabels(labels, event.target.value)}
        disabled={disabled}
        fullWidth
      />

      <TransitionGroup component={List} disablePadding>
        {labels.map((labelItem, index) => (
          <Collapse key={labelItem.key} component="li" sx={{ listStyle: "none" }}>
            <Stack
              spacing={0.75}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ py: 0.5 }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 800,
                  minWidth: { sm: 78 },
                  flexShrink: 0,
                }}
              >
                {formatOrdinalPosition(index + 1)} label
              </Typography>

              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    label="Label"
                    color="info"
                    size="small"
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
                </Box>

                <IconButton
                  onClick={() =>
                    updateLabels(labels.filter((_, itemIndex) => itemIndex !== index))
                  }
                  disabled={disabled || labels.length <= 2}
                  color="error"
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Collapse>
        ))}
      </TransitionGroup>

      <Button
        variant="outlined"
        color="info"
        startIcon={<AddOutlined />}
        onClick={() =>
          updateLabels([...labels, { label: `Label ${labels.length + 1}` }])
        }
        disabled={disabled}
        size="small"
        sx={{ alignSelf: "flex-start" }}
      >
        Add label
      </Button>
    </Stack>
  );
};

export default LinguisticOrdinalCreationForm;
