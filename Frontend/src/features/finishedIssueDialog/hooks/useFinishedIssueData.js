import { useCallback, useEffect, useRef, useState } from "react";

import { getFinishedIssueInfo } from "../../../services/issue.service";
import { validateFinishedIssuePayload } from "../logic/validateFinishedIssuePayload.js";

const TOPSIS_SORT_API_MODEL_KEY = "topsis_sort_2016";
const COLLECTIVE_ANALYSIS_RECHECK_DELAY_MS = 1600;
const COLLECTIVE_ANALYSIS_PREPARATION_WINDOW_MS = 60_000;

const unwrap = (response) =>
  response && typeof response === "object" && "data" in response ? response.data : response;

const getIssueId = (issue) => issue?.id || issue?._id || null;

const hasCollectiveMatrix = (payload) => {
  const collective = payload?.evaluations?.collective?.find(
    (entry) => entry?.stage === "alternativeEvaluation",
  );
  const matrix = collective?.displayPayload ?? collective?.rawPayload;
  return matrix && typeof matrix === "object" && !Array.isArray(matrix) && Object.keys(matrix).length > 0;
};

const hasPersistedBaseAnalysis = (payload) =>
  payload?.resultsAnalysis?.executions?.some(
    (entry) => entry?.executionKey === "base" && entry?.executionType === "base",
  ) === true;

// Finished Issues expose finishedAt, but not an explicit analysis-pending flag.
// Treat missing analysis as preparation only for a bounded period after finishing.
const isRecentlyFinished = (payload) => {
  const finishedAt = Date.parse(payload?.lifecycle?.finishedAt || "");
  return Number.isFinite(finishedAt) && Date.now() - finishedAt < COLLECTIVE_ANALYSIS_PREPARATION_WINDOW_MS;
};

const resolveCollectiveResolutionStatus = (payload) => {
  if (payload?.models?.base?.technical?.apiModelKey !== TOPSIS_SORT_API_MODEL_KEY) return "not-applicable";
  if (hasCollectiveMatrix(payload)) return "available";
  if (hasPersistedBaseAnalysis(payload)) return "unavailable";
  return isRecentlyFinished(payload) ? "pending" : "unavailable";
};

const hasTopsisSortCollectivePending = (payload) =>
  payload?.models?.base?.technical?.apiModelKey === TOPSIS_SORT_API_MODEL_KEY &&
  payload?.lifecycle?.active === false &&
  payload?.lifecycle?.currentStage === "finished" &&
  !hasCollectiveMatrix(payload) &&
  !hasPersistedBaseAnalysis(payload) &&
  isRecentlyFinished(payload);

export const useFinishedIssueData = ({ selectedIssue, open }) => {
  const issueId = getIssueId(selectedIssue);
  const tokenRef = useRef(0);
  const collectiveRecheckTimerRef = useRef(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collectiveResolutionStatus, setCollectiveResolutionStatus] = useState("idle");

  const refreshPayload = useCallback(async () => {
    if (!issueId) return null;
    if (collectiveRecheckTimerRef.current !== null) {
      clearTimeout(collectiveRecheckTimerRef.current);
      collectiveRecheckTimerRef.current = null;
    }
    const token = ++tokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = unwrap(await getFinishedIssueInfo(issueId));
      const nextPayload = response || null;
      if (token !== tokenRef.current) return null;
      const validation = validateFinishedIssuePayload(nextPayload);
      if (!validation.valid) {
        setPayload(null);
        setError(new Error(validation.error));
        setCollectiveResolutionStatus("error");
        return null;
      }
      setPayload(nextPayload);
      setCollectiveResolutionStatus(resolveCollectiveResolutionStatus(nextPayload));
      return nextPayload;
    } catch (caught) {
      if (token === tokenRef.current) {
        setPayload(null);
        setError(caught);
        setCollectiveResolutionStatus("error");
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
      setCollectiveResolutionStatus("idle");
      return undefined;
    }
    let active = true;
    const loadAndRecheckIfPending = async () => {
      const initialPayload = await refreshPayload();
      if (!active || !hasTopsisSortCollectivePending(initialPayload)) return;

      collectiveRecheckTimerRef.current = setTimeout(async () => {
        collectiveRecheckTimerRef.current = null;
        if (!active) return;
        await refreshPayload();
      }, COLLECTIVE_ANALYSIS_RECHECK_DELAY_MS);
    };
    loadAndRecheckIfPending();
    return () => {
      active = false;
      if (collectiveRecheckTimerRef.current !== null) {
        clearTimeout(collectiveRecheckTimerRef.current);
        collectiveRecheckTimerRef.current = null;
      }
      tokenRef.current += 1;
    };
  }, [issueId, open, refreshPayload]);

  return { issueId, payload, loading, error, refreshPayload, collectiveResolutionStatus };
};

export default useFinishedIssueData;
