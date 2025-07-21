// Importa el módulo JSON Web Token para la verificación de tokens.
import jwt from 'jsonwebtoken'

// Define un middleware para verificar la existencia y validez del token en las cabeceras.
export const requireToken = (req, res, next) => {
  try {
    // Obtiene el token del encabezado de autorización. Se espera el formato "Bearer <token>".
    const token = req.headers?.authorization.split(' ')[1];

    // Si no se proporciona el token, responde con un mensaje indicando su ausencia.
    if (!token) return res.json({ msg: "Token does not exist", success: false });

    // Verifica la validez del token utilizando la clave secreta almacenada en las variables de entorno.
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

    // Agrega el UID del usuario verificado al objeto de solicitud para su uso posterior.
    req.uid = uid;

    // Llama al siguiente middleware o controlador en la cadena de ejecución.
    next();
  } catch (err) {
    // Captura y registra cualquier error que ocurra durante el proceso de verificación.
    console.error(err);
  }
};
