import { ExpressionDomain } from "../models/ExpressionDomain.js";

const EXPRESSION_DOMAINS = [
  {
    name: "Numeric 0-1",
    isGlobal: true,
    locked: true,
    type: "numeric",
    numericRange: {
      min: 0,
      max: 1,
      step: null,
    },
    linguisticLabels: [],
  },
  {
    name: "Numeric 0-9",
    isGlobal: true,
    locked: true,
    type: "numeric",
    numericRange: {
      min: 0,
      max: 9,
      step: 1,
    },
    linguisticLabels: [],
  },
];

/**
 * Inserta o actualiza los dominios de expresión base.
 * Es idempotente: no duplica dominios si ya existen.
 */
export const seedExpressionDomains = async () => {
  try {
    const operations = EXPRESSION_DOMAINS.map((domain) => ({
      updateOne: {
        filter: {
          name: domain.name,
          isGlobal: true,
        },
        update: {
          $set: domain,
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await ExpressionDomain.bulkWrite(operations);
    }

    console.log(
      `[seedExpressionDomains] ${EXPRESSION_DOMAINS.length} expression domains seeded`
    );
  } catch (error) {
    console.error(
      "[seedExpressionDomains] Error seeding expression domains:",
      error
    );
    throw error;
  }
};