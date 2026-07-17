import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

let adminRouter;
let authRouter;
let issueRouter;

beforeAll(async () => {
  [
    { default: adminRouter },
    { default: authRouter },
    { default: issueRouter },
  ] = await Promise.all([
    import("../../routes/admin.route.js"),
    import("../../routes/auth.route.js"),
    import("../../routes/issue.route.js"),
  ]);
});

const listRoutes = (router, mountPath) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${mountPath}${layer.route.path}`
      )
    )
    .sort();

describe("public API route inventory", () => {
  it("protects every authentication method and path", () => {
    expect(listRoutes(authRouter, "/api/auth")).toEqual(
      [
        "DELETE /api/auth/me",
        "GET /api/auth/account/confirm/:token",
        "GET /api/auth/admin/check",
        "GET /api/auth/email-change/confirm/:token",
        "GET /api/auth/me",
        "GET /api/auth/refresh",
        "PATCH /api/auth/me/email",
        "PATCH /api/auth/me/name",
        "PATCH /api/auth/me/university",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "POST /api/auth/signup",
        "PUT /api/auth/me/password",
      ].sort()
    );
  });

  it("protects every issue method and path", () => {
    expect(listRoutes(issueRouter, "/api/issues")).toEqual(
      [
        "DELETE /api/issues/:id",
        "DELETE /api/issues/expression-domains/:id",
        "DELETE /api/issues/finished/:id",
        "DELETE /api/issues/notifications/:notificationId",
        "DELETE /api/issues/scenarios/:scenarioId",
        "GET /api/issues/:id/evaluations/:stage",
        "GET /api/issues/:id/scenarios",
        "GET /api/issues/active",
        "GET /api/issues/expression-domains",
        "GET /api/issues/finished",
        "GET /api/issues/finished/:id",
        "GET /api/issues/models",
        "GET /api/issues/notifications",
        "GET /api/issues/scenarios/:scenarioId",
        "GET /api/issues/users",
        "PATCH /api/issues/:id/experts",
        "PATCH /api/issues/expression-domains/:id",
        "POST /api/issues/",
        "POST /api/issues/:id/evaluations/:stage/compute",
        "POST /api/issues/:id/evaluations/:stage/send",
        "POST /api/issues/:id/evaluations/:stage/submit",
        "POST /api/issues/:id/invitation-response",
        "POST /api/issues/:id/leave",
        "POST /api/issues/:id/scenarios",
        "POST /api/issues/expression-domains",
        "POST /api/issues/notifications/read-all",
      ].sort()
    );
  });

  it("protects every administration method and path", () => {
    expect(listRoutes(adminRouter, "/api/admin")).toEqual(
      [
        "DELETE /api/admin/experts/:id",
        "DELETE /api/admin/issues/:id",
        "DELETE /api/admin/model-forge/assets/:kind/:key",
        "GET /api/admin/decision-models-service/health",
        "GET /api/admin/experts",
        "GET /api/admin/issues",
        "GET /api/admin/issues/:id",
        "GET /api/admin/issues/:id/experts/progress",
        "GET /api/admin/issues/:issueId/experts/:expertId/evaluations",
        "GET /api/admin/issues/:issueId/experts/:expertId/weights",
        "GET /api/admin/model-forge/assets",
        "GET /api/admin/model-forge/catalog",
        "GET /api/admin/model-manifest/current",
        "GET /api/admin/models/catalog",
        "GET /api/admin/models/manifest/dry-run",
        "PATCH /api/admin/experts/:id",
        "PATCH /api/admin/issues/:id/experts",
        "PATCH /api/admin/issues/:id/owner",
        "PATCH /api/admin/models/:id/catalog-visibility",
        "POST /api/admin/decision-models-service/reload",
        "POST /api/admin/experts",
        "POST /api/admin/issues/:id/resolve",
        "POST /api/admin/issues/:id/weights/compute",
        "POST /api/admin/model-forge/model-package/apply",
        "POST /api/admin/model-forge/model-package/preview",
        "POST /api/admin/models/manifest/sync",
        "POST /api/admin/system/restart-backend",
      ].sort()
    );
  });
});
