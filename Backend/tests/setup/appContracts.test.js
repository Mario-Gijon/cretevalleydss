import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";

describe("application HTTP contracts", () => {
  it("returns the exact health response shape before the API routers", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "Backend is healthy",
      data: {
        service: "backend",
        status: "ok",
        startedAt: expect.any(String),
      },
    });
    expect(Number.isNaN(Date.parse(response.body.data.startedAt))).toBe(false);
  });

  it("uses the API-specific 404 response for unknown /api routes", async () => {
    const response = await request(app)
      .get("/api/route-that-does-not-exist")
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "API route not found",
    });
  });

  it("uses the general 404 response outside /api", async () => {
    const response = await request(app)
      .get("/route-that-does-not-exist")
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Route not found",
    });
  });

  it("parses JSON before protected-route authentication and sends parser failures through the final error handler", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await request(app)
        .post("/api/issues")
        .set("Content-Type", "application/json")
        .send('{"issueInfo":')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Unexpected server error.",
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          field: null,
          details: null,
        },
      });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
