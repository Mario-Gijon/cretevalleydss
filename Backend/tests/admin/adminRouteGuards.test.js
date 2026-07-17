import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  payload: {
    uid: "000000000000000000000001",
    role: "user",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: () => authState.payload,
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";

const ADMIN_ROUTE_CASES = [
  ["get", "/api/admin/experts"],
  ["post", "/api/admin/experts"],
  ["get", "/api/admin/models/catalog"],
  ["get", "/api/admin/model-forge/catalog"],
  ["get", "/api/admin/model-forge/assets"],
  ["post", "/api/admin/model-forge/model-package/preview"],
  ["post", "/api/admin/model-forge/model-package/apply"],
  ["delete", "/api/admin/model-forge/assets/model/example-model"],
  ["post", "/api/admin/system/restart-backend"],
  ["get", "/api/admin/decision-models-service/health"],
  ["post", "/api/admin/decision-models-service/reload"],
  ["get", "/api/admin/model-manifest/current"],
  [
    "patch",
    "/api/admin/models/000000000000000000000002/catalog-visibility",
  ],
  ["get", "/api/admin/models/manifest/dry-run"],
  ["post", "/api/admin/models/manifest/sync"],
  ["patch", "/api/admin/experts/000000000000000000000002"],
  ["delete", "/api/admin/experts/000000000000000000000002"],
  ["get", "/api/admin/issues"],
  ["get", "/api/admin/issues/000000000000000000000002"],
  ["delete", "/api/admin/issues/000000000000000000000002"],
  [
    "get",
    "/api/admin/issues/000000000000000000000002/experts/progress",
  ],
  [
    "get",
    "/api/admin/issues/000000000000000000000002/experts/000000000000000000000003/evaluations",
  ],
  [
    "get",
    "/api/admin/issues/000000000000000000000002/experts/000000000000000000000003/weights",
  ],
  ["patch", "/api/admin/issues/000000000000000000000002/owner"],
  ["patch", "/api/admin/issues/000000000000000000000002/experts"],
  [
    "post",
    "/api/admin/issues/000000000000000000000002/weights/compute",
  ],
  ["post", "/api/admin/issues/000000000000000000000002/resolve"],
];

const NO_TOKEN_RESPONSE = {
  success: false,
  message: "Token does not exist.",
  data: null,
  error: {
    code: "NO_TOKEN",
    field: null,
    details: null,
  },
};

const ADMIN_ONLY_RESPONSE = {
  success: false,
  message: "Admin only.",
  data: null,
  error: {
    code: "FORBIDDEN",
    field: null,
    details: null,
  },
};

const callRoute = ({ method, path, withToken = false }) => {
  const pendingRequest = request(app)[method](path);

  if (withToken) {
    pendingRequest.set("Authorization", "Bearer non-admin-token");
  }

  return pendingRequest;
};

describe("admin route guard contracts", () => {
  it.each(ADMIN_ROUTE_CASES)(
    "%s %s rejects requests without an access token before controller work",
    async (method, path) => {
      const response = await callRoute({ method, path }).expect(401);

      expect(response.body).toEqual(NO_TOKEN_RESPONSE);
    }
  );

  it.each(ADMIN_ROUTE_CASES)(
    "%s %s rejects authenticated non-admin users before controller work",
    async (method, path) => {
      authState.payload = {
        uid: "000000000000000000000001",
        role: "user",
      };

      const response = await callRoute({
        method,
        path,
        withToken: true,
      }).expect(403);

      expect(response.body).toEqual(ADMIN_ONLY_RESPONSE);
    }
  );
});
