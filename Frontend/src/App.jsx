import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box, useColorScheme } from "@mui/material";

import { CircularLoading } from "./components/LoadingProgress/CircularLoading";
import { useAuthContext } from "./context/auth/auth.context";

const AuthLayout = lazy(() => import("./features/auth/components/AuthLayout"));
const LogInForm = lazy(() => import("./features/auth/components/LogInForm"));
const SignUpForm = lazy(() => import("./features/auth/components/SignUpForm"));
const PrivateLayout = lazy(() => import("./pages/private/PrivateLayout"));
const ActiveIssuesPage = lazy(() => import("./pages/private/activeIssues/ActiveIssuesPage"));
const FinishedIssuesPage = lazy(() => import("./pages/private/finishedIssues/FinishedIssuesPage"));
const CreateIssuePage = lazy(() => import("./pages/private/createIssue/CreateIssuePage"));
const AdminRoute = lazy(() => import("./pages/private/admin/AdminRoute"));
const AdminPage = lazy(() => import("./pages/private/admin/AdminPage"));

const APP_LOADING_CONTAINER_SX = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  position: "relative",
  overflow: "hidden",
};

function AppLoadingScreen() {
  const { mode } = useColorScheme();

  return (
    <Box className="dashboard-background" sx={APP_LOADING_CONTAINER_SX}>
      <CircularLoading
        size="5rem"
        color={mode === "dark" ? "secondary" : "primary"}
      />
    </Box>
  );
}

function PublicOnlyRoute({ isLoggedIn, children }) {
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : children;
}

function PrivateRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export function App() {
  const { loading, isLoggedIn } = useAuthContext();

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          <Route path="/" element={<AuthLayout />}>
            <Route
              path="login"
              element={
                <PublicOnlyRoute isLoggedIn={isLoggedIn}>
                  <LogInForm />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="signup"
              element={
                <PublicOnlyRoute isLoggedIn={isLoggedIn}>
                  <SignUpForm />
                </PublicOnlyRoute>
              }
            />
            <Route path="login/*" element={<Navigate to="/login" replace />} />
            <Route path="signup/*" element={<Navigate to="/signup" replace />} />
            <Route path="register/*" element={<Navigate to="/signup" replace />} />
            <Route
              index
              element={
                isLoggedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Route>

          <Route
            path="/dashboard"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn}>
                <PrivateLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<ActiveIssuesPage />} />
            <Route path="active" element={<ActiveIssuesPage />} />
            <Route path="finished" element={<FinishedIssuesPage />} />
            <Route path="create" element={<CreateIssuePage />} />
            <Route
              path="admin/*"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            <Route path="active/*" element={<Navigate to="/dashboard/active" replace />} />
            <Route path="finished/*" element={<Navigate to="/dashboard/finished" replace />} />
            <Route path="create/*" element={<Navigate to="/dashboard/create" replace />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}