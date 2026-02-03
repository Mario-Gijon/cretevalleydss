
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
export const getExpressionsDomain = async () => {
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
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getExpressionsDomain`, options);
    const jsonData = await response.json();
    return jsonData.success ? jsonData.data : [];
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

export const createExpressionDomain = async (domain) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(domain),
  };

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BACK}/issues/createExpressionDomain`,
      options
    );
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

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

export const removeIssue = async (id) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/removeIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error removing issue:", err);
    return false;
  }
};

export const removeExpressionDomain = async (id) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/removeExpressionDomain`,options);
    return await response.json();
  } catch (err) {
    console.error("Error deleting domain:", err);
    return false;
  }
};

export const updateExpressionDomain = async (id, updatedDomain) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, updatedDomain }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/updateExpressionDomain`,options);
    return await response.json();
  } catch (err) {
    console.error("Error updating domain:", err);
    return false;
  }
};

export const changeInvitationStatus = async (id, action) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, action }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/changeInvitationStatus`, options);
    return await response.json();
  } catch (err) {
    console.error("Error changing invitation status:", err);
    return false;
  }
};

export const saveEvaluations = async (id, isPairwise, evaluations) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, evaluations }),
  };

  try {
    const url = isPairwise ? "savePairwiseEvaluations" : "saveEvaluations";
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/${url}`, options);
    return await response.json();
  } catch (err) {
    console.error("Error saving evaluations:", err);
    return false;
  }
};

export const getEvaluations = async (id, isPairwise) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const url = isPairwise ? "getPairwiseEvaluations" : "getEvaluations";
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/${url}`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching evaluations:", err);
    return false;
  }
};

export const sendEvaluations = async (id, isPairwise, evaluations) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, evaluations }),
  };

  try {
    const url = isPairwise ? "sendPairwiseEvaluations" : "sendEvaluations";
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/${url}`, options);
    return await response.json();
  } catch (err) {
    console.error("Error sending evaluations:", err);
    return false;
  }
};

export const resolveIssue = async (id, isPairwise) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const url = isPairwise ? "resolvePairwiseIssue" : "resolveIssue";
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/${url}`, options);
    return await response.json();
  } catch (err) {
    console.error("Error resolving issue:", err);
    return false;
  }
};

export const getFinishedIssueInfo = async (id) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BACK}/issues/getFinishedIssueInfo`,
      options
    );
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const removeFinishedIssue = async (id) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BACK}/issues/removeFinishedIssue`,
      options
    );
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const editExperts = async (id, expertsToAdd, expertsToRemove, domainAssignments = null) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, expertsToAdd, expertsToRemove, domainAssignments }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/editExperts`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const leaveIssue = async (id) => {
  const token = await getToken();
  if (!token) {
    console.error("No token available");
    return false;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/leaveIssue`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const saveBwmWeights = async (id, bwmData) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, bwmData }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/saveBwmWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const getBwmWeights = async (id) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getBwmWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const sendBwmWeights = async (id, bwmData) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, bwmData }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/sendBwmWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const saveManualWeights = async (id, weights) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, weights }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/saveManualWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const getManualWeights = async (id) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/getManualWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const sendManualWeights = async (id, weights) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, weights }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/sendManualWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const computeWeights = async (id) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/computeWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};

export const computeManualWeights = async (id) => {
  const token = await getToken();
  if (!token) return false;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BACK}/issues/computeManualWeights`, options);
    return await response.json();
  } catch (err) {
    console.error("Error fetching protected data:", err);
    return false;
  }
};


