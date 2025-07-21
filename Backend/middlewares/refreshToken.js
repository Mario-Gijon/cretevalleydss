// Importa la función para generar tokens desde el archivo de utilidades.
import { generateToken } from '../utils/tokenManager.js'

// Exporta la función para manejar la lógica del refresh token.
export const refreshToken = (req, res) => {
  try {
    // Genera un nuevo token utilizando el UID del usuario almacenado en la solicitud.
    const { token, expiresIn } = generateToken(req.uid);

    // Devuelve el nuevo token y su tiempo de expiración como respuesta JSON.
    return res.json({ token, expiresIn, success: true });
  } catch (err) {
    // Captura y registra cualquier error que ocurra durante el proceso.
    console.error(err);

    // Devuelve un mensaje de error en formato JSON si la operación falla.
    res.json({ msg: "Refresh token failed", success: false });
  }
};
