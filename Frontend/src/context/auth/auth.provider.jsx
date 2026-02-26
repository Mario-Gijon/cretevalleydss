// Importa los hooks useState y useEffect de React
import { useState, useEffect } from "react";
// Importa el contexto de autenticación
import { AuthContext } from "./auth.context.js";
import Cookies from "js-cookie";
// Importa la función para obtener datos protegidos
import { fetchProtectedData, EmptyAuthState, logout, getNotifications } from "../../controllers/authController.js";

export const AuthProvider = ({ children }) => {
  // Estado para almacenar los valores de autenticación
  const [value, setValue] = useState(EmptyAuthState);
  // Estado para manejar si el usuario está logueado
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Estado para manejar el indicador de carga
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Función para obtener las notificaciones
  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
      setNotifications(response.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    const emailChangeStatus = Cookies.get("emailChangeStatus");

    if (emailChangeStatus) {
      if (emailChangeStatus === "verified") {
        logout();
        setLoading(false);
        return;
      }
    }

    // Función para obtener datos protegidos
    const fetchData = async () => {
      const data = await fetchProtectedData();

      // Si hay datos, actualiza el estado de autenticación
      if (data && data.success) {
        setValue({
          name: data.name,
          university: data.university,
          email: data.email,
          accountCreation: data.accountCreation,
          role: data.role ?? "user",
          isAdmin: data.isAdmin ?? (data.role === "admin"),
        });

        setIsLoggedIn(true);

        // Llamar a fetchNotifications después de autenticación exitosa
        fetchNotifications();
      } else {
        setValue(EmptyAuthState);
        setIsLoggedIn(false);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Devuelve el proveedor de contexto con los valores de autenticación
  return (
    <AuthContext.Provider
      value={{
        value,
        setValue,
        isLoggedIn,
        setIsLoggedIn,
        loading,
        notifications,
        fetchNotifications,
        setNotifications
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};