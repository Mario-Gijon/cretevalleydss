import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { createForbiddenError } from "../../../utils/common/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKEND_RELOAD_MARKER_PATH = path.resolve(
  __dirname,
  "../../../runtime/backendReloadMarker.json"
);

export const scheduleBackendReload = (
  {
    nodeEnv = process.env.NODE_ENV,
  } = {},
  {
    markerPath = BACKEND_RELOAD_MARKER_PATH,
    makeDirectory = mkdir,
    writeMarker = writeFile,
    schedule = setTimeout,
    now = () => new Date(),
    logError = (message, error) => console.error(message, error),
  } = {}
) => {
  if (nodeEnv === "production") {
    throw createForbiddenError("Backend restart is disabled in production.", {
      code: "BACKEND_RESTART_DISABLED",
    });
  }

  let restartScheduled = false;
  const scheduleRestart = () => {
    if (restartScheduled) return;
    restartScheduled = true;

    schedule(async () => {
      try {
        await makeDirectory(path.dirname(markerPath), {
          recursive: true,
        });
        await writeMarker(
          markerPath,
          JSON.stringify(
            {
              updatedAt: now().toISOString(),
            },
            null,
            2
          ) + "\n",
          "utf-8"
        );
      } catch (error) {
        logError("Failed to update backend reload marker", error);
      }
    }, 250);
  };

  return {
    data: {
      service: "backend",
      restartScheduled: true,
    },
    afterResponseFinished: scheduleRestart,
  };
};
