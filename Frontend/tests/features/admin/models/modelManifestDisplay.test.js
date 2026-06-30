import { describe, expect, it } from "vitest";

import {
  formatModelManifestBoolean,
  getModelAdminEnabledLabel,
  getModelCatalogVisibilityLabel,
  getModelManifestDisplayName,
  getModelVisibilityFieldForKind,
  getModelVisibilityTooltip,
  isModelActiveInCatalog,
  modelManifestValueToText,
  toModelManifestTitle,
} from "../../../../src/features/admin/models/logic/formatModelManifestDisplay.js";
import {
  getModelManifestSyncSeverity,
  getModelManifestSyncState,
} from "../../../../src/features/admin/models/logic/getModelManifestSeverity.js";

describe("formatModelManifestDisplay", () => {
  it("formats booleans with custom labels and unknown fallback", () => {
    expect(formatModelManifestBoolean(true, "Enabled", "Disabled")).toBe("Enabled");
    expect(formatModelManifestBoolean(false, "Enabled", "Disabled")).toBe("Disabled");
    expect(formatModelManifestBoolean(null)).toBe("Unknown");
  });

  it("formats field titles from snake_case, kebab-case, and camelCase", () => {
    expect(toModelManifestTitle("snake_case_field")).toBe("Snake Case Field");
    expect(toModelManifestTitle("kebab-case-field")).toBe("Kebab Case Field");
    expect(toModelManifestTitle("camelCaseField")).toBe("Camel Case Field");
    expect(toModelManifestTitle("")).toBe("Unknown");
  });

  it("converts values to safe display text", () => {
    expect(modelManifestValueToText(null)).toBe("null");
    expect(modelManifestValueToText(undefined)).toBe("null");
    expect(modelManifestValueToText("")).toBe("empty");
    expect(modelManifestValueToText("text")).toBe("text");
    expect(modelManifestValueToText(7)).toBe("7");
    expect(modelManifestValueToText(false)).toBe("false");
    expect(modelManifestValueToText(["a", 1])).toBe('["a",1]');
    expect(modelManifestValueToText({ a: 1 })).toBe('{"a":1}');
  });

  it("uses display name fallback order safely", () => {
    expect(getModelManifestDisplayName({ displayName: "Display" })).toBe("Display");
    expect(getModelManifestDisplayName({ mongoName: "Mongo name" })).toBe("Mongo name");
    expect(getModelManifestDisplayName({ apiModelKey: "api_key" })).toBe("api_key");
    expect(getModelManifestDisplayName({})).toBe("Unknown model");
  });

  it("uses the correct visibility field and labels by model kind", () => {
    const criteriaRow = {
      modelKind: "criteriaWeighting",
      visibleInCriteriaWeighting: false,
      visibleInIssueCreation: true,
    };
    const issueRow = {
      modelKind: "issue",
      visibleInIssueCreation: false,
    };

    expect(getModelVisibilityFieldForKind(criteriaRow)).toBe(
      "visibleInCriteriaWeighting"
    );
    expect(getModelVisibilityFieldForKind(issueRow)).toBe("visibleInIssueCreation");
    expect(isModelActiveInCatalog(criteriaRow)).toBe(false);
    expect(isModelActiveInCatalog(issueRow)).toBe(false);
    expect(getModelCatalogVisibilityLabel(criteriaRow)).toBe("Inactive");
    expect(getModelAdminEnabledLabel(issueRow)).toBe("Disabled");
  });

  it("returns the correct visibility tooltips including protected historical models", () => {
    expect(
      getModelVisibilityTooltip({ protectedHistoricalModel: true }, false)
    ).toBe("This model cannot be activated for new issues");
    expect(
      getModelVisibilityTooltip({ modelKind: "criteriaWeighting" }, true)
    ).toBe("Visible in criteria weighting selection");
    expect(
      getModelVisibilityTooltip({ modelKind: "issue" }, false)
    ).toBe("Hidden from issue model selection");
  });

  it("handles malformed rows and sync severity/state safely", () => {
    expect(getModelVisibilityFieldForKind()).toBe("visibleInIssueCreation");
    expect(getModelCatalogVisibilityLabel()).toBe("Active");
    expect(getModelManifestSyncSeverity("missing in mongo")).toBe("warning");
    expect(getModelManifestSyncSeverity("synced")).toBe("success");
    expect(getModelManifestSyncSeverity("weird")).toBe("info");
    expect(getModelManifestSyncState({ differences: [{}] })).toBe("Has differences");
    expect(getModelManifestSyncState({ matched: true })).toBe("Synced");
    expect(getModelManifestSyncState({ reason: "needs review" })).toBe("Review needed");
    expect(getModelManifestSyncState({})).toBe("Unknown");
  });
});
