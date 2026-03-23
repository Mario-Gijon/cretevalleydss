// Models
import { ExitUserIssue } from "../../models/ExitUserIssue.js";

/**
 * Devuelve el stage compatible con ExitUserIssue a partir del currentStage del issue.
 *
 * @param {string | null | undefined} stage Stage actual del issue.
 * @returns {string | null}
 */
export const mapIssueStageToExitStage = (stage) => {
  if (stage === "criteriaWeighting" || stage === "weightsFinished") {
    return "criteriaWeighting";
  }

  if (stage === "alternativeEvaluation") {
    return "alternativeEvaluation";
  }

  return null;
};

/**
 * Registra una salida de usuario en ExitUserIssue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.userId Id del usuario.
 * @param {number | null} params.phase Fase asociada.
 * @param {string | null} params.stage Stage compatible.
 * @param {string} params.reason Motivo de la salida.
 * @returns {Promise<void>}
 */
export const registerUserExit = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
}) => {
  const now = new Date();

  const historyEntry = {
    timestamp: now,
    phase,
    stage,
    action: "exited",
    reason,
  };

  await ExitUserIssue.findOneAndUpdate(
    { issue: issueId, user: userId },
    {
      $setOnInsert: {
        issue: issueId,
        user: userId,
      },
      $set: {
        hidden: true,
        timestamp: now,
        phase,
        stage,
        reason,
      },
      $push: {
        history: historyEntry,
      },
    },
    { upsert: true, new: true }
  );
};