import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    InputProps,
  }) => (
    <label htmlFor={id}>
      <span>{label}</span>
      {InputProps?.startAdornment}
      <input
        id={id}
        name={name}
        aria-label={label}
        value={value}
        type={type}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {InputProps?.endAdornment}
      {helperText ? <span>{helperText}</span> : null}
    </label>
  );

  return {
    Typography: makeDiv(),
    Container: makeDiv(),
    CircularProgress: () => <div role="progressbar">loading</div>,
    Button: ({ children, type = "button", ...props }) => (
      <button type={type} {...props}>
        {children}
      </button>
    ),
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

vi.mock("@mui/icons-material/PersonAddAltRounded", () => ({
  default: () => <span>signup-icon</span>,
}));

vi.mock("@mui/icons-material/BadgeRounded", () => ({
  default: () => <span>badge-icon</span>,
}));

vi.mock("@mui/icons-material/SchoolRounded", () => ({
  default: () => <span>school-icon</span>,
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
  signup: vi.fn(),
}));

import SignUpForm from "../../../src/features/auth/components/SignUpForm.jsx";
import { SnackbarAlertContext } from "../../../src/context/snackbarAlert/snackbarAlert.context.js";
import { signup } from "../../../src/services/auth.service";

const renderSignUpForm = ({ showSnackbarAlert = vi.fn() } = {}) => {
  render(
    <SnackbarAlertContext.Provider value={{ showSnackbarAlert }}>
      <SignUpForm />
    </SnackbarAlertContext.Provider>
  );

  return { showSnackbarAlert };
};

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the expected form fields and login link", () => {
    renderSignUpForm();

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("University")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Repeat Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Already registered? Click here to continue",
      })
    ).toBeInTheDocument();
  });

  it("labels and independently toggles both password visibility controls", async () => {
    const user = userEvent.setup();
    renderSignUpForm();

    const password = screen.getByLabelText("Password");
    const repeatedPassword = screen.getByLabelText("Repeat Password");

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(password).toHaveAttribute("type", "text");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await user.click(
      screen.getByRole("button", { name: "Show repeated password" })
    );

    expect(repeatedPassword).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide repeated password" })
    ).toBeInTheDocument();
  });

  it("prevents submit on invalid input and shows validation messages", async () => {
    const user = userEvent.setup();
    renderSignUpForm();

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(signup).not.toHaveBeenCalled();
    expect(
      screen.getAllByText("Only letters and spaces, min 2, max 25.")
    ).toHaveLength(2);
    expect(screen.getByText("Invalid email.")).toBeInTheDocument();
    expect(screen.getByText("1 number, 1 letter, min 6.")).toBeInTheDocument();
  });

  it("preserves the Enter-key focus order and submits from repeat password", async () => {
    const user = userEvent.setup();
    signup.mockResolvedValueOnce({ success: false, message: "Unavailable" });
    renderSignUpForm();

    const name = screen.getByLabelText("Name");
    const university = screen.getByLabelText("University");
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    const repeatPassword = screen.getByLabelText("Repeat Password");

    await user.type(name, "Mario");
    await user.type(university, "Crete");
    await user.type(email, "user@example.com");
    await user.type(password, "abc123");
    await user.type(repeatPassword, "abc123");

    university.focus();
    fireEvent.keyDown(university, { key: "Enter" });
    expect(name).toHaveFocus();
    fireEvent.keyDown(name, { key: "Enter" });
    expect(email).toHaveFocus();
    fireEvent.keyDown(email, { key: "Enter" });
    expect(password).toHaveFocus();
    fireEvent.keyDown(password, { key: "Enter" });
    expect(repeatPassword).toHaveFocus();

    fireEvent.keyDown(repeatPassword, { key: "Enter" });

    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith({
        name: "Mario",
        university: "Crete",
        email: "user@example.com",
        password: "abc123",
        repeatPassword: "abc123",
      })
    );
  });

  it("restarts values and validation feedback", async () => {
    const user = userEvent.setup();
    renderSignUpForm();

    const name = screen.getByLabelText("Name");
    await user.type(name, "1");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(
      screen.getAllByText("Only letters and spaces, min 2, max 25.")
    ).toHaveLength(2);

    await user.click(screen.getByTitle("Restart"));

    expect(name).toHaveValue("");
    expect(
      screen.queryByText("Only letters and spaces, min 2, max 25.")
    ).not.toBeInTheDocument();
  });

  it("disables form actions while signup is pending", async () => {
    const user = userEvent.setup();
    let resolveSignup;
    signup.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSignup = resolve;
        })
    );
    renderSignUpForm();

    await user.type(screen.getByLabelText("Name"), "Mario");
    await user.type(screen.getByLabelText("University"), "Crete");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "abc123");
    await user.type(screen.getByLabelText("Repeat Password"), "abc123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByTitle("Restart")).toBeDisabled();

    resolveSignup({ success: false, message: "Unavailable" });
    await waitFor(() => expect(screen.getByTitle("Restart")).toBeEnabled());
  });

  it("submits successfully and navigates back to login", async () => {
    const user = userEvent.setup();
    signup.mockResolvedValueOnce({
      success: true,
    });

    const { showSnackbarAlert } = renderSignUpForm();

    await user.type(screen.getByLabelText("Name"), "Mario");
    await user.type(screen.getByLabelText("University"), "Crete");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "abc123");
    await user.type(screen.getByLabelText("Repeat Password"), "abc123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(signup).toHaveBeenCalledWith({
      name: "Mario",
      university: "Crete",
      email: "user@example.com",
      password: "abc123",
      repeatPassword: "abc123",
    });
    await waitFor(() =>
      expect(showSnackbarAlert).toHaveBeenCalledWith(
        "Signup successfully, check your email for confirmation",
        "success"
      )
    );
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });

  it("surfaces backend errors and validation details", async () => {
    const user = userEvent.setup();
    signup.mockResolvedValueOnce({
      success: false,
      message: "Error signing up",
      error: {
        details: {
          email: "Email already exists.",
          repeatPassword: "Passwords don't match.",
        },
      },
    });

    const { showSnackbarAlert } = renderSignUpForm();

    await user.type(screen.getByLabelText("Name"), "Mario");
    await user.type(screen.getByLabelText("University"), "Crete");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "abc123");
    await user.type(screen.getByLabelText("Repeat Password"), "abc123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() =>
      expect(showSnackbarAlert).toHaveBeenCalledWith("Error signing up", "error")
    );
    expect(screen.getByText("Email already exists.")).toBeInTheDocument();
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
  });

  it("navigates to login from the inline link", async () => {
    const user = userEvent.setup();
    renderSignUpForm();

    await user.click(
      screen.getByRole("button", {
        name: "Already registered? Click here to continue",
      })
    );

    expect(navigateMock).toHaveBeenCalledWith("/login");
  });
});
