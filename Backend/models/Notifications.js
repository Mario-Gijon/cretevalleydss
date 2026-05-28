/**
 * @module models/Notification
 */

import { Schema, model } from "mongoose";


/**
 * Documento persistido de notificación para un experto.
 *
 * @typedef {Object} NotificationDocument
 * @property {*} _id Identificador del documento.
 * @property {*} expert Usuario destinatario.
 * @property {*} issue Issue relacionado o null.
 * @property {string} type Tipo funcional de notificación.
 * @property {string} message Mensaje visible.
 * @property {boolean} requiresAction Indica si requiere acción.
 * @property {boolean|null} actionTaken Indica si la acción ya fue realizada.
 * @property {boolean} read Indica si fue leída.
 * @property {Date} createdAt Fecha de creación.
 */


/**
 * Notificación dirigida a un usuario experto.
 *
 * Se utiliza para informar de eventos relevantes dentro de un issue,
 * incluyendo invitaciones, acciones pendientes o cambios de estado.
 *
 * Relaciones:
 * - `expert` -> usuario destinatario de la notificación.
 * - `issue` -> issue relacionado, cuando exista.
 *
 * Campos principales:
 * - `type`: tipo funcional de la notificación.
 * - `message`: mensaje visible para el usuario.
 * - `requiresAction`: indica si la notificación requiere una acción del usuario.
 * - `actionTaken`: indica si la acción requerida ya fue realizada.
 * - `read`: indica si la notificación ha sido leída.
 * - `createdAt`: fecha de creación de la notificación.
 *
 * Notas de dominio:
 * - `issue` puede ser `null` para notificaciones no ligadas directamente
 *   a un issue concreto.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const notificationSchema = new Schema({
  expert: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    default: null,
  },
  type: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  requiresAction: {
    type: Boolean,
    required: true,
  },
  actionTaken: {
    type: Boolean,
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class Notification
 * @classdesc Modelo Mongoose de notificaciones dirigidas a expertos.
 */
export const Notification = model("Notification", notificationSchema);