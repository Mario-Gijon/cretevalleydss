import { isPlainObject } from "../../../../../utils/common/objects";

export const buildNumberCriterionRows = (parameterContext) =>
  (Array.isArray(parameterContext?.leafCriteria)
    ? parameterContext.leafCriteria
    : []
  )
    .map((criterion) => {
      const key = typeof criterion?.id === "string" ? criterion.id.trim() : "";
      return key ? { key, name: criterion?.name || key } : null;
    })
    .filter(Boolean);

export const resolveNumberCriterionRowValue = ({ value, rowKey }) => {
  if (isPlainObject(value)) {
    return Object.prototype.hasOwnProperty.call(value, rowKey) ? value[rowKey] : "";
  }
  return value === null || value === undefined ? "" : value;
};

export const buildNumberCriterionDraft = ({ rows, value }) =>
  rows.reduce((result, row) => {
    result[row.key] = resolveNumberCriterionRowValue({ value, rowKey: row.key });
    return result;
  }, {});
