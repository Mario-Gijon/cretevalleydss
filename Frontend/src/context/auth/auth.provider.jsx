import { useEffect, useState } from "react";
import Cookies from "js-cookie";

import { AuthContext } from "./auth.context.js";
import {
  EmptyAuthState,
  fetchProtectedDataForBootstrap,
  getNotifications,
  logout,
} from "../../services/auth.service.js";
import { isRecentPendingBackendChange } from "../../utils/pendingBackendChange.js";

/**
 * Expone el estado de autenticación y las notificaciones del usuario.
 *
 * @param {object} props
 * @param {*} props.children
 * @returns {*}
 */
export const AuthProvider = ({ children }) => {
  const [value, setValue] = useState(EmptyAuthState);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
      setNotifications(response?.data?.notifications ?? []);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const emailChangeStatus = Cookies.get("emailChangeStatus");

      if (emailChangeStatus === "verified") {
        await logout();
        setLoading(false);
        return;
      }

      try {
        const response = await fetchProtectedDataForBootstrap();
        const user = response?.data?.user ?? null;

        if (response?.success && user) {
          setValue({
            name: user.name || "",
            university: user.university || "",
            email: user.email || "",
            accountCreation: user.accountCreation || "",
            role: user.role ?? "user",
            isAdmin: user.isAdmin ?? user.role === "admin",
          });

          setIsLoggedIn(true);
          await fetchNotifications();
          return;
        }

        if (response?.status === 401 || response?.status === 403) {
          setValue(EmptyAuthState);
          setIsLoggedIn(false);
          return;
        }

        if (
          response?.error?.code === "NETWORK_ERROR" &&
          isRecentPendingBackendChange()
        ) {
          return;
        }

        setValue(EmptyAuthState);
        setIsLoggedIn(false);
      } catch (error) {
        console.error("Failed to initialize authentication", error);

        if (isRecentPendingBackendChange()) {
          return;
        }

        setValue(EmptyAuthState);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const authContextValue = {
    value,
    setValue,
    isLoggedIn,
    setIsLoggedIn,
    loading,
    notifications,
    setNotifications,
    fetchNotifications,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
