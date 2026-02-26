import { CriteriaWeightEvaluation } from "../models/CriteriaWeightEvaluation.js";
import { Evaluation } from "../models/Evaluations.js";

export const cleanupExpertDraftsOnExit = async ({ issueId, expertId }) => {
  // drafts BWM (si los tienes)
  await CriteriaWeightEvaluation.deleteMany({ issue: issueId, expert: expertId, completed: false });

  // ¿Ha enviado algo alguna vez?
  const hasSubmittedSomething = await Evaluation.exists({
    issue: issueId,
    expert: expertId,
    $or: [
      { timestamp: { $ne: null } },                 // no-consenso o compat
      { history: { $elemMatch: { timestamp: { $ne: null } } } }, // consenso (si history=submit)
    ],
  });

  if (!hasSubmittedSomething) {
    // ✅ caso “lo añadí y lo quité sin enviar nada”
    await Evaluation.deleteMany({ issue: issueId, expert: expertId });
  }
};