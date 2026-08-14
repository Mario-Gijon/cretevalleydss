// Normalizes criteriaPreferenceOrder to its canonical persisted shape.

export const normalizeCriteriaPreferenceOrderPayload = ({
  payload,
}) => ({
  criterionOrder: [...payload.criterionOrder],
});