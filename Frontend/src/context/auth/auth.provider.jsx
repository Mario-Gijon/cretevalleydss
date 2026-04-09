import { useEffect, useState } from "react";
import Cookies from "js-cookie";

import { AuthContext } from "./auth.context.js";
import {
  EmptyAuthState,
  fetchProtectedData,
  getNotifications,
  logout,
} from "../../services/auth.service.js";

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
      setNotifications(response?.notifications ?? []);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const emailChangeStatus = Cookies.get("emailChangeStatus");

      if (emailChangeStatus === "verified") {
        logout();
        setLoading(false);
        return;
      }

      try {
        const data = await fetchProtectedData();

        if (data?.success) {
          setValue({
            name: data.name,
            university: data.university,
            email: data.email,
            accountCreation: data.accountCreation,
            role: data.role ?? "user",
            isAdmin: data.isAdmin ?? data.role === "admin",
          });

          setIsLoggedIn(true);
          await fetchNotifications();
          return;
        }

        setValue(EmptyAuthState);
        setIsLoggedIn(false);
      } catch (error) {
        console.error("Failed to initialize authentication", error);
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