import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/App.jsx";
import { theme } from "../../src/theme/appTheme.js";

const authState = vi.hoisted(() => ({
  loading: false,
  isLoggedIn: false,
}));

const pendingState = vi.hoisted(() => ({
  value: false,
}));

vi.mock("../../src/context/auth/auth.context", () => ({
  useAuthContext: () => authState,
}));

vi.mock("../../src/utils/pendingBackendChange.js", () => ({
  isRecentPendingBackendChange: () => pendingState.value,
}));

vi.mock("../../src/features/auth/components/AuthLayout", () => ({
  default: () => <Outlet />,
}));

vi.mock("../../src/features/auth/components/LogInForm", () => ({
  default: () => <div>login-form</div>,
}));

vi.mock("../../src/features/auth/components/SignUpForm", () => ({
  default: () => <div>signup-form</div>,
}));

vi.mock("../../src/pages/private/PrivateLayout", () => ({
  default: () => <Outlet />,
}));

vi.mock("../../src/pages/private/activeIssues/ActiveIssuesPage", () => ({
  default: () => <div>active-issues-page</div>,
}));

vi.mock("../../src/pages/private/finishedIssues/FinishedIssuesPage", () => ({
  default: () => <div>finished-issues-page</div>,
}));

vi.mock("../../src/pages/private/createIssue/CreateIssuePage", () => ({
  default: () => <div>create-issue-page</div>,
}));

vi.mock("../../src/pages/private/admin/AdminRoute", () => ({
  default: ({ children }) => children,
}));

vi.mock("../../src/pages/private/admin/AdminPage", () => ({
  default: () => <div>admin-page</div>,
}));

vi.mock("../../src/pages/system/ApplyingBackendChangesPage", () => ({
  default: () => <div>applying-backend-changes-page</div>,
}));

describe("App routes", () => {
  beforeEach(() => {
    authState.loading = false;
    authState.isLoggedIn = false;
    pendingState.value = false;
    window.history.pushState({}, "", "/");
  });

  const renderApp = () =>
    render(
      <ThemeProvider theme={theme} disableTransitionOnChange>
        <App />
      </ThemeProvider>
    );

  it("redirects logged out users from private routes to login", async () => {
    window.history.pushState({}, "", "/dashboard");

    renderApp();

    expect(await screen.findByText("login-form")).toBeInTheDocument();
  });

  it("redirects logged in users away from public routes to the dashboard", async () => {
    authState.isLoggedIn = true;
    window.history.pushState({}, "", "/login");

    renderApp();

    expect(await screen.findByText("active-issues-page")).toBeInTheDocument();
  });

  it("sends users to the applying changes screen when a pending backend change exists", async () => {
    pendingState.value = true;
    window.history.pushState({}, "", "/login");

    renderApp();

    expect(
      await screen.findByText("applying-backend-changes-page")
    ).toBeInTheDocument();
  });

  it("renders the loading screen while authentication is bootstrapping", () => {
    authState.loading = true;
    window.history.pushState({}, "", "/dashboard");

    renderApp();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("active-issues-page")).not.toBeInTheDocument();
  });

  it("bypasses bootstrap loading for the pending applying-changes route", async () => {
    authState.loading = true;
    pendingState.value = true;
    window.history.pushState({}, "", "/system/applying-changes");

    renderApp();

    expect(
      await screen.findByText("applying-backend-changes-page")
    ).toBeInTheDocument();
  });

  it("keeps authenticated private routes available during a pending change", async () => {
    authState.isLoggedIn = true;
    pendingState.value = true;
    window.history.pushState({}, "", "/dashboard/finished");

    renderApp();

    expect(await screen.findByText("finished-issues-page")).toBeInTheDocument();
  });

  it("keeps the authenticated root redirect ahead of a pending change", async () => {
    authState.isLoggedIn = true;
    pendingState.value = true;
    window.history.pushState({}, "", "/");

    renderApp();

    expect(await screen.findByText("active-issues-page")).toBeInTheDocument();
  });

  it.each([
    ["/login/unrecognized", "login-form"],
    ["/signup/unrecognized", "signup-form"],
    ["/register/unrecognized", "signup-form"],
  ])("redirects the public alias %s", async (route, expectedContent) => {
    window.history.pushState({}, "", route);

    renderApp();

    expect(await screen.findByText(expectedContent)).toBeInTheDocument();
  });

  it.each([
    ["/dashboard/active/unrecognized", "active-issues-page"],
    ["/dashboard/finished/unrecognized", "finished-issues-page"],
    ["/dashboard/create/unrecognized", "create-issue-page"],
  ])("redirects the private wildcard %s", async (route, expectedContent) => {
    authState.isLoggedIn = true;
    window.history.pushState({}, "", route);

    renderApp();

    expect(await screen.findByText(expectedContent)).toBeInTheDocument();
  });

  it("gives a pending change precedence on the global wildcard", async () => {
    authState.isLoggedIn = true;
    pendingState.value = true;
    window.history.pushState({}, "", "/unknown-route");

    renderApp();

    expect(
      await screen.findByText("applying-backend-changes-page")
    ).toBeInTheDocument();
  });
});
