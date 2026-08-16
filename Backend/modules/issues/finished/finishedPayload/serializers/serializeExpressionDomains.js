import {
  cloneSerializable,
  toIsoOrNull,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";

export const serializeExpressionDomains = ({ expressionDomains }) =>
  expressionDomains
    .map((domain) => ({
      id: toRequiredId(domain, "expression domain"),
      sourceDomainId: toNullableId(domain.sourceDomain),
      scope: domain.sourceDomain?.owner ? "owner" : "global",
      name: domain.name,
      typeKey: domain.typeKey,
      definition: cloneSerializable(domain.definition, {}),
      createdAt: toIsoOrNull(domain.createdAt),
      updatedAt: toIsoOrNull(domain.updatedAt),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
