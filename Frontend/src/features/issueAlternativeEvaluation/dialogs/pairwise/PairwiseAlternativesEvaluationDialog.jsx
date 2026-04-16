import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Button,
  Tabs,
  Tab,
  Typography,
  Box,
  Tooltip,
  Chip,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import PairwiseAlternativeMatrix from "../../components/pairwise/PairwiseAlternativeMatrix.jsx";
import AlternativeEvaluationSaveDialog from "../../components/shared/AlternativeEvaluationSaveDialog.jsx";
import AlternativeEvaluationSubmitDialog from "../../components/shared/AlternativeEvaluationSubmitDialog.jsx";
import AlternativeEvaluationDialogShell from "../../components/shared/AlternativeEvaluationDialogShell.jsx";
import { extractLeafCriteria } from "../../utils/leafCriteria.utils.js";
import { validatePairwiseEvaluations } from "../../utils/pairwiseEvaluation.validation.js";
import {
  sectionSx,
  pillTabsSx,
  metaChipSx,
  softIconBtnSx,
} from "../../styles/alternativeEvaluationDialog.styles.js";
import {
  getAlternativeEvaluationDraft,
  saveAlternativeEvaluationDraft,
  submitAlternativeEvaluations,
} from "../../services/alternativeEvaluation.service.js";

/**
 * Diálogo de evaluación por pares entre alternativas.
 *
 * Este diálogo inicializa y mantiene la matriz pairwise por criterio hoja
 * usando celdas con shape { value, domain } también para:
 * - celdas vacías,
 * - diagonal,
 * - reinicio completo.
 *
 * @param {Object} props
 * @param {Function} props.setOpenIssueDialog
 * @param {boolean} props.isRatingAlternatives
 * @param {Function} props.setIsRatingAlternatives
 * @param {Object} props.selectedIssue
 * @returns {JSX.Element}
 */
const PairwiseAlternativesEvaluationDialog = ({
  setOpenIssueDialog,
  isRatingAlternatives,
  setIsRatingAlternatives,
  selectedIssue,
}) => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues, fetchFinishedIssues } = useIssuesDataContext();

  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSubmitEvaluationsDialog, setOpenSubmitEvaluationsDialog] =
    useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);

  const leafCriteria = useMemo(
    () => extractLeafCriteria(selectedIssue?.criteria || []),
    [selectedIssue]
  );

  const hasMultipleCriteria = leafCriteria.length > 1;

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [selectedIssue?.id, leafCriteria.length]);

  const currentCriterion =
    leafCriteria[currentCriterionIndex] || leafCriteria[0] || null;

  const criterionId = currentCriterion?.name;

  const getFirstDomainFromMatrix = (matrixRows = []) => {
    for (const row of matrixRows) {
      for (const [key, cell] of Object.entries(row || {})) {
        if (key !== "id" && cell?.domain) {
          return cell.domain;
        }
      }
    }

    return null;
  };

  const buildEmptyPairwiseCell = (domain) => ({
    value: "",
    domain: domain || null,
  });

  const buildDiagonalPairwiseCell = (domain) => {
    if (!domain) {
      return {
        value: "",
        domain: null,
        isNeutralFallback: true,
      };
    }

    if (domain.type === "numeric") {
      const min = Number(domain.range?.min ?? 0);
      const max = Number(domain.range?.max ?? 1);
      const midpoint = Math.round(((min + max) / 2) * 100) / 100;

      return {
        value: midpoint,
        domain,
        isNeutralFallback: false,
      };
    }

    if (domain.type === "linguistic") {
      const labels = domain.labels || [];
      const middleLabel = labels[Math.floor(labels.length / 2)]?.label || "";

      return {
        value: middleLabel,
        domain,
        isNeutralFallback: false,
      };
    }

    return {
      value: "",
      domain,
      isNeutralFallback: true,
    };
  };

  const mergeEvaluations = (fetchedEvaluations = {}) => {
    const merged = {};
    const alternatives = selectedIssue?.alternatives || [];

    leafCriteria.forEach((criterion) => {
      const criterionName = criterion.name;
      const existingMatrix = fetchedEvaluations?.[criterionName] || [];
      const criterionDomain = getFirstDomainFromMatrix(existingMatrix);

      merged[criterionName] = alternatives.map((alternativeRow) => ({
        id: alternativeRow,
        ...Object.fromEntries(
          alternatives.map((alternativeColumn) => {
            if (alternativeRow === alternativeColumn) {
              const existingRow = existingMatrix.find(
                (row) => row.id === alternativeRow
              );
              const existingCell = existingRow?.[alternativeColumn];

              return [
                alternativeColumn,
                existingCell || buildDiagonalPairwiseCell(criterionDomain),
              ];
            }

            const existingRow = existingMatrix.find(
              (row) => row.id === alternativeRow
            );
            const existingCell = existingRow?.[alternativeColumn];

            return [
              alternativeColumn,
              existingCell || buildEmptyPairwiseCell(criterionDomain),
            ];
          })
        ),
      }));
    });

    return merged;
  };

  useEffect(() => {
    if (!isRatingAlternatives || !selectedIssue?.id) {
      return;
    }

    const fetchCurrentEvaluations = async () => {
      setLoading(true);

      try {
        const response = await getAlternativeEvaluationDraft(selectedIssue.id);

        const evaluationsPayload = response?.data?.evaluations ?? null;
        const collectivePayload = response?.data?.collectiveEvaluations ?? null;

        if (response.success && evaluationsPayload) {
          setCollectiveEvaluations(collectivePayload);

          const merged = mergeEvaluations(evaluationsPayload);
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        } else {
          const merged = mergeEvaluations({});
          setEvaluations(merged);
          setInitialEvaluations(JSON.stringify(merged));
        }
      } catch (error) {
        console.error("Error fetching evaluations:", error);
        const merged = mergeEvaluations({});
        setEvaluations(merged);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRatingAlternatives, selectedIssue]);

  const handleChangeCriterion = (index) => {
    setCurrentCriterionIndex(index);
  };

  const updateMatrix = (updatedRows) => {
    if (!criterionId) {
      return;
    }

    setEvaluations((prev) => ({
      ...prev,
      [criterionId]: updatedRows,
    }));
  };

  const handleClearAllEvaluations = () => {
    const clearedMatrices = {};
    const alternatives = selectedIssue?.alternatives || [];

    leafCriteria.forEach((criterion) => {
      const criterionName = criterion.name;
      const existingMatrix = evaluations?.[criterionName] || [];
      const criterionDomain = getFirstDomainFromMatrix(existingMatrix);

      clearedMatrices[criterionName] = alternatives.map((alternativeRow) => {
        const previousRow =
          existingMatrix.find((row) => row.id === alternativeRow) || {
            id: alternativeRow,
          };

        const row = { id: alternativeRow };

        alternatives.forEach((alternativeColumn) => {
          const previousCell = previousRow?.[alternativeColumn];
          const cellDomain = previousCell?.domain || criterionDomain || null;

          if (alternativeRow === alternativeColumn) {
            row[alternativeColumn] =
              previousCell && previousCell.domain
                ? buildDiagonalPairwiseCell(previousCell.domain)
                : buildDiagonalPairwiseCell(cellDomain);
          } else {
            row[alternativeColumn] = buildEmptyPairwiseCell(cellDomain);
          }
        });

        return row;
      });
    });

    setEvaluations(clearedMatrices);
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      return;
    }

    setOpenCloseDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setIsRatingAlternatives(false);
  };

  const handleSaveEvaluations = async () => {
    const leafNames = extractLeafCriteria(selectedIssue.criteria || []).map(
      (criterion) => criterion.name
    );

    const validation = validatePairwiseEvaluations(evaluations, {
      leafCriteria: leafNames,
      allowEmpty: true,
    });

    if (!validation.valid) {
      const { criterion, row, col, message } = validation.error;

      showSnackbarAlert(
        `Criterion: ${criterion}, Row: ${row}, Col: ${col}, ${message}`,
        "error"
      );

      const index = leafCriteria.findIndex((item) => item.name === criterion);
      if (index !== -1) {
        setCurrentCriterionIndex(index);
      }

      return;
    }

    setLoading(true);
    setOpenCloseDialog(false);

    const evaluationSaved = await saveAlternativeEvaluationDraft(
      selectedIssue.id,
      evaluations
    );

    if (evaluationSaved.success) {
      setOpenCloseDialog(false);
      setIsRatingAlternatives(false);
      showSnackbarAlert("Evaluations saved successfully", "success");
    } else {
      evaluationSaved?.message &&
        showSnackbarAlert(evaluationSaved.message, "error");
    }

    setLoading(false);
  };

  const handleOpenSubmitEvaluationsDialog = async () => {
    const leafNames = extractLeafCriteria(selectedIssue.criteria || []).map(
      (criterion) => criterion.name
    );

    const validation = validatePairwiseEvaluations(evaluations, {
      leafCriteria: leafNames,
      allowEmpty: false,
    });

    if (!validation.valid) {
      const { criterion, row, col, message } = validation.error;

      showSnackbarAlert(
        `Criterion: ${criterion}, Row: ${row}, Col: ${col}, ${message}`,
        "error"
      );

      const index = leafCriteria.findIndex((item) => item.name === criterion);
      if (index !== -1) {
        setCurrentCriterionIndex(index);
      }

      return;
    }

    setOpenSubmitEvaluationsDialog(true);
  };

  const handleSubmitEvaluations = async () => {
    setOpenSubmitEvaluationsDialog(false);
    setLoading(true);

    const response = await submitAlternativeEvaluations(
      selectedIssue,
      evaluations
    );

    if (response.success) {
      showSnackbarAlert(response?.message || "Evaluations submitted successfully", "success");
      await fetchActiveIssues();
      await fetchFinishedIssues();
      setOpenIssueDialog(false);
      setIsRatingAlternatives(false);
    } else {
      showSnackbarAlert(response?.message || "Error submitting evaluations", "error");

      const criterionFromError =
        response?.data?.criterion ||
        response?.error?.details?.criterion ||
        response?.criterion;
      const index = leafCriteria.findIndex(
        (criterion) => criterion.name === criterionFromError
      );

      if (index !== -1) {
        setCurrentCriterionIndex(index);
      }
    }

    setLoading(false);
  };

  const criterionMeta = useMemo(() => {
    if (!currentCriterion) {
      return null;
    }

    const typeLabel = currentCriterion.type
      ? String(currentCriterion.type)
      : "";

    const pathLabel = Array.isArray(currentCriterion.path)
      ? currentCriterion.path.join(" > ")
      : "";

    return {
      name: currentCriterion.name,
      typeLabel,
      pathLabel,
    };
  }, [currentCriterion]);

  return (
    <>
      <AlternativeEvaluationDialogShell
        open={isRatingAlternatives}
        onClose={handleConfirmChanges}
        loading={loading}
        maxWidth="lg"
        icon={GridOnOutlinedIcon}
        title="Alternative evaluation"
        subtitle={selectedIssue?.name || ""}
        contentSx={{ p: { xs: 1.5, sm: 2 } }}
        actions={
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearAllEvaluations}
              startIcon={<DeleteSweepOutlinedIcon />}
            >
              Clear all
            </Button>

            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              color="success"
              onClick={handleOpenSubmitEvaluationsDialog}
              startIcon={<PublishOutlinedIcon />}
            >
              Submit
            </Button>
          </>
        }
      >
        <Stack spacing={1.25} sx={{ maxWidth: 1200, mx: "auto" }}>
          {hasMultipleCriteria && (
            <Box sx={{ ...sectionSx(theme), overflow: "hidden" }}>
              <Tabs
                value={currentCriterionIndex}
                onChange={(event, newIndex) => handleChangeCriterion(newIndex)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={pillTabsSx(theme)}
              >
                {leafCriteria.map((criterion) => (
                  <Tab key={criterion.name} label={criterion.name} />
                ))}
              </Tabs>
            </Box>
          )}

          {hasMultipleCriteria && criterionMeta && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              sx={{ px: 0.25 }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Chip
                  size="small"
                  variant="outlined"
                  color="info"
                  label={`Criterion: ${criterionMeta.name}`}
                  sx={metaChipSx(theme)}
                />

                {criterionMeta.typeLabel && (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={
                      criterionMeta.typeLabel === "benefit"
                        ? "success"
                        : "error"
                    }
                    label={`Type: ${criterionMeta.typeLabel}`}
                    sx={metaChipSx(theme)}
                  />
                )}
              </Stack>

              {criterionMeta.pathLabel && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 850,
                    maxWidth: { xs: "100%", sm: 520 },
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={criterionMeta.pathLabel}
                >
                  {criterionMeta.pathLabel}
                </Typography>
              )}
            </Stack>
          )}

          {!hasMultipleCriteria && criterionMeta && (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 850, px: 0.25 }}
            >
              {criterionMeta.name}
              {criterionMeta.typeLabel ? ` · ${criterionMeta.typeLabel}` : ""}
            </Typography>
          )}

          <Box sx={{ ...sectionSx(theme), p: { xs: 1, sm: 1.25 } }}>
            {criterionId && !loading && (
              <PairwiseAlternativeMatrix
                alternatives={selectedIssue.alternatives}
                evaluations={evaluations[criterionId] || []}
                setEvaluations={updateMatrix}
                collectiveEvaluations={collectiveEvaluations?.[criterionId] || []}
              />
            )}
          </Box>

          {hasMultipleCriteria && (
            <Stack direction="row" spacing={1} justifyContent="center">
              <Tooltip title="Previous criterion" arrow>
                <span>
                  <IconButton
                    disabled={currentCriterionIndex === 0}
                    onClick={() =>
                      handleChangeCriterion(currentCriterionIndex - 1)
                    }
                    sx={softIconBtnSx(theme)}
                  >
                    <ArrowBackIosIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Next criterion" arrow>
                <span>
                  <IconButton
                    disabled={currentCriterionIndex === leafCriteria.length - 1}
                    onClick={() =>
                      handleChangeCriterion(currentCriterionIndex + 1)
                    }
                    sx={softIconBtnSx(theme)}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </AlternativeEvaluationDialogShell>

      <AlternativeEvaluationSaveDialog
        open={openCloseDialog}
        onClose={() => setOpenCloseDialog(false)}
        onSave={handleSaveEvaluations}
        onExit={handleCloseDialog}
      />

      <AlternativeEvaluationSubmitDialog
        open={openSubmitEvaluationsDialog}
        onClose={() => setOpenSubmitEvaluationsDialog(false)}
        onSubmit={handleSubmitEvaluations}
      />
    </>
  );
};

export default PairwiseAlternativesEvaluationDialog;
