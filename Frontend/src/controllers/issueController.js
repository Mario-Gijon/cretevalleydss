
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
export const getModelsInfo = async () => {
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
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getModelsInfo`, options);
    const jsonData = await response.json();
    return jsonData.success ? jsonData.data : false; // Devuelve los datos si es exitoso
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

// Función para obtener datos protegidos
export const getAllUsers = async () => {
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
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getAllUsers`, options);
    const jsonData = await response.json();
    /* console.log(jsonData.data) */
    return jsonData.success ? jsonData.data : false; // Devuelve los datos si es exitoso
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const createIssue = async (issueInfo) => {
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
    body: JSON.stringify({ issueInfo })
  };


  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/createIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const getAllActiveIssues = async () => {
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
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getAllActiveIssues`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const getAllFinishedIssues = async () => {
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
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getAllFinishedIssues`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const removeIssue = async (issueName) => {
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
    body: JSON.stringify({ issueName })
  };


  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/removeIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const changeInvitationStatus = async (issueName, action) => {
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
    body: JSON.stringify({ issueName, action })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/changeInvitationStatus`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const saveEvaluations = async (issueName, evaluations) => {
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
    body: JSON.stringify({ issueName, evaluations })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/saveEvaluations`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const getEvaluations = async (issueName) => {
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
    body: JSON.stringify({ issueName })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getEvaluations`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const sendEvaluations = async (issueName, evaluations) => {
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
    body: JSON.stringify({ issueName, evaluations })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/sendEvaluations`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const resolvePairwiseIssue = async (issueName) => {
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
    body: JSON.stringify({ issueName })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/resolvePairwiseIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const getFinishedIssueInfo = async (issueName) => {
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
    body: JSON.stringify({ issueName })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getFinishedIssueInfo`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const removeFinishedIssue = async (issueName) => {
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
    body: JSON.stringify({ issueName })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/removeFinishedIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const editExperts = async (issueName, expertsToAdd, expertsToRemove) => {
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
    body: JSON.stringify({ issueName, expertsToAdd, expertsToRemove })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/editExperts`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}

export const leaveIssue = async (issueName) => {
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
    body: JSON.stringify({ issueName })
  };

  try {
    // Realiza la solicitud para obtener datos protegidos
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/leaveIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false; // En caso de error, devuelve false
  }
}


