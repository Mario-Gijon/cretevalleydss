import { afterEach, describe, expect, it, vi } from "vitest";

import { createIssueWorkflow } from "../../../modules/issues/creation/index.js";
import { editIssueExpertsWorkflow } from "../../../modules/issues/participants/index.js";

const createSession = (events) => ({
  withTransaction: vi.fn(async (operation) => {
    events.push("transaction:start");
    await operation();
    events.push("transaction:commit");
  }),
  endSession: vi.fn(async () => {
    events.push("session:end");
  }),
});

describe("issue workflow transaction and side-effect ordering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("commits, emails, and responds before ending the issue-creation session", async () => {
    const events = [];
    const session = createSession(events);
    const prepare = vi.fn(async () => {
      events.push("prepare");
      return { prepared: true };
    });
    const persist = vi.fn(async ({ session: receivedSession }) => {
      expect(receivedSession).toBe(session);
      events.push("persist");
      return {
        issueName: "Contract issue",
        emailsToSend: [{ expertEmail: "expert@example.com" }],
      };
    });
    const sendInvitationEmail = vi.fn(async () => {
      events.push("email");
    });

    await expect(
      createIssueWorkflow({
        issueInfo: { name: "input" },
        ownerUserId: "owner-id",
        prepare,
        persist,
        sendInvitationEmail,
        startSession: async () => session,
        beforeSessionCleanup: (result) => {
          events.push("response");
          return result;
        },
      })
    ).resolves.toEqual({ issueName: "Contract issue" });

    expect(events).toEqual([
      "prepare",
      "transaction:start",
      "persist",
      "transaction:commit",
      "email",
      "response",
      "session:end",
    ]);
  });

  it("tolerates an invitation failure only after issue creation committed", async () => {
    const events = [];
    const session = createSession(events);
    const emailError = new Error("provider unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createIssueWorkflow({
        issueInfo: {},
        ownerUserId: "owner-id",
        prepare: async () => ({}),
        persist: async () => ({
          issueName: "Committed issue",
          emailsToSend: [{ expertEmail: "expert@example.com" }],
        }),
        sendInvitationEmail: async () => {
          events.push("email:failed");
          throw emailError;
        },
        startSession: async () => session,
        beforeSessionCleanup: (result) => {
          events.push("response");
          return result;
        },
      })
    ).resolves.toEqual({ issueName: "Committed issue" });

    expect(events).toEqual([
      "transaction:start",
      "transaction:commit",
      "email:failed",
      "response",
      "session:end",
    ]);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed sending invitation email:",
      "expert@example.com",
      emailError
    );
  });

  it("does not send invitations when issue creation persistence fails", async () => {
    const events = [];
    const persistenceError = new Error("persistence failed");
    const session = {
      withTransaction: vi.fn(async (operation) => operation()),
      endSession: vi.fn(async () => {
        events.push("session:end");
      }),
    };
    const sendInvitationEmail = vi.fn();

    await expect(
      createIssueWorkflow({
        issueInfo: {},
        ownerUserId: "owner-id",
        prepare: async () => ({}),
        persist: async () => {
          throw persistenceError;
        },
        sendInvitationEmail,
        startSession: async () => session,
      })
    ).rejects.toBe(persistenceError);

    expect(sendInvitationEmail).not.toHaveBeenCalled();
    expect(events).toEqual(["session:end"]);
  });

  it("commits participant edits and emails before responding, then ends the session", async () => {
    const events = [];
    const session = createSession(events);

    await editIssueExpertsWorkflow({
      issueId: "issue-id",
      userId: "owner-id",
      expertsToAdd: ["expert@example.com"],
      expertsToRemove: [],
      expertWeightsByEmail: null,
      hasExpertWeightsByEmail: false,
      editExperts: async () => {
        events.push("edit");
        return {
          issueName: "Issue",
          invitationEmailsToSend: [{ expertEmail: "expert@example.com" }],
        };
      },
      sendInvitationEmail: async () => {
        events.push("email");
      },
      startSession: async () => session,
      beforeSessionCleanup: () => {
        events.push("response");
      },
    });

    expect(events).toEqual([
      "transaction:start",
      "edit",
      "transaction:commit",
      "email",
      "response",
      "session:end",
    ]);
  });
});
