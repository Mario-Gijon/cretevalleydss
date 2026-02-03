import { Schema, model } from "mongoose";

const expressionDomainSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null si es global
  name: { type: String, required: true, trim: true },

  // true → accesible a todos
  isGlobal: { type: Boolean, default: false },

  // 🔒 true → dominio global base (NO editable / NO borrable)
  locked: { type: Boolean, default: false },

  type: { type: String, enum: ["numeric", "linguistic"], required: true },

  // Para dominios numéricos
  numericRange: {
    min: { type: Number },
    max: { type: Number }
  },

  // Para dominios lingüísticos
  linguisticLabels: [
    {
      label: { type: String, required: true, trim: true },
      values: {
        type: [Number],
        validate: {
          validator: (arr) =>
            Array.isArray(arr) &&
            arr.length >= 2 &&
            arr.every((v) => typeof v === "number" && Number.isFinite(v)) &&
            arr.every((v, i) => i === 0 || arr[i - 1] <= v),
          message: "values must be an ordered numeric array with at least 2 elements",
        },
      }
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

// ✅ Unicidad por usuario (dominios privados)
expressionDomainSchema.index(
  { user: 1, name: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);

// ✅ Unicidad global (dominios globales)
expressionDomainSchema.index(
  { isGlobal: 1, name: 1 },
  { unique: true, partialFilterExpression: { isGlobal: true } }
);


export const ExpressionDomain = model("ExpressionDomain", expressionDomainSchema);

const BASE_DOMAINS = [
  {
    name: "Numeric 0-1",
    type: "numeric",
    isGlobal: true,
    locked: true,
    numericRange: { min: 0, max: 1 },
    linguisticLabels: [],
    user: null,
  },
  {
    name: "Numeric 0-9",
    type: "numeric",
    isGlobal: true,
    locked: true,
    numericRange: { min: 0, max: 9 },
    linguisticLabels: [],
    user: null,
  },
  {
    name: "Linguistic 5 (EN)",
    type: "linguistic",
    isGlobal: true,
    locked: true,
    user: null,
    numericRange: undefined,
    linguisticLabels: [
      { label: "Very Low",  values: [0, 0, 0.25] },
      { label: "Low",       values: [0, 0.25, 0.5] },
      { label: "Medium",    values: [0.25, 0.5, 0.75] },
      { label: "High",      values: [0.5, 0.75, 1] },
      { label: "Very High", values: [0.75, 1, 1] },
    ],
  },
];

export const seedExpressionDomains = async () => {
  try {
    for (const d of BASE_DOMAINS) {
      await ExpressionDomain.updateOne(
        { isGlobal: true, name: d.name }, // clave estable
        { $set: d },
        { upsert: true }
      );
    }

    console.log("✅ Base global ExpressionDomains upserted correctly");
  } catch (error) {
    console.error("❌ Error seeding expression domains:", error);
  }
};

/* seedExpressionDomains(); */

