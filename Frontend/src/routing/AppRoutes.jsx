import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PrivateRoute, PublicOnlyRoute } from "./AppRouteGuards.jsx";
import {
  APP_PATHS,
  getRootRedirect,
  getWildcardRedirect,
} from "./appRouteDecisions.js";

const AuthLayout = lazy(() => import("../features/auth/components/AuthLayout"));
const LogInForm = lazy(() => import("../features/auth/components/LogInForm"));
const SignUpForm = lazy(() => import("../features/auth/components/SignUpForm"));
const PrivateLayout = lazy(() => import("../pages/private/PrivateLayout"));
const ActiveIssuesPage = lazy(() =>
  import("../pages/private/activeIssues/ActiveIssuesPage")
);
const FinishedIssuesPage = lazy(() =>
  import("../pages/private/finishedIssues/FinishedIssuesPage")
);
const CreateIssuePage = lazy(() =>
  import("../pages/private/createIssue/CreateIssuePage")
);
const AdminRoute = lazy(() => import("../pages/private/admin/AdminRoute"));
const AdminPage = lazy(() => import("../pages/private/admin/AdminPage"));
const ApplyingBackendChangesPage = lazy(() =>
  import("../pages/system/ApplyingBackendChangesPage")
);

export function AppRoutes({ isLoggedIn, hasPendingBackendChange }) {
  const routeState = { isLoggedIn, hasPendingBackendChange };

  return (
    <Routes>
      <Route path={APP_PATHS.ROOT} element={<AuthLayout />}>
        <Route
          path="login"
          element={
            <PublicOnlyRoute {...routeState}>
              <LogInForm />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="signup"
          element={
            <PublicOnlyRoute {...routeState}>
              <SignUpForm />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="login/*"
          element={<Navigate to={APP_PATHS.LOGIN} replace />}
        />
        <Route
          path="signup/*"
          element={<Navigate to={APP_PATHS.SIGNUP} replace />}
        />
        <Route
          path="register/*"
          element={<Navigate to={APP_PATHS.SIGNUP} replace />}
        />
        <Route
          index
          element={<Navigate to={getRootRedirect(routeState)} replace />}
        />
      </Route>

      <Route
        path={APP_PATHS.DASHBOARD}
        element={
          <PrivateRoute {...routeState}>
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

        <Route
          path="active/*"
          element={<Navigate to={APP_PATHS.DASHBOARD_ACTIVE} replace />}
        />
        <Route
          path="finished/*"
          element={<Navigate to={APP_PATHS.DASHBOARD_FINISHED} replace />}
        />
        <Route
          path="create/*"
          element={<Navigate to={APP_PATHS.DASHBOARD_CREATE} replace />}
        />
      </Route>

      <Route
        path={APP_PATHS.APPLYING_BACKEND_CHANGES}
        element={<ApplyingBackendChangesPage />}
      />

      <Route
        path="*"
        element={<Navigate to={getWildcardRedirect(routeState)} replace />}
      />
    </Routes>
  );
}
