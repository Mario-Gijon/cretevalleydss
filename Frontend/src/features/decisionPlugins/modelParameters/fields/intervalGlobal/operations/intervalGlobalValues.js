export const buildDraftPair = (value) => {
  if (!Array.isArray(value)) return ["", ""];

  return [value[0] ?? "", value[1] ?? ""];
};
