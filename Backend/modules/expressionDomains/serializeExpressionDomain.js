import { toIdString } from "../../utils/common/ids.js";

const toIsoOrNull = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const serializeExpressionDomain = (domain) => {
  const ownerId = toIdString(domain?.owner) || null;
  const id = toIdString(domain?._id);

  return {
    _id: id,
    id,
    ownerId,
    name: domain?.name ?? "",
    typeKey: domain?.typeKey ?? "",
    definition: domain?.definition ?? {},
    isGlobal: ownerId === null,
    locked: ownerId === null,
    createdAt: toIsoOrNull(domain?.createdAt),
    updatedAt: toIsoOrNull(domain?.updatedAt),
  };
};
