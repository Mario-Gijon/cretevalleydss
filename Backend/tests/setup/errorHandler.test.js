import { afterEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../../middlewares/errorHandler.js";
import {
  AppError,
  createUnauthorizedError,
} from "../../utils/common/errors.js";

const createResponse = () => {
  const res = {
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log expected exposed AppErrors during tests", () => {
    const error = createUnauthorizedError("Token does not exist.", {
      code: "NO_TOKEN",
    });
    const res = createResponse();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    errorHandler(error, {}, res, vi.fn());

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token does not exist.",
      data: null,
      error: {
        code: "NO_TOKEN",
        field: null,
        details: null,
      },
    });
  });

  it("still logs unexpected non-exposed application errors during tests", () => {
    const error = new AppError("Internal failure", {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      expose: false,
    });
    const res = createResponse();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    errorHandler(error, {}, res, vi.fn());

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
