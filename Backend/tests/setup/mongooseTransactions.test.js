import { afterEach, describe, expect, it, vi } from "vitest";

import {
  runManualTransaction,
  runWithTransaction,
} from "../../utils/common/mongoose.js";

const createManualSession = () => {
  let transactionActive = false;

  return {
    startTransaction: vi.fn(() => {
      transactionActive = true;
    }),
    commitTransaction: vi.fn(async () => {
      transactionActive = false;
    }),
    abortTransaction: vi.fn(async () => {
      transactionActive = false;
    }),
    endSession: vi.fn(async () => {}),
    inTransaction: vi.fn(() => transactionActive),
  };
};

describe("mongoose transaction helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("commits a manual transaction and returns the operation result", async () => {
    const session = createManualSession();
    const operation = vi.fn(async () => "result");

    await expect(
      runManualTransaction(operation, {
        startSession: async () => session,
      })
    ).resolves.toBe("result");

    expect(operation).toHaveBeenCalledWith(session);
    expect(session.startTransaction).toHaveBeenCalledOnce();
    expect(session.commitTransaction).toHaveBeenCalledOnce();
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("runs successful transport work after commit and before session cleanup", async () => {
    const events = [];
    const session = createManualSession();
    session.commitTransaction.mockImplementation(async () => {
      events.push("commit");
    });
    session.endSession.mockImplementation(async () => {
      events.push("end");
    });

    await expect(
      runManualTransaction(async () => "result", {
        startSession: async () => session,
        onSuccessBeforeCleanup: (result) => {
          events.push(`response:${result}`);
          return "transport-result";
        },
      })
    ).resolves.toBe("transport-result");

    expect(events).toEqual(["commit", "response:result", "end"]);
  });

  it("aborts a failed manual mutation and preserves the original error", async () => {
    const session = createManualSession();
    const originalError = new Error("mutation failed");

    await expect(
      runManualTransaction(
        async () => {
          throw originalError;
        },
        { startSession: async () => session }
      )
    ).rejects.toBe(originalError);

    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("does not hide a commit failure during manual transaction cleanup", async () => {
    const session = createManualSession();
    const commitError = new Error("commit failed");
    session.commitTransaction.mockRejectedValueOnce(commitError);

    await expect(
      runManualTransaction(async () => "result", {
        startSession: async () => session,
      })
    ).rejects.toBe(commitError);

    expect(session.abortTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("preserves the operation error when abort and end cleanup also fail", async () => {
    const session = createManualSession();
    const originalError = new Error("operation failed");
    session.abortTransaction.mockRejectedValueOnce(new Error("abort failed"));
    session.endSession.mockRejectedValueOnce(new Error("end failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      runManualTransaction(
        async () => {
          throw originalError;
        },
        { startSession: async () => session }
      )
    ).rejects.toBe(originalError);

    expect(consoleError).toHaveBeenCalledTimes(2);
  });

  it("preserves the operation error when the transaction-state probe throws", async () => {
    const session = createManualSession();
    const originalError = new Error("operation failed");
    const probeError = new Error("state probe failed");
    session.inTransaction.mockImplementation(() => {
      throw probeError;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      runManualTransaction(
        async () => {
          throw originalError;
        },
        { startSession: async () => session }
      )
    ).rejects.toBe(originalError);

    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "Error aborting mongoose transaction:",
      probeError
    );
  });

  it("runs a handled failure response before ending the session", async () => {
    const events = [];
    const session = createManualSession();
    const originalError = new Error("confirmation failed");
    session.abortTransaction.mockImplementation(async () => {
      events.push("abort");
    });
    session.endSession.mockImplementation(async () => {
      events.push("end");
    });

    await expect(
      runManualTransaction(
        async () => {
          throw originalError;
        },
        {
          startSession: async () => session,
          onErrorBeforeCleanup: (error) => {
            expect(error).toBe(originalError);
            events.push("redirect");
            return "redirect-result";
          },
        }
      )
    ).resolves.toBe("redirect-result");

    expect(events).toEqual(["abort", "redirect", "end"]);
  });

  it("returns a withTransaction result and always ends the session", async () => {
    const session = {
      withTransaction: vi.fn(async (operation) => operation()),
      endSession: vi.fn(async () => {}),
    };

    await expect(
      runWithTransaction(async (receivedSession) => {
        expect(receivedSession).toBe(session);
        return { ok: true };
      }, { startSession: async () => session })
    ).resolves.toEqual({ ok: true });

    expect(session.withTransaction).toHaveBeenCalledOnce();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("runs withTransaction transport work before ending the session", async () => {
    const events = [];
    const session = {
      withTransaction: vi.fn(async (operation) => {
        const result = await operation();
        events.push("commit");
        return result;
      }),
      endSession: vi.fn(async () => {
        events.push("end");
      }),
    };

    await runWithTransaction(async () => "result", {
      startSession: async () => session,
      onSuccessBeforeCleanup: (result) => {
        events.push(`response:${result}`);
      },
    });

    expect(events).toEqual(["commit", "response:result", "end"]);
  });

  it("preserves a withTransaction failure and still ends the session", async () => {
    const originalError = new Error("transaction failed");
    const session = {
      withTransaction: vi.fn(async () => {
        throw originalError;
      }),
      endSession: vi.fn(async () => {}),
    };

    await expect(
      runWithTransaction(async () => "unused", {
        startSession: async () => session,
      })
    ).rejects.toBe(originalError);

    expect(session.endSession).toHaveBeenCalledOnce();
  });
});
