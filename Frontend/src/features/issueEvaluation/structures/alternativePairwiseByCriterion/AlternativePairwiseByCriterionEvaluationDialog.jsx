import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import CriterionCompactSelector from "./CriterionCompactSelector";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";
import AlternativeEvaluationSaveDialog from "../../components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../components/AlternativeEvaluationSubmitDialog";
import AlternativeEvaluationDialogShell from "../../components/AlternativeEvaluationDialogShell";
import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { buildEvaluationViewContext } from "../../context/buildEvaluationViewContext";
import {
  sectionSx,
} from "../../styles/alternativeEvaluationDialog.styles";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../services/issueEvaluation.service";
import {
  EVALUATION_STAGES,
} from "../../evaluation.constants";
import { getEvaluationStructureEntryForStage } from "../../evaluationStructureRegistry";

const buildPairKey = (altA, altB) => `${altA}::${altB}`;

const buildEmptyCell = () => ({ value: "", domain: null });
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildMatrixFromCanonical = ({ alternatives, criterionNames, comparisonsByCriterion }) => {
  const result = {};

  for (const criterionName of criterionNames) {
    const criterionComparisons = comparisonsByCriterion?.[criterionName] || {};

    result[criterionName] = alternatives.map((rowAlternative) => {
      const row = { id: rowAlternative };

      for (const colAlternative of alternatives) {
        if (rowAlternative === colAlternative) {
          row[colAlternative] = { value: "", domain: null };
          continue;
        }

        const pairKey = buildPairKey(rowAlternative, colAlternative);
        const cell = criterionComparisons?.[pairKey];

        row[colAlternative] = {
          value: cell?.value ?? "",
          domain: cell?.expressionDomain ?? null,
        };
      }

      return row;
    });
  }

  return result;
};

const buildCanonicalFromMatrix = ({ alternatives, criterionNames, evaluations }) => {
  const comparisonsByCriterion = {};

  for (const criterionName of criterionNames) {
    const rows = evaluations?.[criterionName] || [];
    const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));
    const criterionPayload = {};

    for (const rowAlternative of alternatives) {
      for (const colAlternative of alternatives) {
        if (rowAlternative === colAlternative) continue;

        const cell = rowMap?.[rowAlternative]?.[colAlternative] || buildEmptyCell();
        criterionPayload[buildPairKey(rowAlternative, colAlternative)] = {
          value: cell?.value ?? "",
          expressionDomain: cell?.domain ?? null,
        };
      }
    }

    comparisonsByCriterion[criterionName] = criterionPayload;
  }

  return { comparisonsByCriterion };
};

const buildClearedMatrices = ({ alternatives, criterionNames, evaluations }) => {
  const cleared = {};

  for (const criterionName of criterionNames) {
    const rows = evaluations?.[criterionName] || [];
    const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));

    cleared[criterionName] = alternatives.map((rowAlternative) => {
      const row = { id: rowAlternative };

      for (const colAlternative of alternatives) {
        if (rowAlternative === colAlternative) {
          row[colAlternative] = { value: "", domain: null };
          continue;
        }

        const previousCell = rowMap?.[rowAlternative]?.[colAlternative] || buildEmptyCell();
        row[colAlternative] = {
          value: "",
          domain: previousCell?.domain ?? null,
        };
      }

      return row;
    });
  }

  return cleared;
};

const validatePairwisePayload = ({ alternatives, criterionNames, evaluations, allowEmpty }) => {
  for (const criterionName of criterionNames) {
    const rows = evaluations?.[criterionName] || [];
    const rowMap = Object.fromEntries(rows.map((row) => [row.id, row]));

    for (const rowAlternative of alternatives) {
      for (const colAlternative of alternatives) {
        if (rowAlternative === colAlternative) continue;

        const cell = rowMap?.[rowAlternative]?.[colAlternative] || buildEmptyCell();
        const rawValue = cell?.value;

        if (rawValue === "" || rawValue === null || rawValue === undefined) {
          if (!allowEmpty) {
            return `Criterion: ${criterionName}, comparison ${rowAlternative} vs ${colAlternative} is required.`;
          }
          continue;
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          return `Criterion: ${criterionName}, comparison ${rowAlternative} vs ${colAlternative} must be numeric.`;
        }
      }
    }
  }

  return null;
};

const buildCollectiveRowsFromMatrix = ({ matrix, alternatives }) => {
  if (!Array.isArray(matrix)) {
    return null;
  }

  const rows = [];

  for (let rowIndex = 0; rowIndex < alternatives.length; rowIndex += 1) {
    const rowAlternative = alternatives[rowIndex];
    const sourceRow = matrix[rowIndex];
    if (!Array.isArray(sourceRow)) {
      continue;
    }

    const row = { id: rowAlternative };

    for (let colIndex = 0; colIndex < alternatives.length; colIndex += 1) {
      const colAlternative = alternatives[colIndex];

      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      row[colAlternative] = {
        value: sourceRow[colIndex] ?? "",
        expressionDomain: null,
      };
    }

    rows.push(row);
  }

  return rows.length > 0 ? rows : null;
};

const buildCollectiveRowsFromPairMap = ({ criterionPairs, alternatives }) => {
  if (!isPlainObject(criterionPairs)) {
    return null;
  }

  const rows = [];

  for (const rowAlternative of alternatives) {
    const row = { id: rowAlternative };

    for (const colAlternative of alternatives) {
      if (rowAlternative === colAlternative) {
        row[colAlternative] = {
          value: "Neutral",
          expressionDomain: null,
          isNeutralFallback: true,
        };
        continue;
      }

      const pairKey = buildPairKey(rowAlternative, colAlternative);
      const cell = criterionPairs[pairKey];
      const value =
        cell !== null && typeof cell === "object" && !Array.isArray(cell)
          ? cell.value
          : cell;

      row[colAlternative] = {
        value:
          value === null || value === undefined || value === ""
            ? ""
            : value,
        expressionDomain: null,
      };
    }

    rows.push(row);
  }

  return rows.length > 0 ? rows : null;
};

const resolveCollectiveEvaluationsByCriterion = ({
  collectiveReference,
  criterionNames,
  alternatives,
}) => {
  if (!isPlainObject(collectiveReference)) {
    return null;
  }

  const source = isPlainObject(collectiveReference.collectiveEvaluations)
    ? collectiveReference.collectiveEvaluations
    : null;

  if (!source) {
    return null;
  }

  const output = {};

  for (const criterionName of criterionNames) {
    const criterionCollective = source[criterionName];

    if (
      Array.isArray(criterionCollective) &&
      criterionCollective.length > 0 &&
      isPlainObject(criterionCollective[0]) &&
      "id" in criterionCollective[0]
    ) {
      output[criterionName] = criterionCollective;
      continue;
    }

    if (Array.isArray(criterionCollective)) {
      const mappedRows = buildCollectiveRowsFromMatrix({
        matrix: criterionCollective,
        alternatives,
      });
      if (mappedRows) {
        output[criterionName] = mappedRows;
      }
      continue;
    }

    if (isPlainObject(criterionCollective)) {
      const mappedRows = buildCollectiveRowsFromPairMap({
        criterionPairs: criterionCollective,
        alternatives,
      });
      if (mappedRows) {
        output[criterionName] = mappedRows;
      }
    }
  }

  return Object.keys(output).length > 0 ? output : null;
};

const AlternativePairwiseByCriterionEvaluationDialog = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collectiveVisible, setCollectiveVisible] = useState(false);
  const [collectiveEvaluationsByCriterion, setCollectiveEvaluationsByCriterion] = useState(null);

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);
  const alternatives = useMemo(() => issue?.alternatives || [], [issue?.alternatives]);
  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey: "alternativePairwiseByCriterion",
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      }),
    []
  );

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [issue?.id, criterionNames.length]);

  const currentCriterion = leafCriteria[currentCriterionIndex] || leafCriteria[0] || null;
  const criterionId = currentCriterion?.name;
  const handleSelectedCriterionChange = useCallback(
    (criterionName) => {
      const nextIndex = leafCriteria.findIndex(
        (criterion) => criterion?.name === criterionName
      );

      if (nextIndex >= 0) {
        setCurrentCriterionIndex(nextIndex);
      }
    },
    [leafCriteria]
  );
  const evaluationViewContext = useMemo(
    () =>
      buildEvaluationViewContext({
        issue,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        structure: structureEntry,
        alternatives,
        criteriaTree: issue?.criteria || [],
        leafCriteria,
        payloadValue: evaluations,
        setPayload: setEvaluations,
        collectiveValue: collectiveEvaluationsByCriterion || {},
        collectiveVisible,
        setCollectiveVisible,
        loading,
        readOnly: false,
        selectedCriterion: criterionId || null,
        setSelectedCriterion: handleSelectedCriterionChange,
      }),
    [
      issue,
      alternatives,
      structureEntry,
      leafCriteria,
      evaluations,
      collectiveEvaluationsByCriterion,
      collectiveVisible,
      loading,
      criterionId,
      handleSelectedCriterionChange,
    ]
  );

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    const fetchCurrentEvaluations = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, EVALUATION_STAGES.ALTERNATIVE_EVALUATION);
        const comparisonsByCriterion = response?.data?.payload?.comparisonsByCriterion || {};
        const merged = buildMatrixFromCanonical({ alternatives, criterionNames, comparisonsByCriterion });
        const collectiveReference = response?.data?.collectiveReference || null;
        const resolvedCollectiveByCriterion = resolveCollectiveEvaluationsByCriterion({
          collectiveReference,
          criterionNames,
          alternatives,
        });
        setEvaluations(merged);
        setCollectiveEvaluationsByCriterion(resolvedCollectiveByCriterion);
        setCollectiveVisible(
          Boolean(
            resolvedCollectiveByCriterion &&
              Object.keys(resolvedCollectiveByCriterion).length > 0
          )
        );
        setInitialEvaluations(JSON.stringify(merged));
      } catch {
        const merged = buildMatrixFromCanonical({ alternatives, criterionNames, comparisonsByCriterion: {} });
        setEvaluations(merged);
        setCollectiveEvaluationsByCriterion(null);
        setCollectiveVisible(false);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();
  }, [isOpen, issue?.id, alternatives, criterionNames]);

  const handleClearAll = () => {
    setEvaluations(buildClearedMatrices({ alternatives, criterionNames, evaluations }));
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      setOpenCloseDialog(false);
      setIsOpen(false);
      return;
    }
    setOpenCloseDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsOpen(false);
  };

  const handleSave = async () => {
    const validationError = validatePairwisePayload({
      alternatives,
      criterionNames,
      evaluations,
      allowEmpty: true,
    });

    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);

    const payload = buildCanonicalFromMatrix({ alternatives, criterionNames, evaluations });
    const response = await saveIssueEvaluation(
      issue.id,
      EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      payload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation draft saved successfully", "success");
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error saving evaluation draft", "error");
  };

  const handleOpenSubmit = () => {
    const validationError = validatePairwisePayload({
      alternatives,
      criterionNames,
      evaluations,
      allowEmpty: false,
    });

    if (validationError) {
      showSnackbarAlert(validationError, "error");
      return;
    }

    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    setOpenSubmitDialog(false);
    setLoading(true);

    const payload = buildCanonicalFromMatrix({ alternatives, criterionNames, evaluations });
    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      payload
    );

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation submitted successfully", "success");
      await fetchActiveIssues();
      setOpenIssueDialog(false);
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error submitting evaluation", "error");
  };

  return (
    <>
      <AlternativeEvaluationDialogShell
        open={isOpen}
        onClose={handleConfirmChanges}
        loading={loading}
        maxWidth="lg"
        icon={GridOnOutlinedIcon}
        title="Alternative evaluation"
        subtitle={issue?.name || ""}
        criteria={leafCriteria}
        showExpressionDomains
        showCollectiveControl={
          isPlainObject(collectiveEvaluationsByCriterion) &&
          Object.keys(collectiveEvaluationsByCriterion).length > 0
        }
        collectiveVisible={collectiveVisible}
        onToggleCollective={() => setCollectiveVisible((value) => !value)}
        contentSx={{ p: { xs: 1.5, sm: 2 } }}
        actions={
          <>
            <Button variant="outlined" color="error" onClick={handleClearAll} startIcon={<DeleteSweepOutlinedIcon />}>
              Clear all
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" color="success" onClick={handleOpenSubmit} startIcon={<PublishOutlinedIcon />}>
              Submit
            </Button>
          </>
        }
      >
        <Stack spacing={1.25} sx={{ maxWidth: 1200, mx: "auto" }}>
          <Box sx={{ ...sectionSx(theme), p: { xs: 1, sm: 1.5 } }}>
            <CriterionCompactSelector
              criteria={leafCriteria}
              currentIndex={currentCriterionIndex}
              onSelectCriterion={(index) => setCurrentCriterionIndex(index)}
              onPreviousCriterion={() =>
                setCurrentCriterionIndex((prev) => Math.max(0, prev - 1))
              }
              onNextCriterion={() =>
                setCurrentCriterionIndex((prev) =>
                  Math.min(leafCriteria.length - 1, prev + 1)
                )
              }
            />

            <AlternativePairwiseByCriterionView
              evaluationViewContext={evaluationViewContext}
            />
          </Box>
        </Stack>
      </AlternativeEvaluationDialogShell>

      <AlternativeEvaluationSaveDialog
        open={openCloseDialog}
        onClose={() => setOpenCloseDialog(false)}
        onSave={handleSave}
        onExit={handleCloseDialog}
      />

      <AlternativeEvaluationSubmitDialog
        open={openSubmitDialog}
        onClose={() => setOpenSubmitDialog(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default AlternativePairwiseByCriterionEvaluationDialog;
