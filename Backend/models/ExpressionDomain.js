import { Schema, model } from "mongoose";
import { orderedNumericArrayValidator } from "./validators/orderedNumericArrayValidator.js";

/**
 * Modelo de dominio de expresión reutilizable.
 *
 * Define los dominios de valoración que pueden usarse en los issues,
 * tanto globales como privados de un usuario. Un dominio puede ser
 * numérico o lingüístico.
 *
 * Tipos soportados:
 * - `numeric`: definido por un rango mínimo y máximo.
 * - `linguistic`: definido por un conjunto de etiquetas con valores
 *   numéricos ordenados.
 *
 * Campos principales:
 * - `user`: propietario del dominio cuando es privado.
 * - `name`: nombre funcional del dominio.
 * - `isGlobal`: indica si el dominio es global para todo el sistema.
 * - `locked`: indica si el dominio no debe editarse libremente.
 * - `type`: tipo del dominio (`numeric` o `linguistic`).
 * - `numericRange`: rango permitido para dominios numéricos.
 * - `linguisticLabels`: etiquetas y valores asociados para dominios lingüísticos.
 *
 * Restricciones:
 * - Los dominios privados tienen unicidad por combinación `user + name`.
 * - Los dominios globales tienen unicidad por combinación `isGlobal + name`.
 *
 * Notas de dominio:
 * - Este modelo representa la definición reutilizable del dominio.
 * - Cuando un issue se crea, su configuración efectiva puede congelarse
 *   en snapshots específicos mediante `IssueExpressionDomain`.
 */
const expressionDomainSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  isGlobal: {
    type: Boolean,
    default: false,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ["numeric", "linguistic"],
    required: true,
  },

  numericRange: {
    min: { type: Number },
    max: { type: Number },
  },

  linguisticLabels: [
    {
      label: {
        type: String,
        required: true,
        trim: true,
      },
      values: {
        type: [Number],
        validate: orderedNumericArrayValidator,
      },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Garantiza unicidad de nombres para dominios privados por usuario.
 */
expressionDomainSchema.index(
  { user: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);

/**
 * Garantiza unicidad de nombres para dominios globales.
 */
expressionDomainSchema.index(
  { isGlobal: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isGlobal: true },
  }
);

export const ExpressionDomain = model("ExpressionDomain", expressionDomainSchema);