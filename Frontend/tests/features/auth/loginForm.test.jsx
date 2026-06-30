import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ navigate: navigateMock }),
}));

vi.mock("@mui/material", () => {
  const makeDiv =
    (Tag = "div") =>
    function MockMaterialComponent({ children, ...props }) {
      return <Tag {...props}>{children}</Tag>;
    };

  const TextField = ({
    id,
    name,
    label,
    value,
    onChange,
    onKeyDown,
    helperText,
    type = "text",
  }) => (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        aria-label={label}
        value={value}
        type={type}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {helperText ? <span>{helperText}</span> : null}
    </label>
  );

  return {
    Typography: makeDiv(),
    Container: makeDiv(),
    CircularProgress: () => <div role="progressbar">loading</div>,
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    Stack: makeDiv(),
    Link: ({ children, onClick, ...props }) => (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Divider: makeDiv("hr"),
    Box: ({ component: Component = "div", children, ...props }) => (
      <Component {...props}>{children}</Component>
    ),
    InputAdornment: makeDiv(),
    IconButton: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
    TextField,
    Avatar: makeDiv(),
    Paper: makeDiv(),
  };
});

vi.mock("@mui/material/styles", () => ({
  useTheme: () => ({
    palette: {
      secondary: { main: "#45C5C5" },
      common: { white: "#fff" },
      background: { paper: "#fff" },
      info: { main: "#45C5C5" },
    },
  }),
}));

vi.mock("@mui/icons-material", () => ({
  Visibility: () => <span>show</span>,
  VisibilityOff: () => <span>hide</span>,
}));

vi.mock("@mui/icons-material/LockRounded", () => ({
  default: () => <span>lock-icon</span>,
}));

vi.mock("@mui/icons-material/EmailRounded", () => ({
  default: () => <span>email-icon</span>,
}));

vi.mock("@mui/icons-material/KeyRounded", () => ({
  default: () => <span>key-icon</span>,
}));

vi.mock("@mui/icons-material/RestartAltRounded", () => ({
  default: () => <span>restart-icon</span>,
}));

vi.mock("../../../src/features/auth/styles/auth.styles", () => ({
  authCardContentSx: {},
  getAuthCardSx: () => ({}),
}));

vi.mock("../../../src/services/auth.service", () => ({
  login: vi.fn(),
}));

import LogInForm from "../../../src/features/auth/components/LogInForm.jsx";
import { AuthContext } from "../../../src/context/auth/auth.context.js";
import { SnackbarAlertContext } from "../../../src/context/snackbarAlert/snackbarAlert.context.js";
import { login } from "../../../src/services/auth.service";

const renderLoginForm = ({
  setIsLoggedIn = vi.fn(),
  showSnackbarAlert = vi.fn(),
} = {}) => {
  render(
    <AuthContext.Provider
      value={{
        value: { role: "user", isAdmin: false },
        setIsLoggedIn,
        isLoggedIn: false,
      }}
    >
      <SnackbarAlertContext.Provider value={{ showSnackbarAlert }}>
        <LogInForm />
      </SnackbarAlertContext.Provider>
    </AuthContext.Provider>
  );

  return { setIsLoggedIn, showSnackbarAlert };
};

describe("LogInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email/password fields, submit action, and signup link", () => {
    renderLoginForm();

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Not registered? Click here to continue",
      })
    ).toBeInTheDocument();
  });

  it("prevents submit on invalid input and shows validation errors", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText("Invalid email.")).toBeInTheDocument();
    expect(screen.getByText("1 number, 1 letter, min 6.")).toBeInTheDocument();
  });

  it("submits successfully, shows loading state, and marks the user as logged in", async () => {
    const user = userEvent.setup();

    let resolveLogin;
    login.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
    );

    const { setIsLoggedIn, showSnackbarAlert } = renderLoginForm();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "abc123");

    const submitButton = screen.getByRole("button", { name: "Log in" });
    await user.click(submitButton);

    expect(login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "abc123",
    });
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    resolveLogin({
      success: true,
      data: { token: "token-1" },
    });

    await waitFor(() =>
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Logged in successfully!",
        "success"
      )
    );
    expect(setIsLoggedIn).toHaveBeenCalledWith(true);
  });

  it("surfaces backend validation errors on failed login", async () => {
    const user = userEvent.setup();
    login.mockResolvedValueOnce({
      success: false,
      message: "Invalid credentials",
      error: {
        details: {
          email: "Unknown email.",
          password: "Wrong password.",
        },
      },
    });

    const { showSnackbarAlert, setIsLoggedIn } = renderLoginForm();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "abc123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() =>
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Invalid credentials",
        "error"
      )
    );
    expect(screen.getByText("Unknown email.")).toBeInTheDocument();
    expect(screen.getByText("Wrong password.")).toBeInTheDocument();
    expect(setIsLoggedIn).not.toHaveBeenCalled();
  });

  it("navigates to signup from the inline link", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(
      screen.getByRole("button", {
        name: "Not registered? Click here to continue",
      })
    );

    expect(navigateMock).toHaveBeenCalledWith("/signup");
  });
});
