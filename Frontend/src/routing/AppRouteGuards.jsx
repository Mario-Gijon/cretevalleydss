import { Navigate } from "react-router-dom";

import {
  getPrivateRedirect,
  getPublicOnlyRedirect,
} from "./appRouteDecisions.js";

export function PublicOnlyRoute({
  isLoggedIn,
  hasPendingBackendChange,
  children,
}) {
  const redirectTo = getPublicOnlyRedirect({
    isLoggedIn,
    hasPendingBackendChange,
  });

  return redirectTo ? <Navigate to={redirectTo} replace /> : children;
}

export function PrivateRoute({
  isLoggedIn,
  hasPendingBackendChange,
  children,
}) {
  const redirectTo = getPrivateRedirect({
    isLoggedIn,
    hasPendingBackendChange,
  });

  return redirectTo ? <Navigate to={redirectTo} replace /> : children;
}
