/**
 * @module models/User
 */

import bcrypt from "bcryptjs";
import moment from "moment";
import { model, Schema } from "mongoose";


/**
 * Documento persistido de usuario de la aplicación.
 *
 * @typedef {Object} UserDocument
 * @property {*} _id Identificador del documento.
 * @property {string} name Nombre visible del usuario.
 * @property {string} university Universidad asociada.
 * @property {string} email Correo electrónico único.
 * @property {string} password Contraseña hasheada.
 * @property {string} role Rol del usuario.
 * @property {string|null} tokenConfirm Token de confirmación de cuenta.
 * @property {string|null} emailTokenConfirm Token temporal de cambio de email.
 * @property {boolean} accountConfirm Indica si la cuenta está confirmada.
 * @property {string} accountCreation Fecha funcional de creación de cuenta.
 */


/**
 * Modelo de usuario de la aplicación.
 *
 * Representa tanto usuarios normales como administradores del sistema.
 * Se utiliza en autenticación, gestión de perfil, administración de usuarios
 * y como referencia en issues, participaciones, evaluaciones y notificaciones.
 *
 * Campos principales:
 * - `name`: nombre visible del usuario.
 * - `university`: universidad asociada al usuario.
 * - `email`: email único de acceso e identificación.
 * - `password`: contraseña persistida en formato hasheado.
 * - `role`: rol de autorización del usuario.
 * - `tokenConfirm`: token de confirmación de cuenta.
 * - `emailTokenConfirm`: token temporal para confirmación de cambio de email.
 * - `accountConfirm`: indica si la cuenta ya fue verificada.
 * - `accountCreation`: fecha funcional de creación de cuenta.
 *
 * Notas de comportamiento:
 * - La contraseña no se guarda en texto plano; se hashea en un hook `pre("save")`.
 * - El modelo expone un método de instancia `comparePassword` para comparar
 *   una contraseña candidata con la almacenada.
 *
 * Restricciones:
 * - `email` es único.
 * - `role` solo admite `user` y `admin`.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  university: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    index: true,
  },
  tokenConfirm: {
    type: String,
    default: null,
  },
  emailTokenConfirm: {
    type: String,
    default: null,
  },
  accountConfirm: {
    type: Boolean,
    default: false,
  },
  accountCreation: {
    type: String,
    default: () => moment().format("D of MMMM, YYYY"),
  },
});

/**
 * Hashea la contraseña antes de guardar el usuario cuando es nueva
 * o ha sido modificada.
 *
 * @param {Function} next Siguiente middleware de mongoose.
 * @returns {Promise<void>}
 */
userSchema.pre("save", async function hashPasswordOnSave(next) {
  try {
    if (!this.isNew && !this.isModified("password")) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    console.error(error);
    next(new Error("Failed hashing password"));
  }
});

/**
 * Compara una contraseña candidata con la contraseña almacenada.
 *
 * @function UserDocument#comparePassword
 * @param {string} candidatePassword Contraseña recibida en texto plano.
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error(error);
    return false;
  }
};


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class User
 * @classdesc Modelo Mongoose de usuarios de la aplicación.
 */
export const User = model("User", userSchema);