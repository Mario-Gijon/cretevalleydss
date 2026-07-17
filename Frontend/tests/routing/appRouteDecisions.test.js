import { describe, expect, it } from "vitest";

import {
  APP_PATHS,
  getPrivateRedirect,
  getPublicOnlyRedirect,
  getRootRedirect,
  getWildcardRedirect,
  shouldShowAppLoading,
} from "../../src/routing/appRouteDecisions.js";

describe("app route decisions", () => {
  it.each([
    {
      name: "shows loading outside the applying-changes route",
      input: {
        loading: true,
        pathname: APP_PATHS.DASHBOARD,
        hasPendingBackendChange: false,
      },
      expected: true,
    },
    {
      name: "shows loading on applying-changes without a pending change",
      input: {
        loading: true,
        pathname: APP_PATHS.APPLYING_BACKEND_CHANGES,
        hasPendingBackendChange: false,
      },
      expected: true,
    },
    {
      name: "bypasses loading for a pending applying-changes flow",
      input: {
        loading: true,
        pathname: APP_PATHS.APPLYING_BACKEND_CHANGES,
        hasPendingBackendChange: true,
      },
      expected: false,
    },
    {
      name: "does not show loading after bootstrap",
      input: {
        loading: false,
        pathname: APP_PATHS.DASHBOARD,
        hasPendingBackendChange: false,
      },
      expected: false,
    },
  ])("$name", ({ input, expected }) => {
    expect(shouldShowAppLoading(input)).toBe(expected);
  });

  it("preserves public-route redirect precedence", () => {
    expect(
      getPublicOnlyRedirect({
        isLoggedIn: true,
        hasPendingBackendChange: true,
      })
    ).toBe(APP_PATHS.APPLYING_BACKEND_CHANGES);
    expect(
      getPublicOnlyRedirect({
        isLoggedIn: true,
        hasPendingBackendChange: false,
      })
    ).toBe(APP_PATHS.DASHBOARD);
    expect(
      getPublicOnlyRedirect({
        isLoggedIn: false,
        hasPendingBackendChange: false,
      })
    ).toBeNull();
  });

  it("allows authenticated users through private routes during a pending change", () => {
    expect(
      getPrivateRedirect({
        isLoggedIn: true,
        hasPendingBackendChange: true,
      })
    ).toBeNull();
    expect(
      getPrivateRedirect({
        isLoggedIn: false,
        hasPendingBackendChange: true,
      })
    ).toBe(APP_PATHS.APPLYING_BACKEND_CHANGES);
    expect(
      getPrivateRedirect({
        isLoggedIn: false,
        hasPendingBackendChange: false,
      })
    ).toBe(APP_PATHS.LOGIN);
  });

  it("preserves root and wildcard pending-change precedence", () => {
    expect(
      getRootRedirect({
        isLoggedIn: true,
        hasPendingBackendChange: true,
      })
    ).toBe(APP_PATHS.DASHBOARD);
    expect(
      getRootRedirect({
        isLoggedIn: false,
        hasPendingBackendChange: true,
      })
    ).toBe(APP_PATHS.APPLYING_BACKEND_CHANGES);

    expect(
      getWildcardRedirect({
        isLoggedIn: true,
        hasPendingBackendChange: true,
      })
    ).toBe(APP_PATHS.APPLYING_BACKEND_CHANGES);
    expect(
      getWildcardRedirect({
        isLoggedIn: true,
        hasPendingBackendChange: false,
      })
    ).toBe(APP_PATHS.DASHBOARD);
    expect(
      getWildcardRedirect({
        isLoggedIn: false,
        hasPendingBackendChange: false,
      })
    ).toBe(APP_PATHS.LOGIN);
  });
});
