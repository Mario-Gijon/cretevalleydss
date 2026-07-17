import { useEffect, useMemo, useState } from "react";

const MIN_SELECTIONS = 1;
const MAX_SELECTIONS = 3;

const uniqueKeys = (keys) => [...new Set((Array.isArray(keys) ? keys : []).filter(Boolean))];

export const useFinishedIssueResultsSelection = ({
  issueId,
  executionOptions,
  selectGlobalExecution,
}) => {
  const [selectedExecutionKeys, setSelectedExecutionKeys] = useState(["base"]);
  const optionsByKey = useMemo(
    () => new Map((executionOptions || []).map((option) => [option.key, option])),
    [executionOptions]
  );
  const fallbackKey = useMemo(
    () => executionOptions?.find((option) => option.selectable)?.key
      || optionsByKey.get("base")?.key
      || executionOptions?.[0]?.key
      || "base",
    [executionOptions, optionsByKey]
  );

  useEffect(() => {
    setSelectedExecutionKeys(["base"]);
  }, [issueId]);

  useEffect(() => {
    setSelectedExecutionKeys((current) => {
      const pruned = uniqueKeys(current)
        .filter((key) => optionsByKey.has(key))
        .filter((key) => key === "base" || optionsByKey.get(key)?.selectable)
        .slice(0, MAX_SELECTIONS);
      return pruned.length ? pruned : [fallbackKey];
    });
  }, [fallbackKey, optionsByKey]);

  useEffect(() => {
    if (selectedExecutionKeys[0]) selectGlobalExecution?.(selectedExecutionKeys[0]);
  }, [selectedExecutionKeys, selectGlobalExecution]);

  const setSelection = (nextKeys) => {
    const next = uniqueKeys(nextKeys)
      .filter((key) => optionsByKey.has(key))
      .filter((key) => key === "base" || optionsByKey.get(key)?.selectable)
      .slice(0, MAX_SELECTIONS);

    if (next.length < MIN_SELECTIONS) return;
    setSelectedExecutionKeys(next);
  };

  const addExecution = (key) => {
    if (!optionsByKey.get(key)?.selectable || selectedExecutionKeys.includes(key)) return;
    if (selectedExecutionKeys.length >= MAX_SELECTIONS) return;
    setSelection([...selectedExecutionKeys, key]);
  };

  const removeExecution = (key) => {
    if (!selectedExecutionKeys.includes(key) || selectedExecutionKeys.length <= MIN_SELECTIONS) return;
    setSelection(selectedExecutionKeys.filter((entry) => entry !== key));
  };

  const toggleExecution = (key) => {
    if (selectedExecutionKeys.includes(key)) removeExecution(key);
    else addExecution(key);
  };

  return {
    selectedExecutionKeys,
    selectedExecutionKeySet: new Set(selectedExecutionKeys),
    primaryExecutionKey: selectedExecutionKeys[0],
    minSelections: MIN_SELECTIONS,
    maxSelections: MAX_SELECTIONS,
    canAddMore: selectedExecutionKeys.length < MAX_SELECTIONS,
    setSelection,
    addExecution,
    removeExecution,
    toggleExecution,
  };
};

export default useFinishedIssueResultsSelection;
