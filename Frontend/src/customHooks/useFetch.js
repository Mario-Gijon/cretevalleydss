// Importa el hook useState de React
import { useState } from 'react';

// Hook personalizado useFetch para manejar peticiones HTTP
export const useFetch = () => {
  // Estado para manejar el indicador de carga
  const [loading, setLoading] = useState(false);
  // Estado para manejar posibles errores de la solicitud
  const [error, setError] = useState(null);

  // Función para realizar la solicitud HTTP
  const fetchData = async (url, options = {}) => {
    // Activa el indicador de carga al iniciar la petición
    setLoading(true);
    // Limpia errores antes de la nueva solicitud
    setError(null);

    try {
      // Realiza la solicitud fetch y espera la respuesta
      const response = await fetch(url, options);
      // Convierte la respuesta a formato JSON
      const data = await response.json();

      // Si la respuesta no es OK, lanza un error
      if (!response.ok) {
        // Lanza el objeto de error para que lo manejemos abajo
        throw data;
      }

      // Devuelve los datos de la respuesta si la solicitud fue exitosa
      return data;
    } catch (err) {
      // Establece un error si ocurre durante la solicitud
      setError(err.errors || 'An unexpected error occurred');
      // Re-lanza el error para que pueda ser capturado fuera
      throw err;
    } finally {
      // Desactiva el indicador de carga al finalizar la petición, sin importar si fue exitosa o no
      setLoading(false);
    }
  };

  // Devuelve la función fetchData junto con los estados de carga y error
  return { fetchData, loading, error };
};
