import { useCallback, useEffect, useRef, useState } from "react";

import { getFinishedIssueInfo } from "../../../services/issue.service";

const unwrap = (response) =>
  response && typeof response === "object" && "data" in response ? response.data : response;

const getIssueId = (issue) => issue?.id || issue?._id || null;

export const useFinishedIssueData = ({ selectedIssue, open }) => {
  const issueId = getIssueId(selectedIssue);
  const tokenRef = useRef(0);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshPayload = useCallback(async () => {
    if (!issueId) return null;
    const token = ++tokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = unwrap(await getFinishedIssueInfo(issueId));
      const nextPayload = response?.payload || response?.issueInfo || response || null;
      if (token !== tokenRef.current) return null;
      setPayload(nextPayload);
      return nextPayload;
    } catch (caught) {
      if (token === tokenRef.current) {
        setPayload(null);
        setError(caught);
      }
      return null;
    } finally {
      if (token === tokenRef.current) setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (!open || !issueId) {
      tokenRef.current += 1;
      setPayload(null);
      setLoading(false);
      setError(null);
      return undefined;
    }
    refreshPayload();
    return () => { tokenRef.current += 1; };
  }, [issueId, open, refreshPayload]);

  return { issueId, payload, loading, error, refreshPayload };
};

export default useFinishedIssueData;
