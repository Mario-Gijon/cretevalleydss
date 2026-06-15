import { toIdString } from "../../../utils/common/ids.js";

export const normalizeEvaluationsPayload = (evaluations) =>
  evaluations.map((evaluation) => ({
    expert: {
      id: toIdString(evaluation.expert._id),
      name: evaluation.expert.name,
      email: evaluation.expert.email,
    },
    payload: evaluation.payload,
  }));
