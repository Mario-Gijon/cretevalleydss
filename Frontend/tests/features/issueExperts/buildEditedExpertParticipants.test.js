import { describe, expect, it } from "vitest";

import {
  buildEditedExpertParticipants,
  buildExpertWeightsByEmail,
} from "../../../src/features/issueExperts/logic/buildEditedExpertParticipants.js";

describe("edited expert participants", () => {
  it("removes, adds, deduplicates, and sorts the final participant list", () => {
    const participants = buildEditedExpertParticipants({
      currentParticipants: [
        { email: "z@example.com", name: "Z", weight: 0.4 },
        { email: "remove@example.com", name: "Remove", weight: 0.6 },
      ],
      availableExperts: [
        { email: "a@example.com", name: "A" },
      ],
      expertsToAdd: ["a@example.com", "z@example.com"],
      expertsToRemove: ["remove@example.com"],
    });

    expect(participants).toEqual([
      { email: "a@example.com", name: "A", weight: 0, isNew: true },
      { email: "z@example.com", name: "Z", weight: 0.4 },
    ]);
    expect(buildExpertWeightsByEmail(participants)).toEqual({
      "a@example.com": 0,
      "z@example.com": 0.4,
    });
  });
});
