import { model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import moment from "moment";

const userSchema = new Schema({
  name: { type: String, required: true },
  university: { type: String, required: true },
  email: { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user", index: true },
  tokenConfirm: { type: String, default: null },
  emailTokenConfirm: { type: String, default: null },
  accountConfirm: { type: Boolean, default: false },
  accountCreation: {
    type: String,
    default: () => moment().format("D of MMMM, YYYY"),
  },
});

/**
 * Hashea la contraseña antes de guardar el usuario si es nueva o ha cambiado.
 *
 * @param {Function} next Siguiente middleware de mongoose.
 * @returns {Promise<void>}
 */
userSchema.pre("save", async function (next) {
  try {
    if (!this.isNew && !this.isModified("password")) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (err) {
    console.error(err);
    next(new Error("Failed hashing password"));
  }
});

/**
 * Compara una contraseña en texto plano con la contraseña almacenada.
 *
 * @param {string} candidatePassword Contraseña recibida.
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const User = model("User", userSchema);