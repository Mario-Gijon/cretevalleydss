import { IssueModel } from "../models/IssueModels.js";

const EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

const ISSUE_MODELS = [
  {
    name: "TOPSIS",
    isConsensus: false,
    isMultiCriteria: true,
    smallDescription:
      "Based on the idea that the selected alternative should have the shortest distance from the positive-ideal solution and the longest distance from the negative-ideal solution.",
    extendDescription:
      "TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) is a multi-criteria decision-making method that ranks alternatives according to their distance to an ideal positive solution and an ideal negative solution.",
    moreInfoUrl: "https://ejemplo.com/topsis",
    evaluationStructure: EVALUATION_STRUCTURES.DIRECT,
    parameters: [
      {
        name: "weights",
        type: "array",
        restrictions: {
          min: 0,
          max: 1,
          length: "matchCriteria",
          sum: 1,
          step: null,
          allowed: null,
        },
      },
    ],
    supportedDomains: {
      numeric: {
        enabled: true,
        range: {
          min: 0,
          max: 1,
        },
      },
      linguistic: {
        enabled: false,
        minLabels: null,
        maxLabels: null,
        oddOnly: false,
      },
    },
  },
  {
    name: "Herrera Viedma CRP",
    isConsensus: true,
    isMultiCriteria: false,
    smallDescription:
      "Consensus model based on pairwise preference relations between alternatives.",
    extendDescription:
      "Herrera-Viedma CRP is a consensus-reaching process for group decision making based on pairwise preference relations, designed to measure consensus and guide iterative decision rounds until a target consensus level is achieved.",
    moreInfoUrl: "https://ejemplo.com/herrera-viedma-crp",
    evaluationStructure: EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    parameters: [
      {
        name: "ag_lq",
        type: "array",
        default: [0.3, 0.8],
        restrictions: {
          min: 0,
          max: 1,
          length: 2,
          step: null,
          sum: null,
          allowed: null,
        },
      },
      {
        name: "ex_lq",
        type: "array",
        default: [0.5, 1],
        restrictions: {
          min: 0,
          max: 1,
          length: 2,
          step: null,
          sum: null,
          allowed: null,
        },
      },
      {
        name: "b",
        type: "number",
        default: 1,
        restrictions: {
          min: null,
          max: null,
          step: null,
          length: null,
          sum: null,
          allowed: [0.5, 0.7, 0.9, 1],
        },
      },
      {
        name: "beta",
        type: "number",
        default: 0.8,
        restrictions: {
          min: 0,
          max: 1,
          step: null,
          length: null,
          sum: null,
          allowed: null,
        },
      },
    ],
    supportedDomains: {
      numeric: {
        enabled: true,
        range: {
          min: null,
          max: null,
        },
      },
      linguistic: {
        enabled: false,
        minLabels: null,
        maxLabels: null,
        oddOnly: false,
      },
    },
  },
  {
    name: "BORDA",
    isConsensus: false,
    isMultiCriteria: true,
    smallDescription:
      "Preference voting system where ranked options receive points based on their position.",
    extendDescription:
      "The Borda count is a ranking-based aggregation method where each alternative receives points according to its position in the collective ordering, allowing comparison of alternatives through their accumulated scores.",
    moreInfoUrl: "https://ejemplo.com/borda",
    evaluationStructure: EVALUATION_STRUCTURES.DIRECT,
    parameters: [],
    supportedDomains: {
      numeric: {
        enabled: true,
        range: {
          min: 0,
          max: 1,
        },
      },
      linguistic: {
        enabled: false,
        minLabels: null,
        maxLabels: null,
        oddOnly: false,
      },
    },
  },
  {
    name: "ARAS",
    isConsensus: false,
    isMultiCriteria: true,
    smallDescription:
      "Additive Ratio Assessment method for ranking alternatives in multi-criteria decision problems.",
    extendDescription:
      "ARAS (Additive Ratio Assessment) is a multi-criteria decision-making method that evaluates alternatives through utility ratios relative to an optimal alternative, enabling ranking based on aggregate performance.",
    moreInfoUrl: "https://ejemplo.com/aras",
    evaluationStructure: EVALUATION_STRUCTURES.DIRECT,
    parameters: [
      {
        name: "weights",
        type: "array",
        restrictions: {
          min: 0,
          max: 1,
          length: "matchCriteria",
          sum: 1,
          step: null,
          allowed: null,
        },
      },
    ],
    supportedDomains: {
      numeric: {
        enabled: true,
        range: {
          min: 0,
          max: 1,
        },
      },
      linguistic: {
        enabled: false,
        minLabels: null,
        maxLabels: null,
        oddOnly: false,
      },
    },
  },
  {
    name: "Fuzzy TOPSIS",
    isConsensus: false,
    isMultiCriteria: true,
    smallDescription:
      "Extension of TOPSIS using fuzzy numbers to better capture uncertainty in evaluations.",
    extendDescription:
      "Fuzzy TOPSIS extends the classical TOPSIS method by representing evaluations with fuzzy values, which allows modeling vagueness and uncertainty in expert judgments more naturally.",
    moreInfoUrl: "https://ejemplo.com/fuzzy-topsis",
    evaluationStructure: EVALUATION_STRUCTURES.DIRECT,
    parameters: [
      {
        name: "weights",
        type: "fuzzyArray",
        restrictions: {
          min: 0,
          max: 1,
          length: "matchCriteria",
          step: null,
          sum: null,
          allowed: null,
        },
      },
    ],
    supportedDomains: {
      numeric: {
        enabled: false,
        range: {
          min: null,
          max: null,
        },
      },
      linguistic: {
        enabled: true,
        minLabels: 3,
        maxLabels: 9,
        oddOnly: true,
      },
    },
  },
];

/**
 * Inserta o actualiza los modelos base de IssueModel.
 * Es idempotente: no duplica modelos si ya existen.
 */
export const seedIssueModels = async () => {
  try {
    const operations = ISSUE_MODELS.map((model) => ({
      updateOne: {
        filter: { name: model.name },
        update: { $set: model },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await IssueModel.bulkWrite(operations);
    }

    console.log(`[seedIssueModels] ${ISSUE_MODELS.length} models seeded`);
  } catch (error) {
    console.error("[seedIssueModels] Error seeding issue models:", error);
    throw error;
  }
};