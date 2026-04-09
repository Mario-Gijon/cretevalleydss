import { useState } from "react";

/**
 * Ejecuta peticiones HTTP y expone el estado de carga y error.
 *
 * @returns {{
 *   fetchData: (url: string, options?: RequestInit) => Promise<any>,
 *   loading: boolean,
 *   error: string | string[] | null
 * }}
 */
export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, options);

      let data = null;
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const normalizedError =
          data?.errors ||
          data?.message ||
          data ||
          "An unexpected error occurred";

        setError(normalizedError);
        throw normalizedError;
      }

      return data;
    } catch (err) {
      const normalizedError =
        err?.errors ||
        err?.message ||
        err ||
        "An unexpected error occurred";

      setError(normalizedError);
      throw normalizedError;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchData,
    loading,
    error,
  };
};