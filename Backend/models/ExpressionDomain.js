import { Schema, model } from "mongoose";

const expressionDomainSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null si es global
  name: { type: String, required: true },
  isGlobal: { type: Boolean, default: false }, // true → accesible a todos
  type: { type: String, enum: ["numeric", "linguistic"], required: true },

  // Para dominios numéricos
  numericRange: {
    min: { type: Number },
    max: { type: Number }
  },

  // Para dominios lingüísticos
  linguisticLabels: [
    {
      label: { type: String, required: true },
      values: {
        type: [Number], // [l, m, u]
        validate: {
          validator: (arr) => arr.length === 3,
          message: "Cada etiqueta lingüística debe tener exactamente 3 valores [l, m, u]."
        }
      }
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

// 🔒 Índice único: asegura unicidad por usuario o global
expressionDomainSchema.index(
  { createdBy: 1, name: 1 },
  { unique: true, partialFilterExpression: { createdBy: { $type: "objectId" } } }
);

expressionDomainSchema.index(
  { isGlobal: 1, name: 1 },
  { unique: true, partialFilterExpression: { isGlobal: true } }
);



// Dominios iniciales globales
const expressionDomains = [
  {
    name: "Numeric 0-1",
    type: "numeric",
    isGlobal: true,
    numericRange: { min: 0, max: 1 }
  },
];

export const seedExpressionDomains = async () => {
  try {
    // Limpiar antiguos globales para no duplicar
    await ExpressionDomain.deleteMany({ isGlobal: true });
    console.log("Dominios globales antiguos eliminados");

    await ExpressionDomain.insertMany(expressionDomains);
    console.log("Dominios globales insertados correctamente");
  } catch (error) {
    console.error("Error al insertar los dominios:", error);
  }
};

export const ExpressionDomain = model("ExpressionDomain", expressionDomainSchema);

// Ejecutar manualmente
/* seedExpressionDomains(); */


