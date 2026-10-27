import { useCallback, useEffect, useRef, useState } from "react";

import { diagnoseCreatorAHPConsistency } from "../../../../../../services/issue.service.js";
import { diagnoseExpertAHPConsistency } from "../../../../../issueEvaluation/services/issueEvaluation.service.js";
import { expectedComparisonCount, validateEvaluation } from "../operations/validateEvaluation.js";

export const AHP_DIAGNOSTIC_TIMEOUT_MS = 15000;

const CHECK_UNAVAILABLE_MESSAGE = "Consistency check unavailable. Please try again.";

const sameCriteria = (actual, expected) =>
  Array.isArray(actual) &&
  actual.length === expected.length &&
  actual.every(
    (criterion, index) =>
      criterion?.id === expected[index]?.id &&
      criterion?.name === expected[index]?.name,
  );

export const validateAHPDiagnosticResponse = (data, criteria) => {
  const finiteOrNull = (value) =>
    value === null || (typeof value === "number" && Number.isFinite(value));
  const valid =
    data &&
    typeof data === "object" &&
    finiteOrNull(data.consistencyRatio) &&
    finiteOrNull(data.consistencyIndex) &&
    typeof data.lambdaMax === "number" && Number.isFinite(data.lambdaMax) &&
    typeof data.consistencyStatus === "string" &&
    typeof data.consistencyThreshold === "number" &&
    Number.isFinite(data.consistencyThreshold) &&
    Array.isArray(data.triads) &&
    Array.isArray(data.candidateComparisons) &&
    Array.isArray(data.recommendations) &&
    sameCriteria(data.criteria, criteria);

  return valid ? data : null;
};

const getInputState = ({ enabled, readOnly, diagnosticContext, criteria, evaluation }) => {
  if (
    !enabled ||
    readOnly === true ||
    !["creator", "expert"].includes(diagnosticContext?.mode)
  ) {
    return { status: "disabled", data: null, message: "" };
  }
  if (criteria.length < 3) {
    return { status: "notApplicable", data: null, message: "" };
  }

  try {
    const validEvaluation = validateEvaluation({
      decisionContext: { criteriaWeightingCriteria: criteria },
      evaluation,
    });
    if (
      validEvaluation.comparisons.length !==
      expectedComparisonCount(criteria.length)
    ) {
      return { status: "incomplete", data: null, message: "" };
    }
  } catch {
    return { status: "incomplete", data: null, message: "" };
  }

  return { status: "ready", data: null, message: "" };
};

const buildDiagnosticFingerprint = ({
  enabled,
  readOnly,
  diagnosticContext,
  criteria,
  evaluation,
}) => {
  try {
    return JSON.stringify([
      enabled,
      readOnly === true,
      diagnosticContext?.mode ?? null,
      diagnosticContext?.issueId ?? null,
      diagnosticContext?.criteriaWeightingModelId ?? null,
      diagnosticContext?.criteriaWeightingModelKey ?? null,
      diagnosticContext?.criteriaWeightingParameters ?? {},
      criteria,
      evaluation,
    ]);
  } catch {
    return "unserializable-diagnostic-input";
  }
};

export const useAHPConsistencyDiagnostic = ({
  criteria,
  evaluation,
  diagnosticContext,
  enabled = true,
  readOnly = false,
}) => {
  const [storedState, setStoredState] = useState({
    key: null,
    status: "disabled",
    data: null,
    message: "",
  });
  const requestSequence = useRef(0);
  const activeRequest = useRef(null);
  const currentFingerprint = useRef(null);
  const inputRevision = useRef({ fingerprint: null, revision: 0 });
  const fingerprint = buildDiagnosticFingerprint({
    enabled,
    readOnly,
    diagnosticContext,
    criteria,
    evaluation,
  });
  if (inputRevision.current.fingerprint !== fingerprint) {
    inputRevision.current = {
      fingerprint,
      revision: inputRevision.current.revision + 1,
    };
  }
  const diagnosticKey = JSON.stringify([
    inputRevision.current.revision,
    fingerprint,
  ]);
  currentFingerprint.current = diagnosticKey;

  const inputState = getInputState({
    enabled,
    readOnly,
    diagnosticContext,
    criteria,
    evaluation,
  });

  const abortActiveRequest = useCallback(() => {
    requestSequence.current += 1;
    if (activeRequest.current) {
      clearTimeout(activeRequest.current.timeoutId);
      activeRequest.current.controller.abort();
      activeRequest.current = null;
    }
  }, []);

  useEffect(() => () => {
    abortActiveRequest();
  }, [abortActiveRequest, diagnosticKey]);

  const checkConsistency = useCallback(async () => {
    if (inputState.status !== "ready") return;

    abortActiveRequest();
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, AHP_DIAGNOSTIC_TIMEOUT_MS);
    activeRequest.current = { controller, timeoutId };
    setStoredState({ key: diagnosticKey, status: "checking", data: null, message: "" });

    const isCurrentRequest = () =>
      requestSequence.current === sequence &&
      currentFingerprint.current === diagnosticKey;

    try {
      const response = diagnosticContext.mode === "creator"
        ? await diagnoseCreatorAHPConsistency({
            criteriaWeightingModelId: diagnosticContext.criteriaWeightingModelId,
            criteriaWeightingModelKey: diagnosticContext.criteriaWeightingModelKey,
            criteriaWeightingParameters: diagnosticContext.criteriaWeightingParameters,
            criteria,
            evaluation,
            signal: controller.signal,
          })
        : await diagnoseExpertAHPConsistency({
            issueId: diagnosticContext.issueId,
            evaluation,
            signal: controller.signal,
          });

      if (!isCurrentRequest()) return;
      const data = response?.success
        ? validateAHPDiagnosticResponse(response.data, criteria)
        : null;
      setStoredState(data
        ? {
            key: diagnosticKey,
            status: data.consistencyRatio === null ? "notApplicable" : "result",
            data,
            message: "",
          }
        : {
            key: diagnosticKey,
            status: "error",
            data: null,
            message: CHECK_UNAVAILABLE_MESSAGE,
          });
    } catch {
      if (!isCurrentRequest()) return;
      setStoredState({
        key: diagnosticKey,
        status: "error",
        data: null,
        message: CHECK_UNAVAILABLE_MESSAGE,
      });
    } finally {
      clearTimeout(timeoutId);
      if (activeRequest.current?.controller === controller) {
        activeRequest.current = null;
      }
    }
  }, [abortActiveRequest, criteria, diagnosticContext, evaluation, diagnosticKey, inputState.status]);

  const state = storedState.key === diagnosticKey
    ? storedState
    : inputState;

  return {
    ...state,
    diagnosticKey,
    checkConsistency,
  };
};
