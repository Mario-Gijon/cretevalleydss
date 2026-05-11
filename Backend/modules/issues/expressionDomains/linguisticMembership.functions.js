import { createBadRequestError } from "../../../utils/common/errors.js";

export const LINGUISTIC_MEMBERSHIP_FUNCTIONS = {
  triangular: {
    key: "triangular",
    label: "Triangular",
    valueCount: 3,
    yProfile: [0, 1, 0],
  },
  trapezoidal: {
    key: "trapezoidal",
    label: "Trapezoidal",
    valueCount: 4,
    yProfile: [0, 1, 1, 0],
  },
  hexagonal: {
    key: "hexagonal",
    label: "Hexagonal",
    valueCount: 6,
    yProfile: [0, 0.5, 1, 1, 0.5, 0],
  },
};

export const getLinguisticMembershipFunction = (membershipFunction) => {
  if (typeof membershipFunction !== "string") {
    return null;
  }

  const key = membershipFunction.trim().toLowerCase();
  return LINGUISTIC_MEMBERSHIP_FUNCTIONS[key] || null;
};

export const getLinguisticMembershipFunctionOrThrow = ({
  membershipFunction,
  field = "membershipFunction",
}) => {
  const membershipDefinition = getLinguisticMembershipFunction(membershipFunction);

  if (membershipDefinition) {
    return membershipDefinition;
  }

  throw createBadRequestError("Invalid linguistic membership function", {
    field,
    details: {
      membershipFunction: membershipFunction ?? null,
      allowed: Object.keys(LINGUISTIC_MEMBERSHIP_FUNCTIONS),
    },
  });
};

