
import bcrypt from "bcryptjs";
import moment from "moment";
import { model, Schema } from "mongoose";





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

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error(error);
    return false;
  }
};


export const User = model("User", userSchema);