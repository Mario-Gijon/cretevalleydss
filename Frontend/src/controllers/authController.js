// Estado de autenticación vacío
export const EmptyAuthState = {
  value: { university: "", name: "", email: "", accountCreation: "" },
  setValue: () => { },
  isLoggedIn: false,
  loading: true,
};

// Función para obtener el token actualizado
export const getToken = async () => {
  // Opciones de la solicitud de actualización
  const refreshOptions = {
    method: "GET",
    credentials: "include", // Incluye las credenciales de la sesión (cookies)
  };

  try {
    // Realiza la solicitud para obtener el token
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/refresh`, refreshOptions);
    if (!response.ok) {
      return false; // Si no es ok, devuelve false
    }

    // Extrae el token y el éxito de la respuesta
    const { token, success } = await response.json();
    
    return success ? token : false; // Devuelve el token o false si no hay éxito
  } catch (err) {
    console.error("Error refreshing token:", err);
    return false; // En caso de error, devuelve false
  }
};

// Función para obtener datos protegidos
export const fetchProtectedData = async () => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  

  // Opciones de la solicitud para datos protegidos
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/protected`, options);
    const data = await response.json();
    return data.success ? data : false; // Devuelve los datos si es exitoso
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
};

// Función para registrarse
export const signup = async (formValues) => {
  // Configuración de la solicitud POST
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formValues),  // Cuerpo de la solicitud con los valores del formulario
  };

  try {
    // Realiza la solicitud de registro
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/signup`, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching form:", err);
    return false; // En caso de error, devuelve false
  }
};

// Función para iniciar sesión
export const login = async (formValues) => {
  // Configuración de la solicitud POST
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formValues), // Envía los valores del formulario como JSON
    credentials: "include", // Incluye cookies en la solicitud
  };

  try {
    // Realiza la solicitud de inicio de sesión
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/login`, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching form:", err);
    return false; // En caso de error, devuelve false
  }
};

// Función para realizar el logout
export const logout = async () => {
  // Opciones de la solicitud de logout
  const logoutOptions = {
    method: "GET",
    credentials: "include", // Incluye las credenciales de la sesión
  };

  try {
    // Realiza la solicitud de logout
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/logout`, logoutOptions);
    const { msg, success } = await response.json();
    return success ? true : msg; // Devuelve true si el logout es exitoso, de lo contrario el mensaje de error
  } catch (err) {
    console.error("Error logging out:", err);
    return false; // En caso de error, devuelve false
  }
};

// Función para eliminar la cuenta
export const deleteAccount = async () => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  // Opciones de la solicitud para eliminar la cuenta
  const options = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  try {
    // Realiza la solicitud para eliminar la cuenta
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/deleteAccount`, options);
    const { msg, success } = await response.json();
    return success ? true : msg; // Devuelve true si la eliminación es exitosa, de lo contrario el mensaje de error
  } catch (err) {
    console.error("Error deleting account:", err);
    return false; // En caso de error, devuelve false
  }
};

// Función para actualizar la contraseña
export const updatePassword = async (newPassword, repeatNewPassword) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  // Opciones de la solicitud para actualizar la contraseña
  const options = {
    method: "PUT", // Usamos PUT para actualizar
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newPassword,
      repeatNewPassword
    }),
  };

  try {
    // Realiza la solicitud para actualizar la contraseña
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/updatePassword`, options);
    return await response.json();
  } catch (err) {
    console.error("Error updating password:", err);
    return "An unexpected error occurred."; // Mensaje en caso de error no relacionado con el backend
  }
};

// Función para modificar el nombre de usuario
export const modifyUniversity = async (newUniversity) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return { success: false, msg: 'No token available' };
  }

  // Opciones de la solicitud para modificar el nombre de usuario
  const options = {
    method: "PUT", // Método adecuado para verificar datos
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newUniversity }),
  };

  try {
    // Realiza la solicitud para modificar el nombre de usuario
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/modifyUniversity`, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error verifying university:", err);
    return { success: false, msg: 'Unexpected error occurred' };
  }
};

// Función para modificar el nombre
export const modifyName = async (newName) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return { success: false, msg: 'No token available' };
  }

  // Opciones de la solicitud para modificar el nombre
  const options = {
    method: "PUT", // Método adecuado para verificar datos
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newName }),
  };

  try {
    // Realiza la solicitud para modificar el nombre
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/modifyName`, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error verifying name:", err);
    return { success: false, msg: 'Unexpected error occurred' };
  }
};

// Función para modificar el email
export const modifyEmail = async (newEmail) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return { success: false, msg: 'No token available' };
  }

  // Opciones de la solicitud para modificar el nombre
  const options = {
    method: "PUT", // Método adecuado para verificar datos
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newEmail }),
  };

  try {
    // Realiza la solicitud para modificar el nombre
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/auth/modifyEmail`, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error verifying email:", err);
    return { success: false, msg: 'Unexpected error occurred' };
  }
};

export const getNotifications = async () => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  // Opciones de la solicitud para datos protegidos
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getNotifications`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const markAllNotificationsAsRead = async () => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  // Opciones de la solicitud para datos protegidos
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/markAllNotificationsAsRead`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const removeNotification = async (notificationId) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  // Opciones de la solicitud para datos protegidos
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notificationId }),
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/removeNotificationById`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}





