import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";

const throwNotImplemented = () => {
  throw createBadRequestError(
    "fuzzyCriteriaWeights expert evaluation flow is not implemented",
    {
      code: "EVALUATION_STRUCTURE_NOT_IMPLEMENTED",
      field: "structureKey",
    }
  );
};

export const fuzzyCriteriaWeightsStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.FUZZY_CRITERIA_WEIGHTS,
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  async init() {
    return throwNotImplemented();
  },
  async get() {
    return throwNotImplemented();
  },
  async send() {
    return throwNotImplemented();
  },
  async submit() {
    return throwNotImplemented();
  },
  async compute() {
    return throwNotImplemented();
  },
});

