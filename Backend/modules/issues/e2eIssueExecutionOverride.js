import { assertIsolatedE2eEnvironment } from "../../scripts/e2e/assertIsolatedE2eEnvironment.js";
import { isResultStructureCapabilityEnabled } from "../decisionPlugins/resultStructures/resultStructureRegistry.js";

const TOPSIS_SORT_2016_MODEL_KEY = "topsis_sort_2016";
const TOPSIS_SORT_2016_RESULT_STRUCTURE = Object.freeze({
  resultStructureKey: "sorting",
  resultStructureVersion: 1,
});

const isIsolatedTopsisSort2016ActivationEnabled = () => {
  if (process.env.E2E_ENABLE_TOPSIS_SORT_2016 !== "true") return false;

  try {
    assertIsolatedE2eEnvironment();
    return true;
  } catch {
    return false;
  }
};

/**
 * Keep sorting@1 disabled in its Result Plugin. This narrowly scoped runtime
 * exception exists only for the opt-in isolated E2E stack and still requires
 * the model's ordinary readiness and issue-execution authorization fields.
 */
export const isIssueModelResultStructureCapabilityEnabled = ({
  model,
  resultStructureMetadata,
  capability,
  registry,
}) => {
  const capabilityEnabled = isResultStructureCapabilityEnabled({
    ...resultStructureMetadata,
    capability,
    registry,
  });
  if (capabilityEnabled) return true;

  return (
    capability === "issueExecution" &&
    model?.modelKind === "issue" &&
    model?.apiModelKey === TOPSIS_SORT_2016_MODEL_KEY &&
    model?.implementationStatus === "ready" &&
    model?.publicUsable === true &&
    model?.manifestSync?.isStale !== true &&
    model?.issueExecutionAuthorized === true &&
    resultStructureMetadata?.resultStructureKey ===
      TOPSIS_SORT_2016_RESULT_STRUCTURE.resultStructureKey &&
    resultStructureMetadata?.resultStructureVersion ===
      TOPSIS_SORT_2016_RESULT_STRUCTURE.resultStructureVersion &&
    isIsolatedTopsisSort2016ActivationEnabled()
  );
};

export const isTopsisSort2016E2eActivationEnabled =
  isIsolatedTopsisSort2016ActivationEnabled;
