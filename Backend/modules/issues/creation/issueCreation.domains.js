import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { toIdString } from "../../../utils/common/ids.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";

export const resolveExpressionDomainConfigByLeafCriteriaOrThrow = ({
  expressionDomainConfig,
  leafCriteria,
}) => {
  const mode = String(expressionDomainConfig.mode).trim();
  const leafCriterionNames = leafCriteria.map((criterion) => criterion.name);

  if (leafCriterionNames.length === 0) {
    throw createBadRequestError("At least one leaf criterion is required", {
      field: "expressionDomainConfig",
    });
  }

  if (mode !== "global" && mode !== "byCriterion") {
    throw createBadRequestError("expressionDomainConfig.mode must be 'global' or 'byCriterion'", {
      field: "expressionDomainConfig",
    });
  }

  const domainIdByCriterionName = new Map();
  const usedDomainIds = new Set();

  if (mode === "global") {
    const globalDomainId = toIdString(expressionDomainConfig.globalDomainId);
    if (!globalDomainId) {
      throw createBadRequestError("expressionDomainConfig.globalDomainId is required", {
        field: "expressionDomainConfig",
      });
    }

    for (const criterionName of leafCriterionNames) {
      domainIdByCriterionName.set(criterionName, globalDomainId);
    }
    usedDomainIds.add(globalDomainId);

    return {
      usedDomainIds: Array.from(usedDomainIds),
      domainIdByCriterionName,
    };
  }

  const rawDomainsByCriterion = expressionDomainConfig.domainsByCriterion;
  if (!isPlainObject(rawDomainsByCriterion)) {
    throw createBadRequestError("expressionDomainConfig.domainsByCriterion is required", {
      field: "expressionDomainConfig",
    });
  }

  const providedCriterionNames = Object.keys(rawDomainsByCriterion)
    .map((name) => String(name || "").trim())
    .filter(Boolean);
  const expectedCriterionNameSet = new Set(leafCriterionNames);

  const missingCriterionNames = leafCriterionNames.filter(
    (criterionName) => !providedCriterionNames.includes(criterionName)
  );
  if (missingCriterionNames.length > 0) {
    throw createBadRequestError("Missing expression domains for some leaf criteria", {
      field: "expressionDomainConfig",
      details: {
        missingCriteria: missingCriterionNames,
      },
    });
  }

  const unknownCriterionNames = providedCriterionNames.filter(
    (criterionName) => !expectedCriterionNameSet.has(criterionName)
  );
  if (unknownCriterionNames.length > 0) {
    throw createBadRequestError("expressionDomainConfig contains unknown criteria", {
      field: "expressionDomainConfig",
      details: {
        unknownCriteria: unknownCriterionNames,
      },
    });
  }

  for (const criterionName of leafCriterionNames) {
    const rawDomainId = rawDomainsByCriterion[criterionName];
    const domainId = toIdString(rawDomainId);

    if (!domainId) {
      throw createBadRequestError(
        `Missing domain id for criterion '${criterionName}'`,
        {
          field: "expressionDomainConfig",
        }
      );
    }

    domainIdByCriterionName.set(criterionName, domainId);
    usedDomainIds.add(domainId);
  }

  return {
    usedDomainIds: Array.from(usedDomainIds),
    domainIdByCriterionName,
  };
};

const resolveSupportedDomainFlags = (modelSupportedDomains) => ({
  numericContinuous: modelSupportedDomains?.numeric?.continuous === true,
  numericDiscrete: modelSupportedDomains?.numeric?.discrete === true,
  linguisticMembershipFunctions: Array.isArray(modelSupportedDomains?.linguistic)
    ? modelSupportedDomains.linguistic
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
    : [],
});

const isNumericContinuousDomain = (domain) => {
  const step = domain.numericRange?.step;
  return domain.type === "numeric" && (step === null || step === undefined);
};

const isNumericDiscreteDomain = (domain) => {
  const step = domain.numericRange?.step;
  return (
    domain.type === "numeric" &&
    Number.isFinite(step) &&
    step > 0
  );
};

const isSupportedDomainForModel = ({
  domain,
  modelSupportedDomains,
  userId,
}) => {
  const supported = resolveSupportedDomainFlags(modelSupportedDomains);

  if (isNumericContinuousDomain(domain)) {
    return supported.numericContinuous;
  }

  if (isNumericDiscreteDomain(domain)) {
    return supported.numericDiscrete;
  }

  if (domain.type === "linguistic") {
    const normalizedDomainUserId = toIdString(domain.user);
    const isCreatorOwnedDomain =
      domain.isGlobal !== true &&
      normalizedDomainUserId &&
      normalizedDomainUserId === toIdString(userId);
    const membershipFunction = String(domain.membershipFunction || "")
      .trim()
      .toLowerCase();
    const supportsMembershipFunction =
      membershipFunction.length > 0 &&
      supported.linguisticMembershipFunctions.includes(membershipFunction);

    return supportsMembershipFunction && isCreatorOwnedDomain;
  }

  return false;
};

export const loadAccessibleExpressionDomains = async ({
  domainIdList,
  userId,
  modelSupportedDomains,
  session,
}) => {
  const domainDocs = await ExpressionDomain.find({
    _id: { $in: domainIdList },
    $or: [
      { isGlobal: true, user: null },
      { isGlobal: false, user: userId },
    ],
  })
    .select(
      "_id name type numericRange linguisticLabels membershipFunction valueCount valuesMode isGlobal user"
    )
    .session(session);

  const existingDomainIds = new Set(
    domainDocs.map((domain) => toIdString(domain._id)).filter(Boolean)
  );

  const missingDomains = domainIdList.filter(
    (domainId) => !existingDomainIds.has(domainId)
  );

  if (missingDomains.length > 0) {
    throw createBadRequestError(
      `ExpressionDomain not found or not accessible: ${missingDomains.join(", ")}`,
      {
        field: "expressionDomainConfig",
      }
    );
  }

  const unsupportedDomains = domainDocs.filter(
    (domain) =>
      !isSupportedDomainForModel({
        domain,
        modelSupportedDomains,
        userId,
      })
  );

  if (unsupportedDomains.length > 0) {
    throw createBadRequestError(
      "Some assigned expression domains are not compatible with the selected model",
      {
        field: "expressionDomainConfig",
        details: {
          unsupportedDomainIds: unsupportedDomains.map((domain) =>
            toIdString(domain._id)
          ),
        },
      }
    );
  }

  return domainDocs;
};
