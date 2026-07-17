export const DEFAULT_MODEL_PAPER_URL = "https://example.com";

export const resolveModelPaperUrl = (model) => {
  const value = typeof model?.moreInfoUrl === "string" ? model.moreInfoUrl.trim() : "";
  if (!value) return DEFAULT_MODEL_PAPER_URL;

  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? parsed.toString()
      : DEFAULT_MODEL_PAPER_URL;
  } catch {
    return DEFAULT_MODEL_PAPER_URL;
  }
};
