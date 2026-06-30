import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import AdminRoute from "../../../src/pages/private/admin/AdminRoute.jsx";
import { AuthContext } from "../../../src/context/auth/auth.context.js";
import { theme } from "../../../src/theme/appTheme.js";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

const renderAdminRoute = (authValue) =>
  render(
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <CssBaseline />
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/dashboard/admin"]}>
          <Routes>
            <Route
              path="/dashboard/admin"
              element={
                <AdminRoute>
                  <div>admin content</div>
                </AdminRoute>
              }
            />
            <Route path="/dashboard/active" element={<div>active page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  );

describe("AdminRoute", () => {
  it("allows admins by role", async () => {
    renderAdminRoute({
      value: { role: "admin", isAdmin: false },
      loading: false,
    });

    expect(await screen.findByText("admin content")).toBeInTheDocument();
  });

  it("allows admins by isAdmin flag", async () => {
    renderAdminRoute({
      value: { role: "user", isAdmin: true },
      loading: false,
    });

    expect(await screen.findByText("admin content")).toBeInTheDocument();
  });

  it("redirects non-admin users to active issues", async () => {
    renderAdminRoute({
      value: { role: "user", isAdmin: false },
      loading: false,
    });

    expect(await screen.findByText("active page")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("renders nothing while auth is loading", () => {
    const { container } = renderAdminRoute({
      value: { role: "admin", isAdmin: true },
      loading: true,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("redirects safely when auth value is missing", async () => {
    renderAdminRoute({
      value: null,
      loading: false,
    });

    expect(await screen.findByText("active page")).toBeInTheDocument();
  });
});
