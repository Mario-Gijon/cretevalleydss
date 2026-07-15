export const isModelCompatible = (model) => model?.compatibility?.compatible === true;

export const getCompatReason = (model) =>
  Array.isArray(model?.compatibility?.reasons)
    ? model.compatibility.reasons.filter(Boolean).join(" · ")
    : "";
