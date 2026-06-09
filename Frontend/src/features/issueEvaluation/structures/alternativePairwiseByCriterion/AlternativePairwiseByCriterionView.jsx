import { Stack, Typography } from "@mui/material";

import PairwiseAlternativeMatrix from "./PairwiseAlternativeMatrix";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveCriterionName = (criterionEntry) => {
  if (typeof criterionEntry === "string") {
    return criterionEntry;
  }

  if (criterionEntry && typeof criterionEntry === "object") {
    return String(criterionEntry.name || "").trim();
  }

  return "";
};

const resolveAlternativeName = (alternativeEntry) => {
  if (typeof alternativeEntry === "string") {
    return alternativeEntry;
  }

  if (alternativeEntry && typeof alternativeEntry === "object") {
    return String(alternativeEntry.name || "").trim();
  }

  return "";
};

const buildPairKey = (leftAlternative, rightAlternative) =>
  `${leftAlternative}::${rightAlternative}`;

const normalizePairwiseCell = (cell) => {
  if (cell === null || cell === undefined) {
    return {
      value: "",
      domain: null,
    };
  }

  if (typeof cell === "object" && !Array.isArray(cell)) {
    return {
      value: cell?.value ?? "",
      domain: cell?.domain ?? cell?.expressionDomain ?? null,
      ...(cell?.isNeutralFallback ? { isNeutralFallback: true } : {}),
    };
  }

  return {
    value: cell,
    domain: null,
  };
};

const buildRowsFromPairMap = ({ criterionPairs, alternativeNames }) => {
  if (!isPlainObject(criterionPairs)) {
    return [];
  }

  return alternativeNames.map((rowAlternative) => {
    const row = { id: rowAlternative };

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          domain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      row[colAlternative] = normalizePairwiseCell(
        criterionPairs?.[buildPairKey(rowAlternative, colAlternative)]
      );
    }

    return row;
  });
};

const buildRowsFromMatrix = ({ criterionMatrix, alternativeNames }) => {
  if (!Array.isArray(criterionMatrix)) {
    return [];
  }

  return alternativeNames.map((rowAlternative, rowIndex) => {
    const row = { id: rowAlternative };
    const sourceRow = Array.isArray(criterionMatrix[rowIndex])
      ? criterionMatrix[rowIndex]
      : [];

    for (const [colIndex, colAlternative] of alternativeNames.entries()) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          domain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      row[colAlternative] = normalizePairwiseCell(sourceRow[colIndex]);
    }

    return row;
  });
};

const buildRowsFromRows = ({ criterionRows, alternativeNames }) => {
  if (!Array.isArray(criterionRows)) {
    return [];
  }

  const rowMap = new Map(
    criterionRows
      .filter((row) => isPlainObject(row) && typeof row.id === "string")
      .map((row) => [row.id, row])
  );

  return alternativeNames.map((rowAlternative) => {
    const row = { id: rowAlternative };
    const sourceRow = rowMap.get(rowAlternative) || {};

    for (const colAlternative of alternativeNames) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          domain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      row[colAlternative] = normalizePairwiseCell(sourceRow[colAlternative]);
    }

    return row;
  });
};

const normalizeCriterionRows = ({
  criterionSource,
  alternativeNames,
}) => {
  if (Array.isArray(criterionSource)) {
    return criterionSource.length > 0 &&
      isPlainObject(criterionSource[0]) &&
      "id" in criterionSource[0]
      ? buildRowsFromRows({
          criterionRows: criterionSource,
          alternativeNames,
        })
      : buildRowsFromMatrix({
          criterionMatrix: criterionSource,
          alternativeNames,
        });
  }

  if (isPlainObject(criterionSource)) {
    return buildRowsFromPairMap({
      criterionPairs: criterionSource,
      alternativeNames,
    });
  }

  return [];
};

const AlternativePairwiseByCriterionView = ({ evaluationContext }) => {
  const {
    alternatives = [],
    criteria = [],
    payload,
    setPayload,
    collectivePayload = {},
    permitEdit = false,
    selectedCriterion,
  } = evaluationContext || {};
  const alternativeNames = Array.isArray(alternatives)
    ? alternatives.map(resolveAlternativeName).filter(Boolean)
    : [];

  const criteriaFromContext = Array.isArray(criteria)
    ? criteria.map(resolveCriterionName).filter(Boolean)
    : [];

  const evaluationsByCriterion =
    isPlainObject(payload?.comparisonsByCriterion)
      ? Object.fromEntries(
          Object.entries(payload.comparisonsByCriterion).map(
            ([criterionName, criterionPairs]) => [
              criterionName,
              buildRowsFromPairMap({
                criterionPairs,
                alternativeNames,
              }),
            ]
          )
        )
      : isPlainObject(payload)
        ? payload
        : {};
  const collectiveCriterionSource = isPlainObject(
    collectivePayload?.comparisonsByCriterion
  )
    ? collectivePayload.comparisonsByCriterion
    : collectivePayload;
  const collectiveEvaluationsByCriterion = isPlainObject(collectivePayload)
    ? Object.fromEntries(
        Object.entries(collectiveCriterionSource).map(
          ([criterionName, criterionSource]) => [
            criterionName,
            normalizeCriterionRows({
              criterionSource,
              alternativeNames,
            }),
          ]
        )
      )
    : {};

  const resolvedCriteria = criteriaFromContext;

  const visibleCriteria =
    selectedCriterion && resolvedCriteria.includes(selectedCriterion)
      ? [selectedCriterion]
      : resolvedCriteria;

  if (criteriaFromContext.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  if (alternativeNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No alternatives available.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.2}>
      {visibleCriteria.map((criterionName) => (
        <Stack key={criterionName} spacing={0.75}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {criterionName}
          </Typography>

          <PairwiseAlternativeMatrix
            alternatives={alternatives}
            evaluations={evaluationsByCriterion?.[criterionName] || []}
            setEvaluations={(nextRows) => {
              if (!permitEdit) {
                return;
              }

              setPayload?.((previous) => ({
                ...(isPlainObject(previous) ? previous : {}),
                [criterionName]: nextRows,
              }));
            }}
            collectiveEvaluations={collectiveEvaluationsByCriterion?.[criterionName] || []}
            permitEdit={permitEdit}
          />
        </Stack>
      ))}
    </Stack>
  );
};

export default AlternativePairwiseByCriterionView;
