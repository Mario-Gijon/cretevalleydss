import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../../../../../utils/common/objects.js";

export const validatePayloadShape = ({
  payload,
  alternatives,
  criterionIds,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const alternativeIds = alternatives.map((alternative) => alternative.id);
  const unknownCriterionIds = Object.keys(payload).filter(
    (criterionId) => !criterionIds.includes(criterionId)
  );

  if (unknownCriterionIds.length > 0) {
    throw createBadRequestError("payload contains unknown criterion keys", {
      field: "payload",
    });
  }

  for (const criterionId of criterionIds) {
    if (!hasOwnKey(payload, criterionId)) {
      throw createBadRequestError("payload is missing a criterion matrix.", {
        field: `payload.${criterionId}`,
      });
    }

    const criterionPayload = payload[criterionId];

    if (!isPlainObject(criterionPayload)) {
      throw createBadRequestError("Criterion matrix must be an object.", {
        field: `payload.${criterionId}`,
      });
    }

    const unknownRowIds = Object.keys(criterionPayload).filter(
      (rowAlternativeId) => !alternativeIds.includes(rowAlternativeId)
    );

    if (unknownRowIds.length > 0) {
      throw createBadRequestError(
        "Criterion matrix contains unknown row alternatives.",
        {
          field: `payload.${criterionId}`,
        }
      );
    }

    for (const rowAlternativeId of alternativeIds) {
      if (!hasOwnKey(criterionPayload, rowAlternativeId)) {
        throw createBadRequestError(
          "Criterion matrix is missing a row alternative.",
          {
            field: `payload.${criterionId}.${rowAlternativeId}`,
          }
        );
      }

      const rowPayload = criterionPayload[rowAlternativeId];

      if (!isPlainObject(rowPayload)) {
        throw createBadRequestError("Pairwise row must be an object.", {
          field: `payload.${criterionId}.${rowAlternativeId}`,
        });
      }

      const columnIds = Object.keys(rowPayload);

      if (columnIds.includes(rowAlternativeId)) {
        throw createBadRequestError(
          "Diagonal pairwise values are not allowed.",
          {
            field: `payload.${criterionId}.${rowAlternativeId}`,
          }
        );
      }

      const unknownColumnIds = columnIds.filter(
        (columnAlternativeId) => !alternativeIds.includes(columnAlternativeId)
      );

      if (unknownColumnIds.length > 0) {
        throw createBadRequestError(
          "Pairwise row contains unknown column alternatives.",
          {
            field: `payload.${criterionId}.${rowAlternativeId}`,
          }
        );
      }

      for (const columnAlternativeId of alternativeIds) {
        if (
          columnAlternativeId !== rowAlternativeId &&
          !hasOwnKey(rowPayload, columnAlternativeId)
        ) {
          throw createBadRequestError(
            "Pairwise row is missing a directed comparison.",
            {
              field: `payload.${criterionId}.${rowAlternativeId}.${columnAlternativeId}`,
            }
          );
        }
      }
    }
  }

  return payload;
};
