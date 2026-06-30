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
