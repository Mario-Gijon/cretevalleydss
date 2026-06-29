import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { Outlet } from "react-router-dom";

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
});
