import { toIdString } from "../../utils/common/ids.js";

const normalizeMembershipFunctions = (value) =>
  value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

export const resolveSupportedDomainFlags = (
  modelSupportedDomains,
  { strict = false } = {}
) => {
  if (strict) {
    return {
      numericContinuous: modelSupportedDomains.numeric.continuous,
      numericDiscrete: modelSupportedDomains.numeric.discrete,
      linguisticMembershipFunctions: normalizeMembershipFunctions(
        modelSupportedDomains.linguistic
      ),
    };
  }

  return {
    numericContinuous: modelSupportedDomains?.numeric?.continuous === true,
    numericDiscrete: modelSupportedDomains?.numeric?.discrete === true,
    linguisticMembershipFunctions: Array.isArray(modelSupportedDomains?.linguistic)
      ? normalizeMembershipFunctions(modelSupportedDomains.linguistic)
      : [],
  };
};

export const isNumericDiscreteDomain = (domain) => {
  const step = domain?.numericRange?.step;
  return Number.isFinite(step) && step > 0;
};

export const isSupportedDomainForModel = ({
  domain,
  modelSupportedDomains,
  userId,
}) => {
  const supported = resolveSupportedDomainFlags(modelSupportedDomains, {
    strict: true,
  });

  if (domain?.type === "numeric") {
    return isNumericDiscreteDomain(domain)
      ? supported.numericDiscrete
      : supported.numericContinuous;
  }

  if (domain?.type === "linguistic") {
    const normalizedDomainUserId = toIdString(domain?.user);
    const isCreatorOwnedDomain =
      domain?.isGlobal !== true &&
      normalizedDomainUserId &&
      normalizedDomainUserId === toIdString(userId);
    const membershipFunction = String(domain?.membershipFunction || "")
      .trim()
      .toLowerCase();
    const supportsMembershipFunction =
      membershipFunction.length > 0 &&
      supported.linguisticMembershipFunctions.includes(membershipFunction);

    return supportsMembershipFunction && isCreatorOwnedDomain;
  }

  return false;
};

export const isDomainSnapshotSupportedByModel = ({
  domainSnapshot,
  supportedDomainFlags,
}) => {
  if (domainSnapshot?.type === "numeric") {
    return isNumericDiscreteDomain(domainSnapshot)
      ? supportedDomainFlags.numericDiscrete
      : supportedDomainFlags.numericContinuous;
  }

  if (domainSnapshot?.type === "linguistic") {
    const membershipFunction = String(domainSnapshot?.membershipFunction || "")
      .trim()
      .toLowerCase();
    return (
      membershipFunction.length > 0 &&
      supportedDomainFlags.linguisticMembershipFunctions.includes(
        membershipFunction
      )
    );
  }

  return false;
};
