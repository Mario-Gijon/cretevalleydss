import { Schema, model } from "mongoose";

const notificationSchema = new Schema({
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Usuario que recibe la notificación.
  issue: { type: Schema.Types.ObjectId, ref: "Issue", default: null },  // Problema relacionado (si aplica).
  type: { type: String, required: true }, // Tipo de notificación restringido a estos valores.
  message: { type: String, required: true }, // Mensaje de la notificación.
  requiresAction: { type: Boolean, required: true }, // Si el usuario debe tomar acción.
  actionTaken: { type: Boolean, default: null }, // Si se ha tomado acción (true/false) o null si no aplica.
  read: { type: Boolean, default: false }, // Indica si el usuario ha leído la notificación.
  createdAt: { type: Date, default: Date.now } // Fecha de creación.
});

export const Notification = model("Notification", notificationSchema);
