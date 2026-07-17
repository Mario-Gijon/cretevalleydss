import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";

import { useAuthContext } from "./context/auth/auth.context";
import { AppLoadingScreen } from "./routing/AppLoadingScreen.jsx";
import { AppRoutes } from "./routing/AppRoutes.jsx";
import { shouldShowAppLoading } from "./routing/appRouteDecisions.js";
import { isRecentPendingBackendChange } from "./utils/pendingBackendChange.js";

export function App() {
  const { loading, isLoggedIn } = useAuthContext();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const hasPendingBackendChange =
    typeof window !== "undefined" &&
    isRecentPendingBackendChange();

  if (
    shouldShowAppLoading({
      loading,
      pathname,
      hasPendingBackendChange,
    })
  ) {
    return <AppLoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<AppLoadingScreen />}>
        <AppRoutes
          isLoggedIn={isLoggedIn}
          hasPendingBackendChange={hasPendingBackendChange}
        />
      </Suspense>
    </BrowserRouter>
  );
}
