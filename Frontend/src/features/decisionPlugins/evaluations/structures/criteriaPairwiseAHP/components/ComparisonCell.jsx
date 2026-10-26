import { useLayoutEffect, useRef, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";

import {
  formatNormalizedPreference,
  normalizedPreferenceToSaatyValue,
} from "../operations/saatyPreference";
import { judgmentCellSx } from "../styles/CriteriaPairwiseAHPView.styles";

const ComparisonCell = ({
  rowCriterion,
  columnCriterion,
  value,
  diagonal,
  editable,
  permitEdit,
  onChange,
}) => {
  const [draftValue, setDraftValue] = useState(() => formatNormalizedPreference(value));
  const [invalidDraft, setInvalidDraft] = useState(false);
  const previousValueRef = useRef(value);
  const pendingLocalValueRef = useRef(null);

  useLayoutEffect(() => {
    if (Object.is(previousValueRef.current, value)) return;
    previousValueRef.current = value;

    if (pendingLocalValueRef.current?.value === value) {
      pendingLocalValueRef.current = null;
      return;
    }

    pendingLocalValueRef.current = null;
    setDraftValue(formatNormalizedPreference(value));
    setInvalidDraft(false);
  }, [value]);

  if (diagonal) {
    return (
      <Box sx={judgmentCellSx.fixed} aria-label="Neutral self-comparison">
        Neutral
      </Box>
    );
  }

  if (editable && permitEdit) {
    const inputId = `ahp-${rowCriterion.id}-${columnCriterion.id}`;
    const accessibleLabel = `Compare ${rowCriterion.name} with ${columnCriterion.name}`;
    const updateDraft = (nextDraft) => {
      setDraftValue(nextDraft);
      if (nextDraft === "") {
        setInvalidDraft(false);
        pendingLocalValueRef.current = { value: "" };
        onChange(null);
        return;
      }

      const nextSaatyValue = normalizedPreferenceToSaatyValue(nextDraft);
      if (nextSaatyValue === null) {
        setInvalidDraft(true);
        pendingLocalValueRef.current = { value: "" };
        onChange(null);
        return;
      }

      setInvalidDraft(false);
      pendingLocalValueRef.current = { value: nextSaatyValue };
      onChange(nextSaatyValue);
    };

    return (
      <TextField
        id={inputId}
        value={draftValue}
        type="text"
        size="small"
        fullWidth
        color="secondary"
        error={invalidDraft}
        title={invalidDraft ? "Enter a supported normalized value from 0.1 to 0.9." : undefined}
        onChange={(event) => updateDraft(event.target.value)}
        inputProps={{
          inputMode: "decimal",
          "aria-label": accessibleLabel,
          "aria-invalid": invalidDraft,
        }}
        sx={judgmentCellSx.control}
      />
    );
  }

  const normalizedValue = formatNormalizedPreference(value);
  const isDerived = !editable;
  return (
    <Box
      sx={isDerived ? judgmentCellSx.derived : judgmentCellSx.readOnly}
      title={isDerived && normalizedValue ? "Reciprocal comparison" : undefined}
      aria-label={
        isDerived
          ? `Reciprocal comparison ${normalizedValue || "not entered"}`
          : `Comparison ${normalizedValue || "not entered"}`
      }
    >
      <Typography variant="body2" sx={judgmentCellSx.value}>
        {normalizedValue || "—"}
      </Typography>
    </Box>
  );
};

export default ComparisonCell;
