import { describe, expect, it } from "vitest";

import {
  DEFAULT_MODEL_PAPER_URL,
  resolveModelPaperUrl,
} from "../../../modules/issues/finished/finishedPayload/serializers/modelPaperUrl.js";

describe("model paper URL serialization", () => {
  it("uses the stored public URL and one isolated fallback", () => {
    expect(resolveModelPaperUrl({ moreInfoUrl: "https://papers.example.test/topsis" })).toBe("https://papers.example.test/topsis");
    expect(resolveModelPaperUrl({ moreInfoUrl: null })).toBe(DEFAULT_MODEL_PAPER_URL);
  });

  it("does not serialize URLs that embed credentials", () => {
    expect(resolveModelPaperUrl({ moreInfoUrl: "https://token@example.test/private" })).toBe(DEFAULT_MODEL_PAPER_URL);
  });
});
