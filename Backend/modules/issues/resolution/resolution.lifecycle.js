import { Participation } from "../../../models/Participations.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  LIFECYCLE_KINDS,
  getSupportedLifecycleKinds,
  isSupportedLifecycleKind,
} from "../issue.lifecycleKind.js";

const DEFAULT_LIFECYCLE_POLICY = {
  forceFinalizeRequiresConsensus: true,
  consensusChecksRequireConsensus: true,
  markFinishedOnThreshold: false,
  markFinishedOnSinglePassFinalization: false,
};

export const FINALIZE_ON_FORCE = {
  forceFinalizeRequiresConsensus: true,
};

export const SINGLE_PASS_FINALIZATION = {
  consensusChecksRequireConsensus: true,
  markFinishedOnSinglePassFinalization: true,
};

export const THRESHOLD_CONSENSUS_PHASES = {
  consensusChecksRequireConsensus: false,
  markFinishedOnThreshold: true,
};

export const SINGLE_PASS_RESOLUTION_POLICY = {
  ...FINALIZE_ON_FORCE,
  ...SINGLE_PASS_FINALIZATION,
};

export const THRESHOLD_CONSENSUS_RESOLUTION_POLICY = {
  ...FINALIZE_ON_FORCE,
  ...THRESHOLD_CONSENSUS_PHASES,
};

const LIFECYCLE_POLICIES_BY_KIND = Object.freeze({
  [LIFECYCLE_KINDS.SINGLE_PASS]: SINGLE_PASS_RESOLUTION_POLICY,
  [LIFECYCLE_KINDS.THRESHOLD_CONSENSUS]: THRESHOLD_CONSENSUS_RESOLUTION_POLICY,
});

const normalizeLifecycleKind = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const getLifecyclePolicyOrThrow = (lifecycleKind) => {
  const normalizedLifecycleKind = normalizeLifecycleKind(lifecycleKind);

  if (!normalizedLifecycleKind) {
    throw createBadRequestError("Issue lifecycleKind is required for resolution", {
      code: "INVALID_ISSUE_LIFECYCLE_KIND",
      field: "lifecycleKind",
      details: {
        lifecycleKind: lifecycleKind ?? null,
        supportedLifecycleKinds: getSupportedLifecycleKinds(),
      },
    });
  }

  if (!isSupportedLifecycleKind(normalizedLifecycleKind)) {
    throw createBadRequestError(
      `Unsupported issue lifecycleKind: ${normalizedLifecycleKind}`,
      {
        code: "UNSUPPORTED_ISSUE_LIFECYCLE_KIND",
        field: "lifecycleKind",
        details: {
          lifecycleKind: normalizedLifecycleKind,
          supportedLifecycleKinds: getSupportedLifecycleKinds(),
        },
      }
    );
  }

  return LIFECYCLE_POLICIES_BY_KIND[normalizedLifecycleKind];
};

/**
 * Aplica la lógica de ciclo de vida posterior al guardado de consenso.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue actual.
 * @param {boolean} [params.forceFinalize=false] Fuerza finalización.
 * @param {number} params.currentPhase Fase de consenso actual.
 * @param {number|null} params.consensusLevel Nivel de consenso calculado.
 * @param {Array<string>|Array<Object>} params.rankedAlternatives Ranking final de alternativas.
 * @param {Object} [params.lifecyclePolicy] Política de ciclo de vida compuesta por reglas de comportamiento.
 * @returns {Promise<Object>}
 */
export const handleResolutionLifecycle = async ({
  issue,
  forceFinalize = false,
  currentPhase,
  consensusLevel,
  rankedAlternatives,
  lifecyclePolicy,
}) => {
  const {
    forceFinalizeRequiresConsensus,
    consensusChecksRequireConsensus,
    markFinishedOnThreshold,
    markFinishedOnSinglePassFinalization,
  } = {
    ...DEFAULT_LIFECYCLE_POLICY,
    ...(lifecyclePolicy || {}),
  };

  const canForceFinalize = forceFinalizeRequiresConsensus
    ? Boolean(issue.isConsensus)
    : true;

  const runConsensusChecks = consensusChecksRequireConsensus
    ? Boolean(issue.isConsensus)
    : true;

  if (canForceFinalize && forceFinalize) {
    issue.active = false;
    await issue.save();

    return {
      finished: true,
      message: `Issue '${issue.name}' resolved as final round due to closure date.`,
      rankedAlternatives,
    };
  }

  if (runConsensusChecks) {
    if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
      issue.active = false;
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives,
      };
    }

    if (consensusLevel >= issue.consensusThreshold) {
      issue.active = false;
      if (markFinishedOnThreshold) {
        issue.currentStage = "finished";
      }
      await issue.save();

      return {
        finished: true,
        message: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives,
      };
    }

    await Participation.updateMany(
      { issue: issue._id },
      { $set: { evaluationCompleted: false } }
    );
    issue.consensusPhase = currentPhase + 1;
    await issue.save();

    return {
      finished: false,
      message: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
    };
  }

  issue.active = false;
  if (markFinishedOnSinglePassFinalization) {
    issue.currentStage = "finished";
  }
  await issue.save();

  return {
    finished: true,
    message: `Issue '${issue.name}' resolved.`,
    rankedAlternatives,
  };
};
