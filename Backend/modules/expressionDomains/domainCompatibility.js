import { toIdString } from "../../utils/common/ids.js";

const normalizeMembershipFunctions = (value) =>
  value
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

export const resolveSupportedDomainFlags = (
  modelSupportedDomains
) => {
  return {
    numericContinuous: modelSupportedDomains.numeric.continuous,
    numericDiscrete: modelSupportedDomains.numeric.discrete,
    linguisticMembershipFunctions: normalizeMembershipFunctions(
      modelSupportedDomains.linguistic
    ),
  };
};

export const isNumericDiscreteDomain = (domain) =>
  domain?.typeKey === "numericDiscrete";

const isNumericContinuousDomain = (domain) =>
  domain?.typeKey === "numericContinuous";

const isLinguisticDomain = (domain) => domain?.family === "linguistic";

const getMembershipFunctionOrNull = (domain) => {
  const membershipFunction = domain?.definition?.membershipFunction;

  if (typeof membershipFunction !== "string") {
    return null;
  }

  const normalizedMembershipFunction = membershipFunction.trim().toLowerCase();
  return normalizedMembershipFunction || null;
};

export const isSupportedDomainForModel = ({
  domain,
  modelSupportedDomains,
  userId,
}) => {
  const supported = resolveSupportedDomainFlags(modelSupportedDomains);

  if (isNumericDiscreteDomain(domain)) {
    return supported.numericDiscrete;
  }

  if (isNumericContinuousDomain(domain)) {
    return supported.numericContinuous;
  }

  if (isLinguisticDomain(domain)) {
    const normalizedDomainUserId = toIdString(domain.user);
    const isCreatorOwnedDomain =
      domain.isGlobal !== true &&
      normalizedDomainUserId &&
      normalizedDomainUserId === toIdString(userId);
    const membershipFunction = getMembershipFunctionOrNull(domain);
    const supportsMembershipFunction =
      typeof membershipFunction === "string" &&
      supported.linguisticMembershipFunctions.includes(membershipFunction);

    return supportsMembershipFunction && isCreatorOwnedDomain;
  }

  return false;
};

export const isDomainSnapshotSupportedByModel = ({
  domainSnapshot,
  supportedDomainFlags,
}) => {
  if (isNumericDiscreteDomain(domainSnapshot)) {
    return supportedDomainFlags.numericDiscrete;
  }

  if (isNumericContinuousDomain(domainSnapshot)) {
    return supportedDomainFlags.numericContinuous;
  }

  if (isLinguisticDomain(domainSnapshot)) {
    const membershipFunction = getMembershipFunctionOrNull(domainSnapshot);
    return (
      typeof membershipFunction === "string" &&
      supportedDomainFlags.linguisticMembershipFunctions.includes(
        membershipFunction
      )
    );
  }

  return false;
};
