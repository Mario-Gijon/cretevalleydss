import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import PairwiseAlternativeMatrix from "./PairwiseAlternativeMatrix";
import AlternativeEvaluationSaveDialog from "../../shared/components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../shared/components/AlternativeEvaluationSubmitDialog";
import AlternativeEvaluationDialogShell from "../../shared/components/AlternativeEvaluationDialogShell";
import { getLeafCriteria } from "../../../../utils/criteria.utils";
import {
  pillTabsSx,
  metaChipSx,
  sectionSx,
  softIconBtnSx,
} from "../../shared/alternativeEvaluationDialog.styles";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../services/issueEvaluation.service";
import { EVALUATION_STAGES } from "../../evaluation.constants";

const buildPairKey = (altA, altB) => `${altA}::${altB}`;

const buildEmptyCell = () => ({ value: "", domain: null });

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

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);
  const alternatives = useMemo(() => issue?.alternatives || [], [issue?.alternatives]);

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [issue?.id, criterionNames.length]);

  const currentCriterion = leafCriteria[currentCriterionIndex] || leafCriteria[0] || null;
  const criterionId = currentCriterion?.name;

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    const fetchCurrentEvaluations = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, EVALUATION_STAGES.ALTERNATIVE_EVALUATION);
        const comparisonsByCriterion = response?.data?.payload?.comparisonsByCriterion || {};
        const merged = buildMatrixFromCanonical({ alternatives, criterionNames, comparisonsByCriterion });
        setEvaluations(merged);
        setInitialEvaluations(JSON.stringify(merged));
      } catch {
        const merged = buildMatrixFromCanonical({ alternatives, criterionNames, comparisonsByCriterion: {} });
        setEvaluations(merged);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();
  }, [isOpen, issue?.id, alternatives, criterionNames]);

  const updateMatrix = (updatedRows) => {
    if (!criterionId) return;
    setEvaluations((prev) => ({ ...prev, [criterionId]: updatedRows }));
  };

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

  const criterionMeta = useMemo(() => {
    if (!currentCriterion) return null;
    return {
      name: currentCriterion.name,
      typeLabel: currentCriterion.type ? String(currentCriterion.type) : "",
      pathLabel: Array.isArray(currentCriterion.path) ? currentCriterion.path.join(" > ") : "",
    };
  }, [currentCriterion]);

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
          {leafCriteria.length > 1 && (
            <Box sx={{ ...sectionSx(theme), overflow: "hidden" }}>
              <Tabs value={currentCriterionIndex} onChange={(_, value) => setCurrentCriterionIndex(value)} variant="scrollable" sx={pillTabsSx(theme)}>
                {leafCriteria.map((criterion, index) => (
                  <Tab key={criterion.name} label={criterion.name} value={index} />
                ))}
              </Tabs>
            </Box>
          )}

          <Box sx={{ ...sectionSx(theme), p: { xs: 1, sm: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.25 }}>
              <Chip label={criterionMeta?.name || "—"} color="secondary" size="small" sx={metaChipSx(theme)} />
              {criterionMeta?.typeLabel ? <Chip label={criterionMeta.typeLabel} size="small" sx={metaChipSx(theme)} /> : null}
              {criterionMeta?.pathLabel ? <Tooltip title={criterionMeta.pathLabel}><Chip label="Path" size="small" sx={metaChipSx(theme)} /></Tooltip> : null}

              <Box sx={{ flex: 1 }} />

              <IconButton
                size="small"
                sx={softIconBtnSx(theme)}
                disabled={currentCriterionIndex <= 0}
                onClick={() => setCurrentCriterionIndex((prev) => Math.max(0, prev - 1))}
              >
                <ArrowBackIosIcon fontSize="inherit" />
              </IconButton>

              <Typography variant="caption" sx={{ fontWeight: 900, minWidth: 56, textAlign: "center" }}>
                {leafCriteria.length ? `${currentCriterionIndex + 1}/${leafCriteria.length}` : "0/0"}
              </Typography>

              <IconButton
                size="small"
                sx={softIconBtnSx(theme)}
                disabled={currentCriterionIndex >= leafCriteria.length - 1}
                onClick={() => setCurrentCriterionIndex((prev) => Math.min(leafCriteria.length - 1, prev + 1))}
              >
                <ArrowForwardIosIcon fontSize="inherit" />
              </IconButton>
            </Stack>

            <PairwiseAlternativeMatrix
              alternatives={alternatives}
              evaluations={evaluations[criterionId] || []}
              setEvaluations={updateMatrix}
              collectiveEvaluations={[]}
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
