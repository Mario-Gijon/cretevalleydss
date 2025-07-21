import { nanoid } from 'nanoid'
import { User } from '../models/Users.js'
import { generateToken, generateRefreshToken } from '../utils/tokenManager.js'
import { sendEmailChangeConfirmation, sendVerificationEmail } from "../utils/sendEmails.js";
import jwt from "jsonwebtoken"
import mongoose from 'mongoose';

/**
 * Controlador para manejar el inicio de sesión de usuarios.
 */
export const loginUser = async (req, res) => {
  // Extrae email y password del cuerpo de la petición
  const { email, password } = req.body

  try {
    // Busca al usuario por email
    const user = await User.findOne({ email })

    // Si no existe, se responde con error
    if (!user) {
      return res.json({ errors: { email: `User does not exist` }, success: false })
    }

    // Verifica si la cuenta fue confirmada por email
    if (!user.accountConfirm) {
      return res.json({ errors: { email: `Email not verified` }, success: false })
    }

    // Compara la contraseña ingresada con la almacenada
    if (!await user.comparePassword(password)) {
      return res.json({ errors: { password: `Incorrect password` }, success: false })
    }

    // Si todo es correcto, genera token de acceso y de refresco
    const { token, expiresIn } = generateToken(user._id)
    generateRefreshToken(user._id, res)

    // Devuelve respuesta satisfactoria con token
    res.json({ msg: "Login successful", token, expiresIn, success: true })
  } catch (err) {
    // Captura errores inesperados
    console.error("Error during login:", err)
    res.json({ errors: { general: "Internal server error" }, success: false })
  }
}

/**
 * Controlador para manejar el registro de nuevos usuarios.
 */
export const signupUser = async (req, res) => {
  // Extrae los datos del cuerpo de la petición
  const { name, university, email, password } = req.body
  // Inicia una nueva sesión para usar una transacción
  const session = await mongoose.startSession()

  try {
    // Inicia la transacción
    session.startTransaction()

    // Verifica si ya existe un usuario con ese email
    const existingUser = await User.findOne({ email }).session(session)
    if (existingUser) {
      // Si existe, aborta la transacción y responde con error
      await session.abortTransaction()
      session.endSession()
      return res.json({ errors: { email: `Email already registered` }, success: false })
    }

    // Crea el nuevo usuario con un token de confirmación
    const user = new User({ name, university, email, password, tokenConfirm: nanoid() })

    // Guarda el usuario en la base de datos dentro de la sesión
    await user.save({ session })

    // Envía el correo de verificación
    await sendVerificationEmail({ name: user.name, email: user.email, token: user.tokenConfirm })

    // Si todo va bien, se confirma la transacción
    await session.commitTransaction()
    session.endSession()

    // Devuelve respuesta satisfactoria
    res.json({ msg: "Signup successful", success: true })
  } catch (err) {
    // En caso de error, se revierte la transacción
    await session.abortTransaction()
    session.endSession()
    console.error("Error during signup:", err)
    res.json({ errors: { general: err.message }, success: false })
  }
}

/**
 * Controlador para cerrar sesión.
 */
export const logout = (req, res) => {
  // Limpia la cookie del token de refresco
  res.clearCookie('refreshToken')
  // Respuesta satisfactoria
  res.json({ msg: "Logged out successfully", success: true })
}

/**
 * Controlador para eliminar la cuenta del usuario.
 */
export const deleteAccount = async (req, res) => {
  // Inicia una sesión para la transacción
  const session = await mongoose.startSession()

  try {
    // Comienza la transacción
    session.startTransaction()

    // Busca al usuario por su ID (obtenido del token)
    const user = await User.findById(req.uid).session(session)

    // Si no se encuentra, se cancela la transacción y se responde con error
    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return res.json({ msg: `User not found`, success: false })
    }

    // Elimina al usuario dentro de la sesión
    await User.findByIdAndDelete(user._id).session(session)

    // Confirma la transacción
    await session.commitTransaction()
    session.endSession()

    // Respuesta satisfactoria
    res.json({ msg: "Account deleted successfully", success: true })
  } catch (err) {
    // En caso de error, se revierte la transacción
    await session.abortTransaction()
    session.endSession()
    console.error("Error deleting account:", err)
    res.json({ msg: "Internal Server Error", success: false })
  }
}

/**
 * Controlador para actualizar la contraseña del usuario.
 */
export const updatePassword = async (req, res) => {
  // Inicia sesión para transacción
  const session = await mongoose.startSession()

  try {
    // Inicia la transacción
    session.startTransaction()

    // Busca al usuario por su ID
    const user = await User.findById(req.uid).session(session)

    // Si no existe, se cancela la operación
    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return res.json({ msg: `User not found`, success: false })
    }

    // Extrae las contraseñas del cuerpo de la solicitud
    const { newPassword, repeatNewPassword } = req.body

    // Verifica si ambas coinciden
    if (newPassword !== repeatNewPassword) {
      await session.abortTransaction()
      session.endSession()
      return res.json({ msg: "Passwords do not match", success: false })
    }

    // Asigna la nueva contraseña
    user.password = newPassword
    // Marca explícitamente el campo como modificado (por seguridad con Mongoose)
    user.markModified('password')

    // Guarda los cambios en la sesión
    await user.save({ session })

    // Confirma los cambios
    await session.commitTransaction()
    session.endSession()

    // Respuesta satisfactoria
    res.json({ msg: "Password updated successfully", success: true })
  } catch (err) {
    // Si hay error, revierte la transacción
    await session.abortTransaction()
    session.endSession()
    console.error("Error updating password:", err)
    res.json({ msg: "Internal Server Error", success: false })
  }
}

/**
 * Controlador para modificar la universidad del usuario.
 */
export const modifyUniversity = async (req, res) => {
  const { newUniversity } = req.body
  const session = await mongoose.startSession()

  try {
    // Iniciar transacción
    session.startTransaction()

    // Buscar usuario autenticado
    const user = await User.findById(req.uid).session(session)

    // Verificar si existe
    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, msg: 'User not found' })
    }

    // Actualizar universidad
    user.university = newUniversity

    // Guardar cambios en la sesión
    await user.save({ session })

    // Confirmar cambios
    await session.commitTransaction()
    session.endSession()

    // Respuesta satisfactoria
    return res.status(200).json({ success: true, msg: 'University updated successfully' })
  } catch (err) {
    // Revertir si hay error
    await session.abortTransaction()
    session.endSession()
    console.error(err)
    return res.status(500).json({ success: false, msg: 'Server error' })
  }
}

/**
 * Controlador para modificar el nombre del usuario.
 */
export const modifyName = async (req, res) => {
  const { newName } = req.body
  const session = await mongoose.startSession()

  try {
    // Iniciar transacción
    session.startTransaction()

    // Buscar usuario
    const user = await User.findById(req.uid).session(session)

    // Verificar existencia
    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, msg: 'User not found' })
    }

    // Asignar nuevo nombre
    user.name = newName

    // Guardar en la sesión
    await user.save({ session })

    // Confirmar transacción
    await session.commitTransaction()
    session.endSession()

    // Éxito
    return res.status(200).json({ success: true, msg: 'Name updated successfully' })
  } catch (err) {
    await session.abortTransaction()
    session.endSession()
    console.error(err)
    return res.status(500).json({ success: false, msg: 'Server error' })
  }
}

/**
 * Controlador para solicitar cambio de email (envía email de confirmación).
 */
export const modifyEmail = async (req, res) => {
  const { newEmail } = req.body
  const session = await mongoose.startSession()

  try {
    // Iniciar transacción
    session.startTransaction()

    // Buscar usuario autenticado
    const user = await User.findById(req.uid).session(session)

    if (!user) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, msg: 'User not found' })
    }

    // Generar token con nuevo email encriptado
    const emailToken = jwt.sign({ newEmail }, process.env.JWT_SECRET)

    // Guardar el token en el usuario
    user.emailTokenConfirm = emailToken
    await user.save({ session })

    // Enviar correo de confirmación a la nueva dirección
    await sendEmailChangeConfirmation({ newEmail, token: emailToken });
    // Confirmar transacción
    await session.commitTransaction()
    session.endSession()

    // Confirmación enviada
    return res.status(200).json({ success: true, msg: 'Please, check new email for confirmation' })
  } catch (err) {
    await session.abortTransaction()
    session.endSession()
    console.error(err)
    return res.status(500).json({ success: false, msg: 'Server error' })
  }
}

/**
 * Controlador para confirmar una cuenta a través del token.
 */
export const accountConfirm = async (req, res) => {
  const { token } = req.params
  const session = await mongoose.startSession()

  try {
    // Iniciar transacción
    session.startTransaction()

    // Buscar usuario con ese token
    const user = await User.findOne({ tokenConfirm: token }).session(session)

    if (!user) {
      // Si no se encuentra, configurar cookie de error y redirigir
      res.cookie("accountStatus", "verification_failed", { secure: false, sameSite: "strict", maxAge: 30000 })
      return res.redirect(`${process.env.ORIGIN_FRONT}/`)
    }

    // Confirmar cuenta
    user.accountConfirm = true
    user.tokenConfirm = null

    // Guardar cambios en sesión
    await user.save({ session })

    // Confirmar transacción
    await session.commitTransaction()
    session.endSession()

    // Configurar cookie de éxito
    res.cookie("accountStatus", "verified", { secure: false, sameSite: "strict", maxAge: 30000 })

    // Redirigir al frontend
    return res.redirect(`${process.env.ORIGIN_FRONT}/`)
  } catch (err) {
    await session.abortTransaction()
    session.endSession()
    console.error(err)

    // Configurar cookie de error general
    res.cookie("accountStatus", "error", { secure: false, sameSite: "strict", maxAge: 30000 })
    return res.redirect(`${process.env.ORIGIN_FRONT}/`)
  }
}

/**
 * Controlador para confirmar el cambio de email.
 */
export const confirmEmailChange = async (req, res) => {
  const { token } = req.params
  const session = await mongoose.startSession()

  try {
    // Iniciar transacción
    session.startTransaction()

    // Buscar usuario con el token
    const user = await User.findOne({ emailTokenConfirm: token }).session(session)

    if (!user) {
      res.cookie("emailChangeStatus", "verification_failed", { secure: false, sameSite: "strict", maxAge: 30000, })
      return res.redirect(`${process.env.ORIGIN_FRONT}/`)
    }

    // Decodificar el token para obtener el nuevo email
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Aplicar el nuevo email y eliminar el token
    user.email = decoded.newEmail
    user.emailTokenConfirm = null

    // Guardar en sesión
    await user.save({ session })

    // Confirmar transacción
    await session.commitTransaction()
    session.endSession()

    // Cookie de éxito
    res.cookie("emailChangeStatus", "verified", { secure: false, sameSite: "strict", maxAge: 30000, })

    // Redirigir al frontend
    return res.redirect(`${process.env.ORIGIN_FRONT}/`)
  } catch (err) {
    await session.abortTransaction()
    session.endSession()
    console.error(err)

    res.cookie("emailChangeStatus", "error", { secure: false, sameSite: "strict", maxAge: 30000, })
    return res.redirect(`${process.env.ORIGIN_FRONT}/`)
  }
}

/**
 * Controlador para obtener los datos del usuario autenticado.
 */
export const infoUser = async (req, res) => {
  try {
    // Obtener datos del usuario autenticado
    const user = await User.findById(req.uid).lean()

    // Enviar datos básicos
    res.json({ university: user.university, name: user.name, email: user.email, accountCreation: user.accountCreation, success: true })
  } catch (err) {
    console.error(err)
    res.json({ msg: "Error fetching user data", success: false })
  }
}




