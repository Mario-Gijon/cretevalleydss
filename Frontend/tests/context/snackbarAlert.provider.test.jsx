import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SnackbarAlertProvider } from "../../src/context/snackbarAlert/snackbarAlert.provider.jsx";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context.js";

const Trigger = ({ message = "Saved", severity }) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();

  return (
    <button type="button" onClick={() => showSnackbarAlert(message, severity)}>
      show alert
    </button>
  );
};

describe("SnackbarAlertProvider", () => {
  it("renders children", () => {
    render(
      <SnackbarAlertProvider>
        <div>provider child</div>
      </SnackbarAlertProvider>
    );

    expect(screen.getByText("provider child")).toBeInTheDocument();
  });

  it.each([
    ["success", "success"],
    ["warning", "warning"],
    ["error", "error"],
    ["info", "secondary"],
  ])("renders the %s visual treatment", async (severity, tone) => {
    const user = userEvent.setup();
    render(
      <SnackbarAlertProvider>
        <Trigger message="Saved successfully" severity={severity} />
      </SnackbarAlertProvider>
    );

    await user.click(screen.getByRole("button", { name: "show alert" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Saved successfully");
    expect(alert).toHaveAttribute("data-snackbar-tone", tone);
    expect(screen.getByRole("button", { name: "Close notification" })).toBeInTheDocument();
  });

  it("uses the default info severity and can be closed", async () => {
    const user = userEvent.setup();
    render(
      <SnackbarAlertProvider>
        <Trigger message="Default severity" />
      </SnackbarAlertProvider>
    );

    await user.click(screen.getByRole("button", { name: "show alert" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Default severity");
    expect(alert).toHaveAttribute("data-snackbar-tone", "secondary");

    await user.click(screen.getByRole("button", { name: "Close notification" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("throws when the snackbar context is used outside the provider", () => {
    expect(() => renderHook(() => useSnackbarAlertContext())).toThrow(
      "useSnackbarAlertContext must be used within a SnackbarAlertProvider"
    );
  });
});
