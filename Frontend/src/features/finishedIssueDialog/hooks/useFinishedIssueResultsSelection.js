import { useEffect, useMemo, useState } from "react";

const MAX_SELECTIONS = 3;

const uniqueKeys = (keys) => [...new Set((Array.isArray(keys) ? keys : []).filter(Boolean))];
const sameKeys = (left, right) => left.length === right.length && left.every((key, index) => key === right[index]);

export const useFinishedIssueResultsSelection = ({
  issueId,
  executionOptions,
}) => {
  const [selectedExecutionKeys, setSelectedExecutionKeys] = useState(["base"]);
  const optionsByKey = useMemo(
    () => new Map((executionOptions || []).map((option) => [option.key, option])),
    [executionOptions]
  );
  const fallbackKey = useMemo(
    () => executionOptions?.find((option) => option.selectable)?.key
      || null,
    [executionOptions]
  );
  const minimumSelections = executionOptions?.some((option) => option.selectable) ? 1 : 0;

  useEffect(() => {
    setSelectedExecutionKeys(["base"]);
  }, [issueId]);

  useEffect(() => {
    setSelectedExecutionKeys((current) => {
      const pruned = uniqueKeys(current)
        .filter((key) => optionsByKey.get(key)?.selectable)
        .slice(0, MAX_SELECTIONS);
      const next = pruned.length ? pruned : fallbackKey ? [fallbackKey] : [];
      return sameKeys(current, next) ? current : next;
    });
  }, [fallbackKey, minimumSelections, optionsByKey]);

  const normalizeSelection = (keys) => uniqueKeys(keys)
      .filter((key) => optionsByKey.get(key)?.selectable)
      .slice(0, MAX_SELECTIONS);

  const setSelection = (nextKeys) => {
    setSelectedExecutionKeys((current) => {
      const proposed = typeof nextKeys === "function" ? nextKeys(current) : nextKeys;
      const next = normalizeSelection(proposed);
      return next.length >= minimumSelections && !sameKeys(current, next) ? next : current;
    });
  };

  const addExecution = (key) => {
    setSelection((current) => {
      if (!optionsByKey.get(key)?.selectable || current.includes(key) || current.length >= MAX_SELECTIONS) return current;
      return [...current, key];
    });
  };

  const removeExecution = (key) => {
    setSelection((current) => {
      if (!current.includes(key) || current.length <= minimumSelections) return current;
      return current.filter((entry) => entry !== key);
    });
  };

  const toggleExecution = (key) => {
    setSelection((current) => {
      if (current.includes(key)) return current.length > minimumSelections ? current.filter((entry) => entry !== key) : current;
      if (!optionsByKey.get(key)?.selectable || current.length >= MAX_SELECTIONS) return current;
      return [...current, key];
    });
  };

  return {
    selectedExecutionKeys,
    selectedExecutionKeySet: new Set(selectedExecutionKeys),
    primaryExecutionKey: selectedExecutionKeys[0],
    minSelections: minimumSelections,
    maxSelections: MAX_SELECTIONS,
    canAddMore: selectedExecutionKeys.length < MAX_SELECTIONS && (executionOptions || []).some((option) => option.selectable && !selectedExecutionKeys.includes(option.key)),
    setSelection,
    addExecution,
    removeExecution,
    toggleExecution,
  };
};

export default useFinishedIssueResultsSelection;
