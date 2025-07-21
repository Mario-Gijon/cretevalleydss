// Importa el módulo JSON Web Token para la verificación de tokens.
import jwt from "jsonwebtoken"

// Define un middleware para verificar la existencia y validez del refresh token.
export const requireRefreshToken = (req, res, next) => {
  try {
    // Obtiene la cookie que contiene el refresh token desde el objeto de cookies de la solicitud.
    const refreshTokenCookie = req.cookies.refreshToken;

    // Si la cookie no existe, responde con un mensaje indicando que el token no existe.
    if (!refreshTokenCookie) return res.json({ msg: "Token does not exist", success: false });

    // Verifica la validez del refresh token utilizando la clave secreta almacenada en el entorno.
    const { uid } = jwt.verify(refreshTokenCookie, process.env.JWT_REFRESH);

    // Agrega el UID del usuario verificado al objeto de solicitud para su uso posterior.
    req.uid = uid;

    // Llama al siguiente middleware o controlador en la cadena de ejecución.
    next();
  } catch (err) {
    console.log("ERROR")
    // Captura y registra cualquier error que ocurra durante el proceso.
    console.error(err);
  }
};
