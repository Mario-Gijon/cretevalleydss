import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { AuthProvider } from "../../src/context/auth/auth.provider.jsx";
import { useAuthContext } from "../../src/context/auth/auth.context.js";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";
import { server } from "../mocks/server.js";

const API = "http://localhost:4010";

function AuthConsumerProbe() {
  const { value, isLoggedIn, loading, notifications, fetchNotifications } =
    useAuthContext();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="logged-in">{String(isLoggedIn)}</div>
      <div data-testid="name">{value.name}</div>
      <div data-testid="role">{value.role}</div>
      <div data-testid="notifications">{notifications.length}</div>
      <button onClick={() => fetchNotifications()}>refresh notifications</button>
    </div>
  );
}

describe("AuthProvider", () => {
  it("bootstraps the authenticated user and notifications", async () => {
    renderWithProviders(
      <AuthProvider>
        <AuthConsumerProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );

    expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    expect(screen.getByTestId("name")).toHaveTextContent("Alice Analyst");
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
    expect(screen.getByTestId("notifications")).toHaveTextContent("2");
  });

  it("keeps the user logged out when bootstrap returns unauthorized", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Missing token",
            error: { code: "NO_TOKEN" },
          },
          { status: 401 }
        )
      )
    );

    renderWithProviders(
      <AuthProvider>
        <AuthConsumerProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );

    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
    expect(screen.getByTestId("name")).toHaveTextContent("");
    expect(screen.getByTestId("notifications")).toHaveTextContent("0");
  });

  it("refreshes notifications through the exposed context action", async () => {
    renderWithProviders(
      <AuthProvider>
        <AuthConsumerProbe />
      </AuthProvider>
    );

    await screen.findByText("Alice Analyst");

    server.use(
      http.get(`${API}/issues/notifications`, () =>
        HttpResponse.json({
          success: true,
          data: { notifications: [{ _id: "notif-3", title: "New alert" }] },
        })
      )
    );

    screen.getByRole("button", { name: "refresh notifications" }).click();

    await waitFor(() =>
      expect(screen.getByTestId("notifications")).toHaveTextContent("1")
    );
  });
});
