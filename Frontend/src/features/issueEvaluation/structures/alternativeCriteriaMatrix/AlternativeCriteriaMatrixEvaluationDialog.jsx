import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import DirectEvaluationMatrix from "../alternativeCriteriaMatrix/DirectEvaluationMatrix";
import AlternativeEvaluationSaveDialog from "../../shared/components/AlternativeEvaluationSaveDialog";
import AlternativeEvaluationSubmitDialog from "../../shared/components/AlternativeEvaluationSubmitDialog";
import AlternativeEvaluationDialogShell from "../../shared/components/AlternativeEvaluationDialogShell";
import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { validateDirectEvaluations } from "./directEvaluation.validation";
import { sectionSx } from "../../shared/alternativeEvaluationDialog.styles";
import {
  fetchIssueEvaluation,
  saveIssueEvaluation,
  submitIssueEvaluationPayload,
} from "../../services/issueEvaluation.service";
import { EVALUATION_STAGES } from "../../evaluation.constants";

const buildKey = (alternativeName, criterionName) => `${alternativeName}::${criterionName}`;

const buildEmptyCell = () => ({ value: "", domain: null });
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeCellForPayload = (cell) => {
  if (cell !== null && typeof cell === "object" && !Array.isArray(cell)) {
    return {
      value: cell?.value ?? "",
      expressionDomain: cell?.domain ?? null,
    };
  }

  return {
    value: cell ?? "",
    expressionDomain: null,
  };
};

const fromCanonicalCellsToMatrix = ({ alternatives, criterionNames, cells }) => {
  const matrix = {};

  for (const alternativeName of alternatives) {
    matrix[alternativeName] = {};
    for (const criterionName of criterionNames) {
      const key = buildKey(alternativeName, criterionName);
      const cell = cells?.[key];
      matrix[alternativeName][criterionName] = {
        value: cell?.value ?? "",
        domain: cell?.expressionDomain ?? null,
      };
    }
  }

  return matrix;
};

const toCanonicalCellsPayload = ({ alternatives, criterionNames, evaluations }) => {
  const cells = {};

  for (const alternativeName of alternatives) {
    for (const criterionName of criterionNames) {
      const cell = evaluations?.[alternativeName]?.[criterionName] || buildEmptyCell();
      cells[buildKey(alternativeName, criterionName)] =
        normalizeCellForPayload(cell);
    }
  }

  return { cells };
};

const buildClearedMatrix = ({ alternatives, criterionNames, evaluations }) => {
  const cleared = {};

  for (const alternativeName of alternatives) {
    cleared[alternativeName] = {};
    for (const criterionName of criterionNames) {
      const prev = evaluations?.[alternativeName]?.[criterionName] || buildEmptyCell();
      cleared[alternativeName][criterionName] = {
        value: "",
        domain: prev?.domain ?? null,
      };
    }
  }

  return cleared;
};

const resolveCollectiveEvaluations = ({
  collectiveReference,
}) => {
  if (!isPlainObject(collectiveReference)) {
    return null;
  }
  const collectiveEvaluations = collectiveReference.collectiveEvaluations;
  return isPlainObject(collectiveEvaluations) ? collectiveEvaluations : null;
};

const AlternativeCriteriaMatrixEvaluationDialog = ({
  issue,
  isOpen,
  setIsOpen,
  setOpenIssueDialog,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { fetchActiveIssues } = useIssuesDataContext();

  const [evaluations, setEvaluations] = useState({});
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [initialEvaluations, setInitialEvaluations] = useState(null);
  const [pendingSubmitEvaluations, setPendingSubmitEvaluations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collectiveVisible, setCollectiveVisible] = useState(false);
  const [collectiveEvaluations, setCollectiveEvaluations] = useState(null);
  const matrixRef = useRef(null);
  const evaluationsRef = useRef(evaluations);

  useEffect(() => {
    evaluationsRef.current = evaluations;
  }, [evaluations]);

  const leafCriteria = useMemo(() => getLeafCriteria(issue?.criteria || []), [issue?.criteria]);
  const criterionNames = useMemo(() => leafCriteria.map((criterion) => criterion.name), [leafCriteria]);
  const alternatives = useMemo(() => issue?.alternatives || [], [issue?.alternatives]);

  const flushPendingGridEdit = async () => {
    if (matrixRef.current?.flushPendingEdits) {
      await matrixRef.current.flushPendingEdits();
    }
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const getAuthoritativeEvaluations = async () => {
    await flushPendingGridEdit();
    return evaluationsRef.current;
  };

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    const fetchCurrentEvaluations = async () => {
      setLoading(true);
      try {
        const response = await fetchIssueEvaluation(issue.id, EVALUATION_STAGES.ALTERNATIVE_EVALUATION);
        const cells = response?.data?.payload?.cells || {};
        const merged = fromCanonicalCellsToMatrix({ alternatives, criterionNames, cells });
        const reference = response?.data?.collectiveReference || null;
        const resolvedCollectiveEvaluations = resolveCollectiveEvaluations({
          collectiveReference: reference,
        });
        setEvaluations(merged);
        setCollectiveEvaluations(resolvedCollectiveEvaluations);
        setCollectiveVisible(
          Boolean(
            resolvedCollectiveEvaluations &&
              Object.keys(resolvedCollectiveEvaluations).length > 0
          )
        );
        setInitialEvaluations(JSON.stringify(merged));
      } catch {
        const merged = fromCanonicalCellsToMatrix({ alternatives, criterionNames, cells: {} });
        setEvaluations(merged);
        setCollectiveEvaluations(null);
        setCollectiveVisible(false);
        setInitialEvaluations(JSON.stringify(merged));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvaluations();
  }, [isOpen, issue?.id, alternatives, criterionNames]);

  const handleClearAll = () => {
    setEvaluations(buildClearedMatrix({ alternatives, criterionNames, evaluations }));
    showSnackbarAlert("All evaluations cleared", "success");
  };

  const handleCloseDialog = () => {
    setOpenCloseDialog(false);
    setPendingSubmitEvaluations(null);
    setIsOpen(false);
  };

  const handleConfirmChanges = () => {
    if (JSON.stringify(evaluations) === initialEvaluations) {
      handleCloseDialog();
      return;
    }
    setOpenCloseDialog(true);
  };

  const validate = (candidateEvaluations, allowEmpty) => {
    const result = validateDirectEvaluations(candidateEvaluations, {
      leafCriteria: criterionNames,
      allowEmpty,
    });

    if (!result.valid) {
      const { alternative, criterion, message } = result.error;
      showSnackbarAlert(`Alternative: ${alternative}, Criterion: ${criterion}, ${message}`, "error");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    const nextEvaluations = await getAuthoritativeEvaluations();
    if (!validate(nextEvaluations, true)) return;

    setLoading(true);
    setOpenCloseDialog(false);

    const payload = toCanonicalCellsPayload({ alternatives, criterionNames, evaluations: nextEvaluations });
    const response = await saveIssueEvaluation(issue.id, EVALUATION_STAGES.ALTERNATIVE_EVALUATION, payload);

    setLoading(false);

    if (response?.success) {
      showSnackbarAlert(response?.message || "Evaluation draft saved successfully", "success");
      setIsOpen(false);
      return;
    }

    showSnackbarAlert(response?.message || "Error saving evaluation draft", "error");
  };

  const handleOpenSubmit = async () => {
    const nextEvaluations = await getAuthoritativeEvaluations();
    if (!validate(nextEvaluations, false)) return;

    setPendingSubmitEvaluations(nextEvaluations);
    setOpenSubmitDialog(true);
  };

  const handleSubmit = async () => {
    setOpenSubmitDialog(false);
    setLoading(true);

    const nextEvaluations = pendingSubmitEvaluations ?? (await getAuthoritativeEvaluations());
    const payload = toCanonicalCellsPayload({ alternatives, criterionNames, evaluations: nextEvaluations });
    const response = await submitIssueEvaluationPayload(
      issue.id,
      EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      payload
    );

    setLoading(false);
    setPendingSubmitEvaluations(null);

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
        fullScreen={isMobile}
        maxWidth="lg"
        icon={TableChartOutlinedIcon}
        title="Alternative evaluation"
        subtitle={issue?.name || ""}
        criteria={leafCriteria}
        showExpressionDomains
        showCollectiveControl={
          isPlainObject(collectiveEvaluations) &&
          Object.keys(collectiveEvaluations).length > 0
        }
        collectiveVisible={collectiveVisible}
        onToggleCollective={() => setCollectiveVisible((value) => !value)}
        contentSx={{ p: { xs: 1.5, sm: 2.2 } }}
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
        <Box sx={{ ...sectionSx(theme), maxWidth: 1400, mx: "auto", p: { xs: 1, sm: 1.5 } }}>
          {issue && !loading && (
            <DirectEvaluationMatrix
              ref={matrixRef}
              alternatives={alternatives}
              criteria={criterionNames.slice().sort()}
              evaluations={evaluations}
              setEvaluations={setEvaluations}
              collectiveEvaluations={collectiveVisible ? collectiveEvaluations : null}
            />
          )}
        </Box>
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

export default AlternativeCriteriaMatrixEvaluationDialog;
