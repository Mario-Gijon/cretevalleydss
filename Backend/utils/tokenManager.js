// Importa la biblioteca `jsonwebtoken` para manejar la generación y verificación de tokens JWT.
import jwt from "jsonwebtoken"

// Función para generar un token de acceso.
export const generateToken = (uid) => {
  // Establece el tiempo de expiración del token en 15 minutos.
  const expiresIn = 60 * 15

  try {
    // Crea un token firmado con el `uid` del usuario y la clave secreta definida en las variables de entorno.
    const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn })

    // Devuelve el token y el tiempo de expiración.
    return { token, expiresIn }
  } catch (err) {
    // Captura y registra cualquier error que ocurra durante la generación del token.
    console.error(err)
  }
}

// Función para generar un token de refresco y configurarlo como cookie en la respuesta.
export const generateRefreshToken = (uid, res) => {
  // Establece el tiempo de expiración del token de refresco en 30 días.
  const expiresIn = 60 * 60 * 24 * 30

  try {
    // Crea un token de refresco firmado con el `uid` del usuario y la clave secreta de refresco.
    const refreshToken = jwt.sign({ uid }, process.env.JWT_REFRESH, { expiresIn })

    // Configura la cookie que almacena el token de refresco en la respuesta HTTP.
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // La cookie no estará disponible para el cliente mediante JavaScript.
      secure: true, // Cambiar a `true` en producción para enviar la cookie solo a través de HTTPS.
      sameSite: "strict", // Limita el envío de la cookie solo a solicitudes del mismo sitio.
      expires: new Date(Date.now() + expiresIn * 1000) // Establece la expiración de la cookie.
    })
  } catch (err) {
    // Captura y registra cualquier error que ocurra durante la generación del token de refresco.
    console.error(err)
  }
}

