import { render } from "@testing-library/react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";

import { AuthContext } from "../../src/context/auth/auth.context.js";
import { IssuesDataContext } from "../../src/context/issues/issues.context.js";
import { SnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context.js";
import { theme } from "../../src/theme/appTheme.js";

const defaultAuthValue = {
  value: {
    university: "",
    name: "",
    email: "",
    accountCreation: "",
    role: "user",
    isAdmin: false,
  },
  setValue: () => {},
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  loading: false,
  notifications: [],
  setNotifications: () => {},
  fetchNotifications: async () => [],
};

const defaultIssuesValue = {
  initialExperts: [],
  models: [],
  criteriaWeightingModels: [],
  globalDomains: [],
  expressionDomains: [],
  setExpressionDomains: () => {},
  loading: false,
  setLoading: () => {},
  issueCreated: "",
  setIssueCreated: () => {},
  activeIssues: [],
  taskCenter: null,
  filtersMeta: null,
  finishedIssues: [],
  setActiveIssues: () => {},
  setTaskCenter: () => {},
  setFiltersMeta: () => {},
  setFinishedIssues: () => {},
  fetchActiveIssues: async () => null,
  fetchFinishedIssues: async () => [],
  fetchIssues: async () => {},
};

const defaultSnackbarValue = {
  showSnackbarAlert: () => {},
};

export const renderWithProviders = (
  ui,
  {
    route = "/",
    authValue = {},
    issuesValue = {},
    snackbarValue = {},
    ...renderOptions
  } = {}
) =>
  render(
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <CssBaseline />
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={{ ...defaultAuthValue, ...authValue }}>
          <SnackbarAlertContext.Provider
            value={{ ...defaultSnackbarValue, ...snackbarValue }}
          >
            <IssuesDataContext.Provider
              value={{ ...defaultIssuesValue, ...issuesValue }}
            >
              {ui}
            </IssuesDataContext.Provider>
          </SnackbarAlertContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
    renderOptions
  );
