import { toIdString } from "../../../utils/common/ids.js";

export const normalizeEvaluationsPayload = (
  evaluations,
  expertWeightsByExpertId = null,
  { includeExpertWeights = true } = {}
) =>
  evaluations.map((evaluation) => {
    const expertId = toIdString(evaluation.expert._id || evaluation.expert);
    const payload = {
      expert: {
        id: expertId,
        name: evaluation.expert.name,
        email: evaluation.expert.email,
      },
      payload: evaluation.payload,
    };

    if (includeExpertWeights && expertWeightsByExpertId instanceof Map) {
      payload.weight = expertWeightsByExpertId.get(expertId);
    }

    return payload;
  });
