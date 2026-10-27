import { useEffect, useRef, useState } from "react";

import { diagnoseCreatorAHPConsistency } from "../../../../../../services/issue.service.js";
import { diagnoseExpertAHPConsistency } from "../../../../../issueEvaluation/services/issueEvaluation.service.js";
import { expectedComparisonCount, validateEvaluation } from "../operations/validateEvaluation.js";

export const AHP_DIAGNOSTIC_DEBOUNCE_MS = 300;
export const AHP_DIAGNOSTIC_TIMEOUT_MS = 15000;

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

const getPreflightState = ({ enabled, readOnly, diagnosticContext, criteria, evaluation }) => {
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

  return { status: "calculating", data: null, message: "" };
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
  const [storedState, setStoredState] = useState({ key: null, status: "disabled", data: null, message: "" });
  const requestSequence = useRef(0);
  const diagnosticContextRef = useRef(diagnosticContext);
  diagnosticContextRef.current = diagnosticContext;
  const fingerprint = buildDiagnosticFingerprint({
    enabled,
    readOnly,
    diagnosticContext,
    criteria,
    evaluation,
  });
  const preflight = getPreflightState({
    enabled,
    readOnly,
    diagnosticContext,
    criteria,
    evaluation,
  });
  const preflightStatus = preflight.status;

  useEffect(() => {
    const sequence = ++requestSequence.current;
    let active = true;
    let timedOut = false;
    const controller = new AbortController();
    let timeoutTimer = null;

    setStoredState({ key: fingerprint, status: preflightStatus, data: null, message: "" });
    if (preflightStatus !== "calculating") return () => {
      active = false;
      controller.abort();
    };

    const debounceTimer = setTimeout(async () => {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, AHP_DIAGNOSTIC_TIMEOUT_MS);

      try {
        const context = diagnosticContextRef.current;
        const response = context.mode === "creator"
          ? await diagnoseCreatorAHPConsistency({
              criteriaWeightingModelId: context.criteriaWeightingModelId,
              criteriaWeightingModelKey: context.criteriaWeightingModelKey,
              criteriaWeightingParameters: context.criteriaWeightingParameters,
              criteria,
              evaluation,
              signal: controller.signal,
            })
          : context.mode === "expert"
            ? await diagnoseExpertAHPConsistency({
                issueId: context.issueId,
                evaluation,
                signal: controller.signal,
              })
            : null;

        if (!active || requestSequence.current !== sequence) return;
        if (timedOut) {
          setStoredState({
            key: fingerprint,
            status: "error",
            data: null,
            message: "The consistency check took too long. You can continue without it.",
          });
          return;
        }
        const data = response?.success
          ? validateAHPDiagnosticResponse(response.data, criteria)
          : null;
        setStoredState(data
          ? {
              key: fingerprint,
              status: data.consistencyRatio === null
                ? "notApplicable"
                : "result",
              data,
              message: "",
            }
          : {
              key: fingerprint,
              status: "error",
              data: null,
              message: timedOut
                ? "The consistency check took too long. You can continue without it."
                : "Consistency could not be checked right now. You can continue without it.",
            });
      } catch (error) {
        if (!active || requestSequence.current !== sequence || error?.name === "AbortError" && !timedOut) return;
        setStoredState({
          key: fingerprint,
          status: "error",
          data: null,
          message: timedOut
            ? "The consistency check took too long. You can continue without it."
            : "Consistency could not be checked right now. You can continue without it.",
        });
      } finally {
        clearTimeout(timeoutTimer);
      }
    }, AHP_DIAGNOSTIC_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
      clearTimeout(timeoutTimer);
      controller.abort();
    };
  }, [criteria, evaluation, fingerprint, preflightStatus]);

  const state = storedState.key === fingerprint
    ? storedState
    : preflight;
  return { ...state, diagnosticKey: fingerprint };
};
