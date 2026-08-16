import { useCallback, useRef, useState } from "react";

import { reloadFinishedIssueResultsAnalysis } from "../../../services/issue.service.js";

export const useFinishedIssueResultsReload = ({ issueId, refreshPayload, showSnackbarAlert }) => {
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);
  const reload = useCallback(async (executionKeys) => {
    if (inFlightRef.current || !issueId || !Array.isArray(executionKeys) || !executionKeys.length) return false;
    try {
      inFlightRef.current = true;
      setLoading(true);
      const response = await reloadFinishedIssueResultsAnalysis(issueId, executionKeys);
      if (!response?.success) {
        showSnackbarAlert(response?.message || "Could not reload Results Analysis.", "error");
        return false;
      }
      await refreshPayload();
      showSnackbarAlert("Results Analysis reloaded.", "success");
      return true;
    } catch {
      showSnackbarAlert("Could not reload Results Analysis.", "error");
      return false;
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [issueId, refreshPayload, showSnackbarAlert]);
  return { loading, reload };
};

export default useFinishedIssueResultsReload;
