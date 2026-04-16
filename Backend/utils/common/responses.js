/**
 * Construye una respuesta estándar de la API.
 *
 * @param {Object} options Configuración de la respuesta.
 * @param {boolean} options.success Indica si la operación fue correcta.
 * @param {string} options.message Mensaje principal para el frontend.
 * @param {*} [options.data=null] Datos devueltos al frontend.
 * @param {Object|null} [options.error=null] Información de error.
 * @returns {Object}
 */
export const buildApiResponse = ({
  success,
  message,
  data = null,
  error = null,
}) => {
  if (success) {
    return {
      success: true,
      message,
      data: data ?? null,
    };
  }

  return {
    success: false,
    message,
    data: null,
    error: error ?? null,
  };
};

/**
 * Envía una respuesta de éxito con el contrato estándar de la API.
 *
 * @param {Object} res Response de Express.
 * @param {string} message Mensaje principal de la respuesta.
 * @param {*} [data=null] Datos devueltos al frontend.
 * @param {number} [statusCode=200] Código HTTP.
 * @returns {Object}
 */
export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res
    .status(statusCode)
    .json(
      buildApiResponse({
        success: true,
        message,
        data,
      })
    );
};