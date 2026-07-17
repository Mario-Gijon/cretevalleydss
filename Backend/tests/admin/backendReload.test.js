import { EventEmitter } from "node:events";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  BACKEND_RELOAD_MARKER_PATH,
  scheduleBackendReload,
} from "../../modules/admin/system/index.js";
import { restartBackendAdmin } from "../../controllers/admin.controller.js";

describe("admin backend reload scheduling", () => {
  it("uses the established backend runtime marker path", () => {
    expect(BACKEND_RELOAD_MARKER_PATH).toMatch(
      /\/Backend\/runtime\/backendReloadMarker\.json$/
    );
  });

  it("writes one exact reload marker after the response finishes", async () => {
    const response = new EventEmitter();
    const makeDirectory = vi.fn(async () => {});
    const writeMarker = vi.fn(async () => {});
    const scheduled = [];
    const schedule = vi.fn((operation, delay) => {
      scheduled.push({ operation, delay });
    });
    const markerPath = "/tmp/admin-reload-test/backendReloadMarker.json";

    const { data, afterResponseFinished } = scheduleBackendReload(
      { nodeEnv: "test" },
      {
        markerPath,
        makeDirectory,
        writeMarker,
        schedule,
        now: () => new Date("2026-07-17T10:11:12.345Z"),
      }
    );

    expect(data).toEqual({
      service: "backend",
      restartScheduled: true,
    });
    expect(afterResponseFinished).toEqual(expect.any(Function));

    expect(schedule).not.toHaveBeenCalled();
    response.on("finish", afterResponseFinished);
    response.emit("finish");
    response.emit("finish");

    expect(schedule).toHaveBeenCalledOnce();
    expect(scheduled[0].delay).toBe(250);

    await scheduled[0].operation();

    expect(makeDirectory).toHaveBeenCalledWith(path.dirname(markerPath), {
      recursive: true,
    });
    expect(writeMarker).toHaveBeenCalledWith(
      markerPath,
      '{\n  "updatedAt": "2026-07-17T10:11:12.345Z"\n}\n',
      "utf-8"
    );
  });

  it("keeps marker write failures asynchronous and logs the established message", async () => {
    const response = new EventEmitter();
    const failure = new Error("disk unavailable");
    const logError = vi.fn();
    let scheduledOperation;

    const { afterResponseFinished } = scheduleBackendReload(
      { nodeEnv: "development" },
      {
        markerPath: "/tmp/admin-reload-test/backendReloadMarker.json",
        makeDirectory: async () => {
          throw failure;
        },
        schedule: (operation) => {
          scheduledOperation = operation;
        },
        logError,
      }
    );

    response.on("finish", afterResponseFinished);
    response.emit("finish");
    await expect(scheduledOperation()).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      "Failed to update backend reload marker",
      failure
    );
  });

  it("rejects production restarts before returning marker scheduling work", () => {
    expect(() =>
      scheduleBackendReload({ nodeEnv: "production" })
    ).toThrowError(
      expect.objectContaining({
        message: "Backend restart is disabled in production.",
        statusCode: 403,
        code: "BACKEND_RESTART_DISABLED",
      })
    );
  });

  it("keeps response-finish registration in the controller before sending 202", async () => {
    const response = {
      on: vi.fn(),
      status: vi.fn(function status() {
        return this;
      }),
      json: vi.fn(function json(payload) {
        return payload;
      }),
    };

    await restartBackendAdmin({}, response);

    expect(response.on).toHaveBeenCalledWith("finish", expect.any(Function));
    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: "Backend restart scheduled successfully",
      data: {
        service: "backend",
        restartScheduled: true,
      },
    });
    expect(response.on.mock.invocationCallOrder[0]).toBeLessThan(
      response.status.mock.invocationCallOrder[0]
    );
  });
});
