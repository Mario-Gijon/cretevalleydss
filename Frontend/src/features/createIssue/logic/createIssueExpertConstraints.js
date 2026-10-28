export const AHPSORT_I_API_MODEL_KEY = "ahp_sort_i";

export const requiresSingleCreateIssueExpert = (model) => {
  return [model?.apiModelKey, model?.technical?.apiModelKey].some((value) =>
    typeof value === "string" &&
    value.trim().replace(/^\/+|\/+$/g, "") === AHPSORT_I_API_MODEL_KEY
  );
};

export const AHPSORT_I_SINGLE_EXPERT_MESSAGE =
  "AHPSort I requires exactly one expert. Remove additional experts before creating the issue.";
