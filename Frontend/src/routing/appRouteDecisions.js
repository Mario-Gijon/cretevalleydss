export const APP_PATHS = Object.freeze({
  ROOT: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  DASHBOARD_ACTIVE: "/dashboard/active",
  DASHBOARD_FINISHED: "/dashboard/finished",
  DASHBOARD_CREATE: "/dashboard/create",
  APPLYING_BACKEND_CHANGES: "/system/applying-changes",
});

export const isApplyingBackendChangesPath = (pathname) =>
  pathname === APP_PATHS.APPLYING_BACKEND_CHANGES;

export const shouldShowAppLoading = ({
  loading,
  pathname,
  hasPendingBackendChange,
}) =>
  Boolean(
    loading &&
      !(
        hasPendingBackendChange &&
        isApplyingBackendChangesPath(pathname)
      )
  );

export const getPublicOnlyRedirect = ({
  isLoggedIn,
  hasPendingBackendChange,
}) => {
  if (hasPendingBackendChange) {
    return APP_PATHS.APPLYING_BACKEND_CHANGES;
  }

  return isLoggedIn ? APP_PATHS.DASHBOARD : null;
};

export const getPrivateRedirect = ({
  isLoggedIn,
  hasPendingBackendChange,
}) => {
  if (!isLoggedIn && hasPendingBackendChange) {
    return APP_PATHS.APPLYING_BACKEND_CHANGES;
  }

  return isLoggedIn ? null : APP_PATHS.LOGIN;
};

export const getRootRedirect = ({
  isLoggedIn,
  hasPendingBackendChange,
}) => {
  if (isLoggedIn) {
    return APP_PATHS.DASHBOARD;
  }

  return hasPendingBackendChange
    ? APP_PATHS.APPLYING_BACKEND_CHANGES
    : APP_PATHS.LOGIN;
};

export const getWildcardRedirect = ({
  isLoggedIn,
  hasPendingBackendChange,
}) => {
  if (hasPendingBackendChange) {
    return APP_PATHS.APPLYING_BACKEND_CHANGES;
  }

  return isLoggedIn ? APP_PATHS.DASHBOARD : APP_PATHS.LOGIN;
};
