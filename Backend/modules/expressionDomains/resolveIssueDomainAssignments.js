import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { toIdString } from "../../utils/common/ids.js";
import { createBadRequestError } from "../../utils/common/errors.js";
import { isSupportedDomainForModel } from "./domainCompatibility.js";

export const resolveExpressionDomainConfigByLeafCriteriaOrThrow = ({
  expressionDomainConfig,
  leafCriteria,
}) => {
  const mode = expressionDomainConfig.mode;
  const leafCriterionNames = leafCriteria.map((criterion) => criterion.name);

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
  const providedCriterionNames = Object.keys(rawDomainsByCriterion);
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
    domainDocs.map((domain) => toIdString(domain._id))
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
